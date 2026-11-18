const {test} = require("node:test");
const assert = require("node:assert/strict");
const {successResponse, errorResponse} = require("../lib/api-response.js");
const {API_ERRORS, apiError} = require("../lib/api-errors.js");

test("successResponse returns exactly the success envelope", () => {
  const body = successResponse({status: "ok"});

  assert.deepEqual(body, {
    success: true,
    data: {status: "ok"},
  });
  assert.deepEqual(Object.keys(body), ["success", "data"]);
});

test("successResponse preserves payload identity and nested data", () => {
  const data = {uid: "abc", nested: {roles: ["student"]}};
  const body = successResponse(data);

  assert.equal(body.data, data);
  assert.deepEqual(body.data.nested.roles, ["student"]);
});

test("success envelope exposes no undocumented top-level fields", () => {
  const body = successResponse({});

  assert.equal("schemaVersion" in body, false);
  assert.equal("correlationId" in body, false);
  assert.equal("error" in body, false);
});

test("errorResponse returns exactly the error envelope", () => {
  const body = errorResponse("FORBIDDEN", "Denied.");

  assert.deepEqual(body, {
    success: false,
    error: {
      code: "FORBIDDEN",
      message: "Denied.",
    },
  });
  assert.deepEqual(Object.keys(body), ["success", "error"]);
  assert.deepEqual(Object.keys(body.error), ["code", "message"]);
});

test("error envelope exposes no undocumented top-level fields", () => {
  const body = errorResponse("INVALID_TOKEN", "Bad token.");

  assert.equal("schemaVersion" in body, false);
  assert.equal("correlationId" in body, false);
  assert.equal("data" in body, false);
});

test("every API error code has the documented status and message", () => {
  const expected = {
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
    METHOD_NOT_SUPPORTED: {
      status: 405,
      message: "This HTTP method is not supported for this endpoint.",
    },
    AUTH_SERVICE_UNAVAILABLE: {
      status: 503,
      message: "Authorization service is temporarily unavailable.",
    },
    PROFILE_UNAVAILABLE: {
      status: 503,
      message: "The profile service is temporarily unavailable.",
    },
    DELETION_UNAVAILABLE: {
      status: 503,
      message: "The account deletion service is temporarily unavailable.",
    },
  };

  assert.deepEqual(
    Object.keys(API_ERRORS).sort(),
    Object.keys(expected).sort()
  );

  for (const [code, definition] of Object.entries(expected)) {
    assert.equal(apiError(code).status, definition.status, code);
    assert.equal(apiError(code).message, definition.message, code);
    assert.equal(API_ERRORS[code], apiError(code), code);
  }
});

test("API error codes follow the stable uppercase snake case format", () => {
  for (const code of Object.keys(API_ERRORS)) {
    assert.match(code, /^[A-Z][A-Z0-9_]*$/);
  }
});
