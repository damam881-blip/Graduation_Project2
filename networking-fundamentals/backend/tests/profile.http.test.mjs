import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";

const profileUrl =
  "http://127.0.0.1:5001/demo-networking-p1/us-central1/profile";

const authUrl =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

const firestoreBase =
  "http://127.0.0.1:8080/v1/projects/demo-networking-p1/databases/" +
  "(default)/documents";

/**
 * Creates a throwaway emulator user and returns its token and UID.
 *
 * @param {string} displayName - Name stored on the Auth user.
 * @return {Promise<{token: string, uid: string}>} Credentials.
 */
async function createTestUser(displayName) {
  const email = `profile-${randomUUID()}@example.test`;

  const response = await fetch(
    `${authUrl}/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email,
        password: "LocalTestPassword123!",
        displayName,
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

  return {token: body.idToken, uid: body.localId};
}

/**
 * Sends POST /profile with a bearer token.
 *
 * @param {string | null} token - ID token, or null to omit the header.
 * @param {object} [body] - Optional request body.
 * @return {Promise<Response>} HTTP response.
 */
function callProfile(token, body) {
  const headers = {};

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(profileUrl, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("GET profile returns 405 with an Allow header", async () => {
  const response = await fetch(profileUrl);
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  assert.deepEqual(body, {
    success: false,
    error: {
      code: "METHOD_NOT_SUPPORTED",
      message: "This HTTP method is not supported for this endpoint.",
    },
  });
});

test("Missing token returns 401 UNAUTHENTICATED", async () => {
  const response = await callProfile(null);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("Invalid token returns 401 INVALID_TOKEN", async () => {
  const response = await callProfile("not-a-real-token");
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "INVALID_TOKEN");
});

test("First call creates the profile and disables caching", async () => {
  const user = await createTestUser("Profile Owner");
  const response = await callProfile(user.token);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(body, {
    success: true,
    data: {
      uid: user.uid,
      displayName: "Profile Owner",
      preferredLanguage: "en",
      role: "student",
      status: "active",
      created: true,
    },
  });
});

test("Second call is idempotent", async () => {
  const user = await createTestUser("Repeat Owner");

  const first = await (await callProfile(user.token)).json();
  const second = await (await callProfile(user.token)).json();

  assert.equal(first.data.created, true);
  assert.equal(second.data.created, false);
  assert.equal(second.data.uid, first.data.uid);
  assert.equal(second.data.displayName, "Repeat Owner");
});

test("Stored document carries server-owned fields", async () => {
  const user = await createTestUser("Stored Owner");

  await callProfile(user.token);

  const response = await fetch(`${firestoreBase}/users/${user.uid}`, {
    headers: {Authorization: "Bearer owner"},
  });
  const document = await response.json();

  assert.equal(response.status, 200);

  const fields = document.fields;

  assert.equal(fields.uid.stringValue, user.uid);
  assert.equal(fields.role.stringValue, "student");
  assert.equal(fields.status.stringValue, "active");
  assert.equal(fields.preferredLanguage.stringValue, "en");
  assert.equal(fields.displayName.stringValue, "Stored Owner");
  assert.match(fields.email.stringValue, /^profile-.*@example\.test$/);
  assert.ok(fields.createdAt.timestampValue, "createdAt must be a timestamp");
  assert.equal(fields.deletedAt.nullValue, null);
});

test("Client-supplied identity and role fields are ignored", async () => {
  const user = await createTestUser("Honest Owner");

  const response = await callProfile(user.token, {
    uid: "attacker-uid",
    role: "admin",
    status: "disabled",
    email: "attacker@example.test",
    displayName: "Overwritten",
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.uid, user.uid);
  assert.equal(body.data.role, "student");
  assert.equal(body.data.status, "active");
  assert.equal(body.data.displayName, "Honest Owner");

  const stored = await fetch(`${firestoreBase}/users/${user.uid}`, {
    headers: {Authorization: "Bearer owner"},
  });
  const document = await stored.json();

  assert.equal(document.fields.uid.stringValue, user.uid);
  assert.equal(document.fields.role.stringValue, "student");
  assert.notEqual(document.fields.email.stringValue, "attacker@example.test");
});

test("Client code still cannot create users/{uid} directly", async () => {
  const user = await createTestUser("Rules Check");

  const response = await fetch(
    `${firestoreBase}/users/${user.uid}?currentDocument.exists=false`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {uid: {stringValue: user.uid}},
      }),
    }
  );

  assert.equal(response.status, 403);
});
