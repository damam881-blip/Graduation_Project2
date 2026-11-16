
import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";

const baseUrl =
  "http://127.0.0.1:5001/demo-networking-p1/us-central1/me";

const authUrl =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

async function createTestUser() {
  const email = `test-${randomUUID()}@example.test`;

  const response = await fetch(
    `${authUrl}/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: "LocalTestPassword123!",
        returnSecureToken: true,
      }),
    }
  );

  const body = await response.json();

  assert.equal(
    response.status,
    200,
    `Test user creation failed: ${JSON.stringify(body)}`
  );

  assert.ok(body.idToken);
  assert.ok(body.localId);

  return {
    token: body.idToken,
    uid: body.localId,
  };
}

test("Missing token returns 401", async () => {
  const response = await fetch(baseUrl);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("Invalid token returns 401", async () => {
  const response = await fetch(baseUrl, {
    headers: {
      Authorization: "Bearer invalid-token",
    },
  });

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "INVALID_TOKEN");
});

test("Malformed Authorization header returns 401", async () => {
  const response = await fetch(baseUrl, {
    headers: {
      Authorization: "Basic invalid-token",
    },
  });

  assert.equal(response.status, 401);
});

test("Valid Firebase ID token returns verified UID", async () => {
  const user = await createTestUser();

  const response = await fetch(baseUrl, {
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.uid, user.uid);
});

test("Client cannot override the verified UID", async () => {
  const user = await createTestUser();

  const response = await fetch(
    `${baseUrl}?uid=another-user`,
    {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.uid, user.uid);
  assert.notEqual(body.data.uid, "another-user");
});

test("POST on protected endpoint returns 405", async () => {
  const response = await fetch(baseUrl, {
    method: "POST",
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});
