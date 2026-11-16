export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

/**
 * Builds a standardized successful API response.
 *
 * @param {T} data - Response payload.
 * @return {ApiSuccess<T>} Successful response envelope.
 */
export function successResponse<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Builds a standardized API error response.
 *
 * @param {string} code - Stable error identifier.
 * @param {string} message - Human-readable error message.
 * @return {ApiFailure} Error response envelope.
 */
export function errorResponse(
  code: string,
  message: string
): ApiFailure {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
