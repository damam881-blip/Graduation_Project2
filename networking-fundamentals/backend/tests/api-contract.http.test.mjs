import test from "node:test";
import assert from "node:assert/strict";

const baseUrl =
  "http://127.0.0.1:5001/demo-networking-p1/us-central1";

async function call(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return {
    response,
    body: await response.json(),
  };
}

test("health success response uses exactly the success envelope", async () => {
  const {response, body} = await call("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    success: true,
    data: {
      status: "ok",
      service: "networking-backend",
    },
  });
  assert.deepEqual(Object.keys(body), ["success", "data"]);
});

test("method-not-allowed response uses exactly the error envelope", async () => {
  const {response, body} = await call("/health", {method: "POST"});

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.deepEqual(body, {
    success: false,
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Only GET requests are supported.",
    },
  });
  assert.deepEqual(Object.keys(body), ["success", "error"]);
  assert.deepEqual(Object.keys(body.error), ["code", "message"]);
});

test("missing token response uses exactly the error envelope", async () => {
  const {response, body} = await call("/me");

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    success: false,
    error: {
      code: "UNAUTHENTICATED",
      message: "A valid Bearer token is required.",
    },
  });
  assert.deepEqual(Object.keys(body.error), ["code", "message"]);
});

test("invalid token response uses exactly the error envelope", async () => {
  const {response, body} = await call("/me", {
    headers: {Authorization: "Bearer invalid-token"},
  });

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    success: false,
    error: {
      code: "INVALID_TOKEN",
      message: "The authentication token is invalid.",
    },
  });
});

test("all endpoint error responses keep the no-store directive", async () => {
  const cases = [
    await call("/health", {method: "POST"}),
    await call("/me"),
    await call("/studentAccess"),
    await call("/adminAccess"),
  ];

  for (const {response} of cases) {
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
