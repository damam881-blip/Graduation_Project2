import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";

const baseUrl =
  "http://127.0.0.1:5001/demo-networking-p1/us-central1";

const deleteUrl = `${baseUrl}/deleteAccount`;
const profileUrl = `${baseUrl}/profile`;

const authUrl =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

const firestoreBase =
  "http://127.0.0.1:8080/v1/projects/demo-networking-p1/databases/" +
  "(default)/documents";

const PASSWORD = "LocalTestPassword123!";

/**
 * Creates a throwaway emulator user and provisions its profile.
 *
 * @return {Promise<{token: string, uid: string, email: string}>} Credentials.
 */
async function createProvisionedUser() {
  const email = `delete-${randomUUID()}@example.test`;

  const signUp = await fetch(
    `${authUrl}/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email,
        password: PASSWORD,
        displayName: "Delete Owner",
        returnSecureToken: true,
      }),
    }
  );

  const created = await signUp.json();

  assert.equal(
    signUp.status,
    200,
    `Test user creation failed: ${JSON.stringify(created)}`
  );

  const token = created.idToken;
  const uid = created.localId;

  const provision = await fetch(profileUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  assert.equal(provision.status, 200, "profile provisioning failed");

  return {token, uid, email};
}

/**
 * Seeds one progress document for the user through the owner Admin path.
 *
 * @param {string} uid - Owner UID.
 * @param {string} path - Document path below `users/{uid}`.
 * @param {object} fields - Firestore REST fields map.
 * @return {Promise<void>} Nothing.
 */
async function seedUserDocument(uid, path, fields) {
  const response = await fetch(
    `${firestoreBase}/users/${uid}/${path}?currentDocument.exists=false`,
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer owner",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({fields}),
    }
  );

  assert.equal(response.status, 200, `seeding ${path} failed`);
}

/**
 * Reads one document as the emulator owner.
 *
 * @param {string} path - Document path below the database root.
 * @return {Promise<{status: number, body: object}>} Status and REST body.
 */
async function ownerRead(path) {
  const response = await fetch(`${firestoreBase}/${path}`, {
    headers: {Authorization: "Bearer owner"},
  });

  return {status: response.status, body: await response.json()};
}

/**
 * Sends POST /deleteAccount with an optional bearer token.
 *
 * @param {string | null} token - ID token, or null to omit the header.
 * @param {string} [method] - HTTP method, defaults to POST.
 * @return {Promise<Response>} HTTP response.
 */
function callDelete(token, method = "POST") {
  const headers = {};

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(deleteUrl, {method, headers});
}

test("GET deleteAccount returns 405 with an Allow header", async () => {
  const response = await callDelete(null, "GET");
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
  const response = await callDelete(null);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("Invalid token returns 401 INVALID_TOKEN", async () => {
  const response = await callDelete("not-a-real-token");
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "INVALID_TOKEN");
});

test("Responses keep the no-store directive", async () => {
  const response = await callDelete("not-a-real-token");

  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("Full purge follows the documented tombstone sequence", async () => {
  const user = await createProvisionedUser();

  await seedUserDocument(user.uid, "courseProgress/course-01", {
    courseId: {stringValue: "course-01"},
    status: {stringValue: "inProgress"},
  });
  await seedUserDocument(user.uid, "attempts/attempt-delete-1", {
    quizId: {stringValue: "quiz-01"},
    status: {stringValue: "finalized"},
  });

  const response = await callDelete(user.token);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    success: true,
    data: {uid: user.uid, status: "purged"},
  });
  assert.deepEqual(Object.keys(body), ["success", "data"]);

  // Tombstone is retained in the terminal state with every required field.
  const tombstone = await ownerRead(`accountTombstones/${user.uid}`);

  assert.equal(tombstone.status, 200);

  const fields = tombstone.body.fields;

  assert.equal(fields.uid.stringValue, user.uid);
  assert.equal(fields.status.stringValue, "purged");
  assert.equal(fields.reason.stringValue, "userRequest");
  assert.equal(fields.lastKnownRole.stringValue, "student");
  assert.match(
    fields.requestId.stringValue,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  );
  assert.ok(fields.requestedAt.timestampValue, "requestedAt missing");
  assert.ok(fields.deletedAt.timestampValue, "deletedAt missing");
  assert.ok(fields.authDeletedAt.timestampValue, "authDeletedAt missing");
  assert.ok(fields.purgedAt.timestampValue, "purgedAt missing");
  assert.ok(fields.purgeAfter.timestampValue, "purgeAfter missing");

  // Profile and private subcollections are gone.
  const profile = await ownerRead(`users/${user.uid}`);
  const progress = await ownerRead(
    `users/${user.uid}/courseProgress/course-01`
  );
  const attempt = await ownerRead(
    `users/${user.uid}/attempts/attempt-delete-1`
  );

  assert.equal(profile.status, 404);
  assert.equal(progress.status, 404);
  assert.equal(attempt.status, 404);

  // The Auth account can no longer sign in.
  const signIn = await fetch(
    `${authUrl}/accounts:signInWithPassword?key=demo-api-key`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email: user.email,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    }
  );

  assert.notEqual(signIn.status, 200, "sign-in must fail after deletion");
});

test("A repeat call after the purge fails closed", async () => {
  const user = await createProvisionedUser();

  const first = await callDelete(user.token);
  assert.equal(first.status, 200);

  // The Auth emulator rejects tokens of deleted users, so the stale token
  // never reaches the tombstone check. The tombstone `purged` -> FORBIDDEN
  // branch is defense-in-depth for verifiers that do not check revocation
  // and is covered by functions/tests/delete-account.test.cjs.
  const second = await callDelete(user.token);
  const body = await second.json();

  assert.equal(second.status, 401);
  assert.equal(body.error.code, "INVALID_TOKEN");
});

test("A stale token cannot resurrect the purged profile", async () => {
  const user = await createProvisionedUser();

  const deleted = await callDelete(user.token);
  assert.equal(deleted.status, 200);

  const response = await fetch(profileUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "INVALID_TOKEN");

  const profile = await ownerRead(`users/${user.uid}`);
  assert.equal(profile.status, 404, "profile must stay deleted");
});

test("Clients cannot write tombstones directly", async () => {
  const user = await createProvisionedUser();

  const response = await fetch(
    `${firestoreBase}/accountTombstones/${user.uid}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          uid: {stringValue: user.uid},
          status: {stringValue: "purged"},
        },
      }),
    }
  );

  assert.equal(response.status, 403);

  const tombstone = await ownerRead(`accountTombstones/${user.uid}`);
  assert.equal(tombstone.status, 404);
});

test("A tombstone blocks profile provisioning for a live token", async () => {
  const user = await createProvisionedUser();

  // Simulate the mid-sequence state: tombstone written, Auth still alive.
  const write = await fetch(
    `${firestoreBase}/accountTombstones/${user.uid}`,
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer owner",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          uid: {stringValue: user.uid},
          status: {stringValue: "deleted"},
        },
      }),
    }
  );

  assert.equal(write.status, 200);

  const response = await fetch(profileUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});
