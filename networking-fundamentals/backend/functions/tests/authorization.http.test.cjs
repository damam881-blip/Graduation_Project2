const {test, before, after} = require("node:test");
const assert = require("node:assert/strict");
const {randomUUID} = require("node:crypto");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");

const projectId = "demo-networking-p1";
const host = "127.0.0.1";
const authPort = 9099;

const baseUrl =
  `http://${host}:5001/${projectId}/us-central1`;
const authUrl =
  `http://${host}:${authPort}/identitytoolkit.googleapis.com/v1`;

process.env.FIREBASE_AUTH_EMULATOR_HOST =
  `${host}:${authPort}`;

initializeApp({projectId});

const auth = getAuth();
const createdUsers = [];
const users = {};

/**
 * Creates a test user with a trusted role claim.
 * Claims are set before requesting an ID token.
 *
 * @param {string} role - Role to assign.
 * @return {Promise<object>} User identity and token.
 */
async function createTestUser(role) {
  const email = `authz-${randomUUID()}@example.test`;
  const password = "LocalTestPassword123!";

  const record = await auth.createUser({
    email,
    password,
  });

  createdUsers.push(record.uid);

  if (role) {
    await auth.setCustomUserClaims(record.uid, {role});
  }

  const response = await fetch(
    `${authUrl}/accounts:signInWithPassword?key=demo-api-key`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.ok(body.idToken);

  return {
    uid: record.uid,
    token: body.idToken,
  };
}

/**
 * Calls an authorization endpoint.
 *
 * @param {string} endpoint - Endpoint name.
 * @param {string} token - Optional Firebase ID token.
 * @return {Promise<object>} HTTP response and JSON body.
 */
async function callEndpoint(endpoint, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/${endpoint}`, {
    headers,
  });

  return {
    response,
    body: await response.json(),
  };
}

before(async () => {
  users.student = await createTestUser("student");
  users.admin = await createTestUser("admin");
  users.noRole = await createTestUser(null);
});

after(async () => {
  for (const uid of createdUsers) {
    await auth.deleteUser(uid);
  }
});

test("Missing token returns 401", async () => {
  const {response, body} =
    await callEndpoint("studentAccess");

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("Invalid token returns 401", async () => {
  const {response, body} =
    await callEndpoint("adminAccess", "invalid-token");

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "INVALID_TOKEN");
});

test("Student can access Student API", async () => {
  const {response, body} =
    await callEndpoint("studentAccess", users.student.token);

  assert.equal(response.status, 200);
  assert.equal(body.data.uid, users.student.uid);
  assert.equal(body.data.role, "student");
});

test("Student cannot access Admin API", async () => {
  const {response, body} =
    await callEndpoint("adminAccess", users.student.token);

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("Admin can access Admin API", async () => {
  const {response, body} =
    await callEndpoint("adminAccess", users.admin.token);

  assert.equal(response.status, 200);
  assert.equal(body.data.uid, users.admin.uid);
  assert.equal(body.data.role, "admin");
});

test("Admin cannot access Student API", async () => {
  const {response, body} =
    await callEndpoint("studentAccess", users.admin.token);

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("User without role cannot access Student API", async () => {
  const {response, body} =
    await callEndpoint("studentAccess", users.noRole.token);

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("User without role cannot access Admin API", async () => {
  const {response, body} =
    await callEndpoint("adminAccess", users.noRole.token);

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("Query parameter cannot grant Admin access", async () => {
  const response = await fetch(
    `${baseUrl}/adminAccess?role=admin`,
    {
      headers: {
        Authorization: `Bearer ${users.student.token}`,
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("POST on Student API returns 405", async () => {
  const response = await fetch(
    `${baseUrl}/studentAccess`,
    {method: "POST"}
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});


test("Unknown role cannot access Student or Admin APIs", async () => {
  const user = await createTestUser("teacher");

  const student = await callEndpoint(
    "studentAccess",
    user.token
  );

  assert.equal(student.response.status, 403);
  assert.equal(student.body.error.code, "FORBIDDEN");

  const admin = await callEndpoint(
    "adminAccess",
    user.token
  );

  assert.equal(admin.response.status, 403);
  assert.equal(admin.body.error.code, "FORBIDDEN");
});


test("Fake Admin role in header cannot grant access", async () => {
  const response = await fetch(
    `${baseUrl}/adminAccess`,
    {
      headers: {
        Authorization: `Bearer ${users.student.token}`,
        "X-User-Role": "admin",
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

test("Fake Admin role cannot elevate user without role", async () => {
  const response = await fetch(
    `${baseUrl}/adminAccess?role=admin`,
    {
      headers: {
        Authorization: `Bearer ${users.noRole.token}`,
        "X-User-Role": "admin",
      },
    }
  );

  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});


test("Revoked Admin role rejects stale ID token", async () => {
  // Create a separate Admin user for this test.
  const user = await createTestUser("admin");

  // Confirm that the original token has Admin access.
  const before = await callEndpoint(
    "adminAccess",
    user.token
  );

  assert.equal(before.response.status, 200);
  assert.equal(before.body.data.role, "admin");

  // Remove the trusted Admin role from Firebase Auth.
  await auth.setCustomUserClaims(user.uid, {});

  // Reuse the original token without refreshing it.
  const after = await callEndpoint(
    "adminAccess",
    user.token
  );

  // The old token must no longer grant Admin access.
  assert.equal(after.response.status, 403);
  assert.equal(after.body.error.code, "FORBIDDEN");
});


test("Disabled Admin cannot access Admin API", async () => {
  const user = await createTestUser("admin");

  const before = await callEndpoint(
    "adminAccess",
    user.token
  );

  assert.equal(before.response.status, 200);

  await auth.updateUser(user.uid, {disabled: true});

  const after = await callEndpoint(
    "adminAccess",
    user.token
  );

  assert.notEqual(after.response.status, 200);
  assert.ok([401, 403].includes(after.response.status));
});

test("Old Student token cannot gain newly assigned Admin role", async () => {
  const user = await createTestUser("student");

  await auth.setCustomUserClaims(user.uid, {
    role: "admin",
  });

  const result = await callEndpoint(
    "adminAccess",
    user.token
  );

  assert.equal(result.response.status, 403);
  assert.equal(result.body.error.code, "FORBIDDEN");
});
