import {randomUUID} from "node:crypto";
import {getAuth} from "firebase-admin/auth";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import type {DocumentData} from "firebase-admin/firestore";

/**
 * Result of one account-deletion request.
 *
 * `FORBIDDEN` means the account is already in the terminal state (the
 * tombstone reads `purged`); it is a fail-closed answer, not a crash.
 */
export type DeleteAccountResult =
  | {ok: true; uid: string; status: "purged"}
  | {ok: false; code: "FORBIDDEN" | "DELETION_UNAVAILABLE"};

/** The five private per-user subcollections purged in step 4. */
const PRIVATE_SUBCOLLECTIONS = [
  "courseProgress",
  "lessonProgress",
  "attempts",
  "quizState",
  "idempotency",
];

/** Grace period recorded on the tombstone, matching the lifecycle suite. */
const PURGE_GRACE_DAYS = 30;

/** Firestore write-batch cap is 500; stay below it. */
const DELETE_BATCH_LIMIT = 400;

/**
 * Deletes the caller's account in the documented purge order
 * (data-model.md section 7):
 *
 * tombstone + profile `status = "deleted"` (one transaction) -> Auth
 * deletion -> recursive delete of the five private subcollections ->
 * profile document -> tombstone `status = "purged"`. The tombstone itself
 * is never deleted.
 *
 * The sequence is resumable: a retry after a partial failure finds the
 * tombstone in `deleted` state and continues instead of failing closed,
 * because the Auth account may still be valid at that point.
 *
 * @param {string} uid - Verified UID from the caller's ID token.
 * @return {Promise<DeleteAccountResult>} Purged account or a safe failure.
 */
export async function deleteAccountForUser(
  uid: string
): Promise<DeleteAccountResult> {
  const db = getFirestore();
  const profileRef = db.collection("users").doc(uid);
  const tombstoneRef = db.collection("accountTombstones").doc(uid);

  // Step 1: only the terminal state fails closed. A tombstone in `deleted`
  // means a previous attempt stopped midway and must be resumed.
  const existing = await tombstoneRef.get();

  if (existing.exists && existing.data()?.status === "purged") {
    return {ok: false, code: "FORBIDDEN"};
  }

  // Step 2: the tombstone and the profile status change are written in the
  // same transaction, before any purge.
  try {
    await db.runTransaction(async (transaction) => {
      const tombstone = await transaction.get(tombstoneRef);
      const profile = await transaction.get(profileRef);

      if (!tombstone.exists) {
        const now = Timestamp.now();
        const record: DocumentData = {
          uid,
          status: "deleted",
          requestedAt: now,
          deletedAt: now,
          authDeletedAt: null,
          purgedAt: null,
          purgeAfter: Timestamp.fromMillis(
            now.toMillis() + PURGE_GRACE_DAYS * 86400000
          ),
          reason: "userRequest",
          requestId: randomUUID(),
        };
        const role = profile.exists ? profile.data()?.role : undefined;

        if (typeof role === "string") {
          record.lastKnownRole = role;
        }

        transaction.set(tombstoneRef, record);
      }

      if (profile.exists && profile.data()?.status !== "deleted") {
        transaction.update(profileRef, {
          status: "deleted",
          deletedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  } catch {
    return {ok: false, code: "DELETION_UNAVAILABLE"};
  }

  // Step 3: Auth deletion. An already-missing user is not a failure.
  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error ?
        (error as {code?: unknown}).code :
        undefined;

    if (code !== "auth/user-not-found") {
      return {ok: false, code: "DELETION_UNAVAILABLE"};
    }
  }

  try {
    await tombstoneRef.update({
      authDeletedAt: FieldValue.serverTimestamp(),
    });

    // Step 4: recursive purge of the private subcollections.
    for (const name of PRIVATE_SUBCOLLECTIONS) {
      const references = await profileRef.collection(name).listDocuments();

      for (
        let index = 0;
        index < references.length;
        index += DELETE_BATCH_LIMIT
      ) {
        const batch = db.batch();

        for (const reference of references.slice(
          index,
          index + DELETE_BATCH_LIMIT
        )) {
          batch.delete(reference);
        }

        await batch.commit();
      }
    }

    // Step 5: the profile document itself.
    await profileRef.delete();

    // Step 6: the tombstone is retained; only its status advances.
    await tombstoneRef.update({
      status: "purged",
      purgedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    return {ok: false, code: "DELETION_UNAVAILABLE"};
  }

  return {ok: true, uid, status: "purged"};
}
