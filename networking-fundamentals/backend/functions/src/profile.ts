import {FieldValue, getFirestore} from "firebase-admin/firestore";
import type {DocumentData} from "firebase-admin/firestore";
import type {DecodedIdToken} from "firebase-admin/auth";

/**
 * Preferred UI language for a profile. Mirrors the N2 field contract.
 */
export type PreferredLanguage = "en" | "ar";

/**
 * Stable, client-visible shape of a provisioned profile.
 *
 * Timestamps are intentionally not returned: they are server-owned and the
 * client never needs them to render the profile header.
 */
export type ProfileView = {
  uid: string;
  displayName: string | null;
  preferredLanguage: PreferredLanguage;
  role: "student";
  status: "active";
  created: boolean;
};

export type EnsureProfileResult =
  | {ok: true; profile: ProfileView}
  | {ok: false};

const DISPLAY_NAME_MAX = 80;
const ALREADY_EXISTS = 6;

/**
 * Reads a valid display name from the Auth token.
 *
 * @param {unknown} value - Raw `name` claim.
 * @return {string | null} Trimmed name capped at the N2 limit, or null.
 */
function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, DISPLAY_NAME_MAX);
}

/**
 * Maps a stored profile document onto the client-visible view.
 *
 * @param {DocumentData} data - Firestore document data.
 * @param {boolean} created - Whether this call created the document.
 * @return {ProfileView} Client-visible profile.
 */
function toProfileView(
  data: DocumentData,
  created: boolean
): ProfileView {
  return {
    uid: typeof data.uid === "string" ? data.uid : "",
    displayName: normalizeDisplayName(data.displayName),
    preferredLanguage: data.preferredLanguage === "ar" ? "ar" : "en",
    role: "student",
    status: "active",
    created,
  };
}

/**
 * Creates the `users/{uid}` profile on first sign-in and is idempotent on
 * every later call.
 *
 * N2-04 sets `allow create: if false` for `users/{uid}`, so the document can
 * only be created here, with the Admin SDK, from verified token data. Server
 * owned fields never come from the request body.
 *
 * @param {DecodedIdToken} token - Verified Firebase Auth token.
 * @return {Promise<EnsureProfileResult>} Profile or a retryable failure.
 */
export async function ensureProfile(
  token: DecodedIdToken
): Promise<EnsureProfileResult> {
  const uid = token.uid;
  const reference = getFirestore().collection("users").doc(uid);

  const existing = await reference.get();

  if (existing.exists) {
    return {
      ok: true,
      profile: toProfileView(existing.data() ?? {}, false),
    };
  }

  const record = {
    uid,
    email: typeof token.email === "string" ? token.email : null,
    displayName: normalizeDisplayName(token.name),
    preferredLanguage: "en" as PreferredLanguage,
    role: "student",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
    deletedAt: null,
    purgeAfter: null,
  };

  try {
    await reference.create(record);
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error ?
        (error as {code?: unknown}).code :
        undefined;

    if (code !== ALREADY_EXISTS) {
      return {ok: false};
    }

    // A concurrent call won the race; return its document.
    const raced = await reference.get();

    if (!raced.exists) {
      return {ok: false};
    }

    return {
      ok: true,
      profile: toProfileView(raced.data() ?? {}, false),
    };
  }

  return {
    ok: true,
    profile: toProfileView(record, true),
  };
}
