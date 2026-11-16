
import test from "node:test";
import assert from "node:assert/strict";

const baseUrl =
  process.env.HEALTH_TEST_URL ??
  "http://127.0.0.1:5001/demo-networking-p1/us-central1/health";

test("GET health returns HTTP 200", async () => {
  const response = await fetch(baseUrl);

  assert.equal(response.status, 200);
});

test("GET health returns the expected JSON contract", async () => {
  const response = await fetch(baseUrl);
  const body = await response.json();

  assert.deepEqual(body, {
    success: true,
    data: {
      status: "ok",
      service: "networking-backend",
    },
  });
});

test("GET health disables response caching", async () => {
  const response = await fetch(baseUrl);

  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("POST health returns HTTP 405", async () => {
  const response = await fetch(baseUrl, {
    method: "POST",
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});

test("POST health returns the expected error contract", async () => {
  const response = await fetch(baseUrl, {
    method: "POST",
  });

  const body = await response.json();

  assert.deepEqual(body, {
    success: false,
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Only GET requests are supported.",
    },
  });
});
