/**
 * N2-07 - content-version and account-deletion lifecycle contract.
 *
 * Verifies the normative sequences in backend/docs/data-model.md:
 *   - Section 7: account tombstone and purge order.
 *   - Section 9: atomic content publish, rollback, and version retention.
 *
 * Runs in its own Firestore namespace (demo-networking-lifecycle) with the real
 * firestore.rules loaded, so the tests prove both the sequence and what clients
 * can observe. Administrative steps use the rules-disabled context, which is
 * the test equivalent of the Functions Admin SDK.
 *
 * Scope note: the MVP API has no user-data mutation endpoints yet, so V-20
 * (tombstone guard) has no runtime surface to test. This suite proves the
 * precondition and the fail-closed client rules; the guard is deferred to the
 * mutation endpoints (N4/N5). See docs/lifecycle-n2.md.
 *
 * Prerequisites: Firestore 127.0.0.1:8080 and Auth 127.0.0.1:9099.
 */

import {test, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";

const here = dirname(fileURLToPath(import.meta.url));
const rulesPath = resolve(here, "..", "firestore.rules");

const PROJECT_ID = "demo-networking-lifecycle";

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: readFileSync(rulesPath, "utf8"),
  },
});

const AUTH_BASE =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

const authUser = {uid: null, email: null, idToken: null, deleted: false};

after(async () => {
  if (authUser.idToken && !authUser.deleted) {
    await authPost("accounts:delete", {idToken: authUser.idToken});
  }
  await env.clearFirestore();
  await env.cleanup();
});

async function authPost(path, body) {
  const response = await fetch(`${AUTH_BASE}/${path}?key=fake-key`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {ok: response.ok, status: response.status, json, text};
}

const PASSWORD = "LifecyclePass123!";

async function createAuthUser() {
  const email = `lifecycle-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
  const result = await authPost("accounts:signUp", {
    email,
    password: PASSWORD,
    returnSecureToken: true,
  });
  assert.ok(result.ok, `signUp failed: ${result.status} ${result.text}`);
  authUser.uid = result.json.localId;
  authUser.email = email;
  authUser.idToken = result.json.idToken;
  return authUser;
}

async function signIn(email) {
  return authPost("accounts:signInWithPassword", {
    email,
    password: PASSWORD,
    returnSecureToken: true,
  });
}

async function withDb(fn) {
  let result;
  await env.withSecurityRulesDisabled(async (context) => {
    result = await fn(context.firestore());
  });
  return result;
}

const TS = Timestamp.fromDate(new Date("2026-11-16T00:00:00Z"));

function profile(uid, status = "active") {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: `Lifecycle ${uid}`,
    preferredLanguage: "en",
    role: "student",
    status,
    createdAt: TS,
    updatedAt: TS,
  };
}

function versionMeta(id, status, order) {
  return {
    contentVersion: id,
    formatVersion: 1,
    status,
    courseCount: 1,
    lessonCount: 1,
    checksum: `checksum-${id}`,
    createdAt: TS,
    createdBy: "lifecycle-admin",
    publishedAt: status === "published" ? TS : null,
    publishedBy: status === "published" ? "lifecycle-admin" : null,
    archivedAt: null,
    rollbackOf: null,
    validation: {ok: true, errors: [], validatedAt: TS},
    notes: `lifecycle fixture ${order}`,
  };
}

async function seedVersion(db, id, status, order) {
  await setDoc(doc(db, `contentVersions/${id}`), versionMeta(id, status, order));
  await setDoc(doc(db, `contentVersions/${id}/courses/course-01`), {
    courseId: "course-01",
    order: 1,
    title: {en: `Course ${id}`, ar: `مقرر ${id}`},
    description: {en: "Lifecycle fixture", ar: "بيانات دورة"},
    estimatedMinutes: 90,
    lessonCount: 1,
    finalQuizId: `quiz-${id}-final`,
    status: "approved",
    contentVersion: id,
    createdAt: TS,
    updatedAt: TS,
  });
  await setDoc(
    doc(db, `contentVersions/${id}/courses/course-01/lessons/lesson-01-01`),
    {
      lessonId: "lesson-01-01",
      courseId: "course-01",
      order: 1,
      title: {en: `Lesson ${id}`, ar: `درس ${id}`},
      summary: {en: "Lifecycle fixture", ar: "بيانات درس"},
      estimatedMinutes: 20,
      sections: [],
      checkpoint: {checkpointId: "cp-01", options: []},
      quizId: "quiz-c01-l01",
      status: "approved",
      contentVersion: id,
      updatedAt: TS,
    }
  );
  await setDoc(doc(db, `contentVersions/${id}/quizzes/quiz-c01-l01`), {
    quizId: "quiz-c01-l01",
    type: "lesson",
    courseId: "course-01",
    lessonId: "lesson-01-01",
    order: 1,
    timeLimitMinutes: 15,
    questionCount: 10,
    passingScore: 7,
    passingPercent: 70,
    status: "approved",
    contentVersion: id,
  });
}

async function seedContent(db) {
  await setDoc(doc(db, "system/publishedContentVersion"), {
    contentVersion: "v001",
    previousContentVersion: null,
    formatVersion: 1,
    checksum: "checksum-v001",
    publishedAt: TS,
    publishedBy: "lifecycle-admin",
    status: "published",
  });

  await seedVersion(db, "v001", "published", 1);
  await seedVersion(db, "v002", "staging", 2);
  await seedVersion(db, "v003", "archived", 3);
  await seedVersion(db, "v004", "rolledBack", 4);
  await seedVersion(db, "v005", "staging", 5);

  await setDoc(doc(db, "users/lifecycle-student"), profile("lifecycle-student"));
  await setDoc(
    doc(db, "users/lifecycle-student/courseProgress/course-01"),
    {courseId: "course-01", order: 1, status: "unlocked"}
  );
  await setDoc(
    doc(db, "users/lifecycle-student/attempts/a-pinned-v004"),
    {
      attemptId: "a-pinned-v004",
      uid: "lifecycle-student",
      quizId: "quiz-c01-l01",
      contentVersion: "v004",
      status: "active",
      startedAt: TS,
      deadlineAt: TS,
    }
  );

  await setDoc(doc(db, "users/lifecycle-live"), profile("lifecycle-live"));
  await setDoc(
    doc(db, "users/lifecycle-live/courseProgress/course-01"),
    {courseId: "course-01", order: 1, status: "completed"}
  );
}

async function readAsAdmin(path) {
  return withDb(async (db) => {
    const snapshot = await getDoc(doc(db, path));
    return snapshot.exists() ? snapshot.data() : null;
  });
}

async function publish(db, nextId, previousId) {
  const now = Timestamp.now();
  await runTransaction(db, async (transaction) => {
    transaction.update(doc(db, `contentVersions/${nextId}`), {
      status: "published",
      publishedAt: now,
      publishedBy: "lifecycle-admin",
    });
    transaction.update(doc(db, "system/publishedContentVersion"), {
      contentVersion: nextId,
      previousContentVersion: previousId,
      publishedAt: now,
      publishedBy: "lifecycle-admin",
      checksum: `checksum-${nextId}`,
    });
    transaction.update(doc(db, `contentVersions/${previousId}`), {
      status: "archived",
      archivedAt: now,
    });
  });
}

async function rollback(db, badId, restoreId) {
  const now = Timestamp.now();
  await runTransaction(db, async (transaction) => {
    transaction.update(doc(db, "system/publishedContentVersion"), {
      contentVersion: restoreId,
      previousContentVersion: null,
      publishedAt: now,
      publishedBy: "lifecycle-admin",
      checksum: `checksum-${restoreId}`,
    });
    transaction.update(doc(db, `contentVersions/${badId}`), {
      status: "rolledBack",
      archivedAt: now,
    });
    transaction.update(doc(db, `contentVersions/${restoreId}`), {
      status: "published",
      publishedAt: now,
      publishedBy: "lifecycle-admin",
      archivedAt: null,
      rollbackOf: badId,
    });
  });
}

async function seedTargetUser(uid) {
  await withDb(async (db) => {
    await setDoc(doc(db, `users/${uid}`), profile(uid));
    await setDoc(doc(db, `users/${uid}/courseProgress/course-01`), {
      courseId: "course-01",
      order: 1,
      status: "unlocked",
    });
    await setDoc(
      doc(db, `users/${uid}/lessonProgress/lesson-01-01`),
      {lessonId: "lesson-01-01", courseId: "course-01", isCompleted: true}
    );
    await setDoc(doc(db, `users/${uid}/attempts/a1`), {
      attemptId: "a1",
      uid,
      status: "finalized",
    });
    await setDoc(doc(db, `users/${uid}/quizState/quiz-c01-l01`), {
      quizId: "quiz-c01-l01",
      totalAttempts: 1,
    });
    await setDoc(doc(db, `users/${uid}/idempotency/k1`), {
      operation: "startQuiz",
    });
  });
}

async function countSubcollection(db, uid, name) {
  const snapshot = await getDocs(
    collection(db, `users/${uid}/${name}`)
  );
  return snapshot.size;
}

/**
 * Reference implementation of the section 9.3 retention policy.
 * Returns the versions that may be purged: everything that is not the active
 * version, not one of the two most recent historical versions, and not pinned
 * by an active attempt. Staging versions never count as predecessors.
 */
function retentionPlan(versions, activeRefs = []) {
  const active = versions.find((entry) => entry.status === "published");
  const historical = versions
    .filter(
      (entry) =>
        entry.status === "archived" || entry.status === "rolledBack"
    )
    .sort((a, b) => b.order - a.order)
    .slice(0, 2);

  const keep = new Set(activeRefs);
  if (active) {
    keep.add(active.contentVersion);
  }
  for (const entry of historical) {
    keep.add(entry.contentVersion);
  }

  return versions
    .map((entry) => entry.contentVersion)
    .filter((id) => !keep.has(id))
    .sort();
}

test("N2-07 lifecycle contract", async (t) => {
  await withDb(seedContent);

  const guestDb = env.unauthenticatedContext().firestore();
  const studentDb = env
    .authenticatedContext("lifecycle-student", {role: "student"})
    .firestore();
  const adminDb = env
    .authenticatedContext("lifecycle-admin", {role: "admin"})
    .firestore();

  // ---- Retention policy (section 9.3) -----------------------------------

  await t.test("retention keeps the active version and two predecessors", () => {
    const versions = [
      {contentVersion: "v005", status: "published", order: 5},
      {contentVersion: "v004", status: "archived", order: 4},
      {contentVersion: "v003", status: "archived", order: 3},
      {contentVersion: "v002", status: "archived", order: 2},
      {contentVersion: "v001", status: "archived", order: 1},
    ];
    assert.deepEqual(retentionPlan(versions), ["v001", "v002"]);
  });

  await t.test("retention never purges a version pinned by an active attempt", () => {
    const versions = [
      {contentVersion: "v005", status: "published", order: 5},
      {contentVersion: "v004", status: "archived", order: 4},
      {contentVersion: "v003", status: "archived", order: 3},
      {contentVersion: "v002", status: "archived", order: 2},
      {contentVersion: "v001", status: "archived", order: 1},
    ];
    assert.deepEqual(retentionPlan(versions, ["v001"]), ["v002"]);
  });

  await t.test("retention purges failed staging imports", () => {
    const versions = [
      {contentVersion: "v006", status: "staging", order: 6},
      {contentVersion: "v005", status: "published", order: 5},
      {contentVersion: "v004", status: "archived", order: 4},
      {contentVersion: "v003", status: "archived", order: 3},
    ];
    assert.deepEqual(retentionPlan(versions), ["v006"]);
  });

  await t.test("retention with no published version keeps only pinned versions", () => {
    const versions = [
      {contentVersion: "v002", status: "staging", order: 2},
      {contentVersion: "v001", status: "staging", order: 1},
    ];
    assert.deepEqual(retentionPlan(versions), ["v001", "v002"]);
  });

  await t.test("retention derives pins from real active attempts", async () => {
    // The seeded account has an active attempt pinned to v004.
    const pinned = await withDb(async (db) => {
      const snapshot = await getDocs(
        query(
          collectionGroup(db, "attempts"),
          where("status", "==", "active")
        )
      );
      return snapshot.docs.map((entry) => entry.data().contentVersion);
    });
    assert.deepEqual(pinned, ["v004"]);

    const versions = [
      {contentVersion: "v007", status: "published", order: 7},
      {contentVersion: "v006", status: "archived", order: 6},
      {contentVersion: "v005", status: "archived", order: 5},
      {contentVersion: "v004", status: "archived", order: 4},
      {contentVersion: "v003", status: "archived", order: 3},
    ];

    // v007 active + v006/v005 as predecessors. v004 is older but pinned, so
    // only v003 may be purged.
    assert.deepEqual(retentionPlan(versions, pinned), ["v003"]);
  });

  // ---- Content visibility before any publish ----------------------------

  await t.test("guest reads the active pointer and v001 content", async () => {
    await assertSucceeds(
      getDoc(doc(guestDb, "system/publishedContentVersion"))
    );
    await assertSucceeds(getDoc(doc(guestDb, "contentVersions/v001")));
    await assertSucceeds(
      getDoc(doc(guestDb, "contentVersions/v001/courses/course-01"))
    );
    await assertSucceeds(
      getDoc(
        doc(
          guestDb,
          "contentVersions/v001/courses/course-01/lessons/lesson-01-01"
        )
      )
    );
    await assertSucceeds(
      getDoc(doc(guestDb, "contentVersions/v001/quizzes/quiz-c01-l01"))
    );
  });

  await t.test("guest cannot read staging v002", async () => {
    await assertFails(getDoc(doc(guestDb, "contentVersions/v002")));
    await assertFails(
      getDoc(doc(guestDb, "contentVersions/v002/courses/course-01"))
    );
    await assertFails(
      getDoc(
        doc(
          guestDb,
          "contentVersions/v002/courses/course-01/lessons/lesson-01-01"
        )
      )
    );
    await assertFails(
      getDoc(doc(guestDb, "contentVersions/v002/quizzes/quiz-c01-l01"))
    );
  });

  await t.test("guest cannot read archived or rolledBack versions", async () => {
    await assertFails(getDoc(doc(guestDb, "contentVersions/v003")));
    await assertFails(getDoc(doc(guestDb, "contentVersions/v004")));
  });

  await t.test("clients cannot write the pointer or content", async () => {
    await assertFails(
      setDoc(doc(guestDb, "system/publishedContentVersion"), {
        contentVersion: "v002",
      })
    );
    await assertFails(
      setDoc(doc(studentDb, "system/publishedContentVersion"), {
        contentVersion: "v002",
      })
    );
    await assertFails(
      updateDoc(doc(studentDb, "contentVersions/v002/courses/course-01"), {
        title: {en: "Hijacked", ar: "مخترق"},
      })
    );
  });

  // ---- Publish, failure atomicity, rollback -----------------------------

  await t.test("publish flips pointer, statuses, and client visibility atomically", async () => {
    await withDb((db) => publish(db, "v002", "v001"));

    const pointer = await readAsAdmin("system/publishedContentVersion");
    assert.equal(pointer.contentVersion, "v002");
    assert.equal(pointer.previousContentVersion, "v001");

    assert.equal(
      (await readAsAdmin("contentVersions/v002")).status,
      "published"
    );
    assert.equal(
      (await readAsAdmin("contentVersions/v001")).status,
      "archived"
    );

    await assertSucceeds(
      getDoc(
        doc(
          guestDb,
          "contentVersions/v002/courses/course-01/lessons/lesson-01-01"
        )
      )
    );
    await assertFails(
      getDoc(
        doc(
          guestDb,
          "contentVersions/v001/courses/course-01/lessons/lesson-01-01"
        )
      )
    );
  });

  await t.test("a failed publish transaction leaves the pointer unchanged", async () => {
    await assert.rejects(
      withDb((db) =>
        runTransaction(db, async (transaction) => {
          transaction.update(doc(db, "system/publishedContentVersion"), {
            contentVersion: "v005",
          });
          throw new Error("injected publish failure");
        })
      ),
      /injected publish failure/
    );

    const pointer = await readAsAdmin("system/publishedContentVersion");
    assert.equal(pointer.contentVersion, "v002");
    assert.equal(
      (await readAsAdmin("contentVersions/v005")).status,
      "staging"
    );
  });

  await t.test("rollback restores the previous version and hides the bad one", async () => {
    await withDb((db) => publish(db, "v005", "v002"));
    assert.equal(
      (await readAsAdmin("system/publishedContentVersion")).contentVersion,
      "v005"
    );

    await withDb((db) => rollback(db, "v005", "v002"));

    const pointer = await readAsAdmin("system/publishedContentVersion");
    assert.equal(pointer.contentVersion, "v002");
    assert.equal(
      (await readAsAdmin("contentVersions/v005")).status,
      "rolledBack"
    );
    assert.equal(
      (await readAsAdmin("contentVersions/v002")).status,
      "published"
    );

    await assertSucceeds(
      getDoc(
        doc(
          guestDb,
          "contentVersions/v002/courses/course-01/lessons/lesson-01-01"
        )
      )
    );
    await assertFails(
      getDoc(
        doc(
          guestDb,
          "contentVersions/v005/courses/course-01/lessons/lesson-01-01"
        )
      )
    );
  });

  await t.test("rolledBack versions stay readable to the Admin path for grading", async () => {
    const pinned = await readAsAdmin(
      "contentVersions/v004/courses/course-01/lessons/lesson-01-01"
    );
    assert.equal(pinned.contentVersion, "v004");

    const rolledBack = await readAsAdmin(
      "contentVersions/v005/courses/course-01/lessons/lesson-01-01"
    );
    assert.equal(rolledBack.contentVersion, "v005");

    const attempt = await readAsAdmin(
      "users/lifecycle-student/attempts/a-pinned-v004"
    );
    assert.equal(attempt.contentVersion, "v004");
    assert.equal(attempt.status, "active");
  });

  // ---- Account deletion and purge order (section 7) ---------------------

  await t.test("account deletion starts with a tombstone while the account still exists", async () => {
    await createAuthUser();
    await seedTargetUser(authUser.uid);

    const before = await signIn(authUser.email);
    assert.ok(before.ok, "the Auth account should exist before the purge");

    const now = Timestamp.now();
    await withDb((db) =>
      setDoc(doc(db, `accountTombstones/${authUser.uid}`), {
        uid: authUser.uid,
        status: "deleted",
        requestedAt: now,
        deletedAt: now,
        authDeletedAt: null,
        purgedAt: null,
        purgeAfter: Timestamp.fromMillis(now.toMillis() + 30 * 86400000),
        reason: "userRequest",
        lastKnownRole: "student",
        requestId: "lifecycle-request-01",
      })
    );

    const tombstone = await readAsAdmin(
      `accountTombstones/${authUser.uid}`
    );
    assert.equal(tombstone.status, "deleted");
    assert.equal(tombstone.uid, authUser.uid);
    assert.ok(tombstone.requestedAt instanceof Timestamp);
    assert.ok(tombstone.deletedAt instanceof Timestamp);
    assert.ok(tombstone.purgeAfter instanceof Timestamp);
    assert.equal(tombstone.authDeletedAt, null);
    assert.equal(tombstone.purgedAt, null);
    assert.equal(tombstone.reason, "userRequest");
    assert.equal(tombstone.lastKnownRole, "student");
    assert.equal(tombstone.requestId, "lifecycle-request-01");

    const targetProfile = await readAsAdmin(`users/${authUser.uid}`);
    assert.equal(targetProfile.status, "active");
    assert.ok((await signIn(authUser.email)).ok);
  });

  await t.test("tombstones are invisible and read-only to every client", async () => {
    const path = `accountTombstones/${authUser.uid}`;

    await assertFails(getDoc(doc(guestDb, path)));
    await assertFails(getDoc(doc(studentDb, path)));
    await assertFails(getDoc(doc(adminDb, path)));
    await assertFails(getDocs(collection(guestDb, "accountTombstones")));

    await assertFails(
      setDoc(doc(adminDb, path), {
        uid: authUser.uid,
        status: "purged",
      })
    );
    await assertFails(
      setDoc(doc(adminDb, "accountTombstones/intruder"), {
        uid: "intruder",
        status: "deleted",
      })
    );
    await assertFails(deleteDoc(doc(adminDb, path)));
  });

  await t.test("clients cannot delete a profile or create one", async () => {
    await assertFails(
      deleteDoc(doc(studentDb, "users/lifecycle-student"))
    );
    await assertFails(
      setDoc(doc(guestDb, "users/resurrected"), profile("resurrected"))
    );
    await assertFails(
      setDoc(
        doc(studentDb, `users/${authUser.uid}`),
        profile(authUser.uid)
      )
    );
  });

  await t.test("the profile is marked deleted before data is purged", async () => {
    await withDb((db) =>
      updateDoc(doc(db, `users/${authUser.uid}`), {status: "deleted"})
    );

    const targetProfile = await readAsAdmin(`users/${authUser.uid}`);
    assert.equal(targetProfile.status, "deleted");

    const deletedDb = env
      .authenticatedContext(authUser.uid, {role: "student"})
      .firestore();

    // Own read survives; the two-field update no longer applies.
    await assertSucceeds(getDoc(doc(deletedDb, `users/${authUser.uid}`)));
    await assertFails(
      updateDoc(doc(deletedDb, `users/${authUser.uid}`), {
        displayName: "Should not work",
      })
    );
    await assertFails(
      updateDoc(doc(deletedDb, `users/${authUser.uid}`), {
        role: "admin",
      })
    );

    // Data still exists at this step: the tombstone comes first, not last.
    await withDb(async (db) => {
      assert.equal(await countSubcollection(db, authUser.uid, "courseProgress"), 1);
      assert.equal(await countSubcollection(db, authUser.uid, "attempts"), 1);
    });
  });

  await t.test("the Auth account is deleted before private data", async () => {
    const result = await authPost("accounts:delete", {
      idToken: authUser.idToken,
    });
    assert.ok(result.ok, `Auth delete failed: ${result.text}`);
    authUser.deleted = true;

    const afterDelete = await signIn(authUser.email);
    assert.equal(afterDelete.ok, false);

    await withDb(async (db) => {
      assert.equal(await countSubcollection(db, authUser.uid, "attempts"), 1);
    });
  });

  await t.test("private subcollections are purged", async () => {
    await withDb(async (db) => {
      for (const name of [
        "courseProgress",
        "lessonProgress",
        "attempts",
        "quizState",
        "idempotency",
      ]) {
        const snapshot = await getDocs(
          collection(db, `users/${authUser.uid}/${name}`)
        );
        for (const entry of snapshot.docs) {
          await deleteDoc(entry.ref);
        }
        assert.equal(await countSubcollection(db, authUser.uid, name), 0);
      }
    });
  });

  await t.test("the profile document is removed and the tombstone is retained", async () => {
    await withDb((db) => deleteDoc(doc(db, `users/${authUser.uid}`)));
    assert.equal(await readAsAdmin(`users/${authUser.uid}`), null);

    await withDb((db) =>
      updateDoc(doc(db, `accountTombstones/${authUser.uid}`), {
        status: "purged",
        purgedAt: Timestamp.now(),
        authDeletedAt: Timestamp.now(),
      })
    );

    const tombstone = await readAsAdmin(
      `accountTombstones/${authUser.uid}`
    );
    assert.equal(tombstone.status, "purged");
    assert.ok(tombstone.purgedAt instanceof Timestamp);
    assert.equal(tombstone.uid, authUser.uid);
  });

  await t.test("a purged account cannot be resurrected by a client", async () => {
    const deletedDb = env
      .authenticatedContext(authUser.uid, {role: "student"})
      .firestore();

    await assertFails(
      setDoc(doc(deletedDb, `users/${authUser.uid}`), profile(authUser.uid))
    );
    await assertFails(
      setDoc(
        doc(deletedDb, `users/${authUser.uid}/courseProgress/course-01`),
        {courseId: "course-01", status: "unlocked"}
      )
    );

    // Own-read is still allowed by the rule (the token is unexpired), but the
    // profile document is gone. This is the F-01 expiry-window behavior, not a
    // resurrection path: reads return no document and all writes are denied.
    const snapshot = await assertSucceeds(
      getDoc(doc(deletedDb, `users/${authUser.uid}`))
    );
    assert.equal(snapshot.exists(), false);
  });

  await t.test("the purge does not touch another account", async () => {
    const liveProfile = await readAsAdmin("users/lifecycle-live");
    assert.equal(liveProfile.status, "active");

    await withDb(async (db) => {
      assert.equal(
        await countSubcollection(db, "lifecycle-live", "courseProgress"),
        1
      );
    });

    const studentProfile = await readAsAdmin("users/lifecycle-student");
    assert.equal(studentProfile.status, "active");
    await assertSucceeds(
      getDoc(doc(studentDb, "users/lifecycle-student"))
    );
  });
});
