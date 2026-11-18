const {test} = require("node:test");
const assert = require("node:assert/strict");

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.NO_GCE_CHECK = process.env.NO_GCE_CHECK || "true";

const {getApps, initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {deleteAccountForUser} = require("../lib/delete-account.js");

if (getApps().length === 0) {
  initializeApp({projectId: "demo-networking-p1"});
}

const db = getFirestore();
let sequence = 0;

function uniqueUid() {
  sequence += 1;
  return `unit-delete-${Date.now()}-${sequence}`;
}

async function seedProfile(uid, status) {
  await db.doc(`users/${uid}`).set({
    uid,
    role: "student",
    status,
    displayName: "Unit Delete",
  });
  await db.doc(`users/${uid}/courseProgress/course-01`).set({
    courseId: "course-01",
    status: "inProgress",
  });
  await db.doc(`users/${uid}/attempts/attempt-1`).set({
    quizId: "quiz-01",
    status: "finalized",
  });
}

async function exists(path) {
  const snapshot = await db.doc(path).get();
  return snapshot.exists;
}

test("purges every step and retains the tombstone", async () => {
  const uid = uniqueUid();
  await seedProfile(uid, "active");

  const result = await deleteAccountForUser(uid);

  assert.deepEqual(result, {ok: true, uid, status: "purged"});

  const tombstone = await db.doc(`accountTombstones/${uid}`).get();
  const record = tombstone.data();

  assert.equal(tombstone.exists, true);
  assert.equal(record.uid, uid);
  assert.equal(record.status, "purged");
  assert.equal(record.reason, "userRequest");
  assert.equal(record.lastKnownRole, "student");
  assert.match(
    record.requestId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  );
  assert.ok(record.requestedAt.toMillis() > 0, "requestedAt missing");
  assert.ok(record.deletedAt.toMillis() > 0, "deletedAt missing");
  assert.ok(record.authDeletedAt.toMillis() > 0, "authDeletedAt missing");
  assert.ok(record.purgedAt.toMillis() > 0, "purgedAt missing");
  assert.ok(
    record.purgeAfter.toMillis() > record.deletedAt.toMillis(),
    "purgeAfter must be after deletedAt"
  );

  assert.equal(await exists(`users/${uid}`), false);
  assert.equal(
    await exists(`users/${uid}/courseProgress/course-01`),
    false
  );
  assert.equal(await exists(`users/${uid}/attempts/attempt-1`), false);
});

test("a partially purged account resumes instead of failing closed", async () => {
  const uid = uniqueUid();
  await seedProfile(uid, "deleted");

  // Mid-sequence state left by an interrupted first attempt: the tombstone
  // exists in `deleted` status while the data is still present.
  await db.doc(`accountTombstones/${uid}`).set({
    uid,
    status: "deleted",
    requestedAt: new Date(),
    deletedAt: new Date(),
    authDeletedAt: null,
    purgedAt: null,
    purgeAfter: new Date(Date.now() + 30 * 86400000),
    reason: "userRequest",
    lastKnownRole: "student",
    requestId: "resume-request",
  });

  const result = await deleteAccountForUser(uid);

  assert.deepEqual(result, {ok: true, uid, status: "purged"});
  assert.equal(await exists(`users/${uid}`), false);
  assert.equal(
    await exists(`users/${uid}/courseProgress/course-01`),
    false
  );

  const tombstone = await db.doc(`accountTombstones/${uid}`).get();
  assert.equal(tombstone.data().status, "purged");
});

test("an already purged tombstone fails closed with FORBIDDEN", async () => {
  const uid = uniqueUid();
  await seedProfile(uid, "active");

  await db.doc(`accountTombstones/${uid}`).set({
    uid,
    status: "purged",
    requestedAt: new Date(),
    deletedAt: new Date(),
    authDeletedAt: new Date(),
    purgedAt: new Date(),
    purgeAfter: new Date(Date.now() + 30 * 86400000),
    reason: "userRequest",
    lastKnownRole: "student",
    requestId: "purged-request",
  });

  const result = await deleteAccountForUser(uid);

  assert.deepEqual(result, {ok: false, code: "FORBIDDEN"});

  // Fail closed means no further writes: the live profile stays untouched.
  assert.equal(await exists(`users/${uid}`), true);
  assert.equal(
    await exists(`users/${uid}/courseProgress/course-01`),
    true
  );
});
