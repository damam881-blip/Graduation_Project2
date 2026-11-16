
import {getAuth} from "firebase-admin/auth";
import type {Request} from "firebase-functions/v2/https";
import {authenticate} from "./auth";

export type UserRole = "student" | "admin";

export type AuthorizationResult =
  | {
      ok: true;
      uid: string;
      role: UserRole;
    }
  | {
      ok: false;
      status: 401 | 403 | 503;
      code:
        "UNAUTHENTICATED" |
        "INVALID_TOKEN" |
        "FORBIDDEN" |
        "AUTH_SERVICE_UNAVAILABLE";
      message: string;
    };

/**
 * Checks the verified token against the current Firebase user role.
 *
 * @param {Request} request - Incoming HTTP request.
 * @param {UserRole} requiredRole - Required role.
 * @return {Promise<AuthorizationResult>} Authorization result.
 */
export async function authorize(
  request: Request,
  requiredRole: UserRole
): Promise<AuthorizationResult> {
  const auth = await authenticate(request);

  if (!auth.ok) {
    return {
      ok: false,
      status: 401,
      code: auth.code,
      message: auth.message,
    };
  }

  try {
    const userRecord = await getAuth().getUser(auth.user.uid);
    const currentRole = userRecord.customClaims?.role;
    const tokenRole = auth.user.role;

    if (
      userRecord.disabled ||
      currentRole !== requiredRole ||
      tokenRole !== currentRole
    ) {
      return {
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource.",
      };
    }

    return {
      ok: true,
      uid: auth.user.uid,
      role: requiredRole,
    };
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error ?
        error.code :
        undefined;

    if (code === "auth/user-not-found") {
      return {
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource.",
      };
    }

    return {
      ok: false,
      status: 503,
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "Authorization service is temporarily unavailable.",
    };
  }
}
