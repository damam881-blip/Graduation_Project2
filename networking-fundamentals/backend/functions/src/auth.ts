import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import type {DecodedIdToken} from "firebase-admin/auth";
import type {Request} from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

export type AuthResult =
  | {
      ok: true;
      user: DecodedIdToken;
    }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "INVALID_TOKEN";
      message: string;
    };

/**
 * Verifies a Firebase ID token from the Authorization header.
 *
 * @param {Request} request - Incoming HTTP request.
 * @return {Promise<AuthResult>} Authentication result.
 */
export async function authenticate(
  request: Request
): Promise<AuthResult> {
  const authorization = request.get("Authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);

  if (!match) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "A valid Bearer token is required.",
    };
  }

  try {
    const user = await getAuth().verifyIdToken(match[1]);

    return {
      ok: true,
      user,
    };
  } catch {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: "The authentication token is invalid.",
    };
  }
}
