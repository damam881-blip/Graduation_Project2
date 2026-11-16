/**
 * Stable API error identifiers.
 *
 * These codes are part of the public HTTP contract. Once a code is
 * released to a client it must not be renamed or repurposed; add a new
 * code instead.
 */
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_TOKEN"
  | "FORBIDDEN"
  | "METHOD_NOT_ALLOWED"
  | "AUTH_SERVICE_UNAVAILABLE";

/**
 * Canonical definition of one API error code.
 */
export type ApiErrorDefinition = {
  status: 401 | 403 | 405 | 503;
  message: string;
};

/**
 * Authoritative error code to HTTP status and message mapping.
 *
 * The messages here must stay byte-identical to the messages currently
 * asserted by the HTTP tests.
 */
export const API_ERRORS: Record<ApiErrorCode, ApiErrorDefinition> = {
  UNAUTHENTICATED: {
    status: 401,
    message: "A valid Bearer token is required.",
  },
  INVALID_TOKEN: {
    status: 401,
    message: "The authentication token is invalid.",
  },
  FORBIDDEN: {
    status: 403,
    message: "You do not have permission to access this resource.",
  },
  METHOD_NOT_ALLOWED: {
    status: 405,
    message: "Only GET requests are supported.",
  },
  AUTH_SERVICE_UNAVAILABLE: {
    status: 503,
    message: "Authorization service is temporarily unavailable.",
  },
};

/**
 * Returns the definition for a known API error code.
 *
 * @param {ApiErrorCode} code - Stable error identifier.
 * @return {ApiErrorDefinition} HTTP status and canonical message.
 */
export function apiError(code: ApiErrorCode): ApiErrorDefinition {
  return API_ERRORS[code];
}
