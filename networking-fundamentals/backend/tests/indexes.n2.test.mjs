/**
 * N2-06 - Firestore index contract and query-shape verification.
 *
 * Two layers of evidence:
 *  1. Static: firestore.indexes.json must match the canonical plan
 *     (data-model.md section 10, I-01..I-11) exactly, in staged order, with
 *     no speculative or duplicate entries. I-12 is single-field and relies on
 *     the automatic index, so it must not appear in the composite file.
 *  2. Live: every planned index is exercised with a real query shape against
 *     data seeded in a private emulator namespace (demo-networking-indexes).
 *     This proves the field paths exist, are orderable, and that the
 *     documented ordering is achievable.
 *
 * The Firestore emulator does NOT enforce composite-index requirements, so
 * the static match is the index-existence evidence and the live queries prove
 * the shapes are real. Deployed-project verification is out of MVP scope.
 *
 * Prerequisite: Firestore emulator on 127.0.0.1:8080.
 */

import {test, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

import {initializeTestEnvironment} from "@firebase/rules-unit-testing";

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  Timestamp,
} from "firebase/firestore";

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, "..", "firestore.indexes.json");

const PROJECT_ID = "demo-networking-indexes";

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`,
  },
});

after(async () => {
  await env.clearFirestore();
  await env.cleanup();
});

const raw = readFileSync(indexPath, "utf8").replace(/^\uFEFF/, "");
const parsed = JSON.parse(raw);

/**
 * Canonical plan: I-01..I-11 in the staged order of schema-lock.md section 6.
 * The signature form is "collectionGroup|field:ORDER,...".
 */
const PLAN = [
  {
    id: "I-01",
    signature:
      "quizzes|courseId:ASCENDING,type:ASCENDING,order:ASCENDING",
    stage: 1,
    query:
      "contentVersions/{v}/quizzes: courseId == c && type == 'lesson' " +
      "orderBy order asc",
  },
  {
    id: "I-02",
    signature: "lessons|courseId:ASCENDING,order:ASCENDING",
    stage: 1,
    query:
      "contentVersions/{v}/courses/{c}/lessons: courseId == c orderBy order asc",
  },
  {
    id: "I-08",
    signature:
      "aiSections|courseId:ASCENDING,language:ASCENDING,order:ASCENDING",
    stage: 1,
    query:
      "contentVersions/{v}/aiSections: courseId == c && language == l " +
      "orderBy order asc",
  },
  {
    id: "I-06",
    signature: "lessonProgress|courseId:ASCENDING,lessonOrder:ASCENDING",
    stage: 2,
    query:
      "users/{uid}/lessonProgress: courseId == c orderBy lessonOrder asc",
  },
  {
    id: "I-03",
    signature: "attempts|uid:ASCENDING,startedAt:DESCENDING",
    stage: 3,
    query: "users/{uid}/attempts: uid == u orderBy startedAt desc",
  },
  {
    id: "I-04",
    signature:
      "attempts|quizId:ASCENDING,status:ASCENDING,startedAt:ASCENDING",
    stage: 3,
    query:
      "users/{uid}/attempts: quizId == q && status == s orderBy startedAt asc",
  },
  {
    id: "I-05",
    signature: "attempts|status:ASCENDING,deadlineAt:ASCENDING",
    stage: 3,
    query: "users/{uid}/attempts: status == s orderBy deadlineAt asc",
  },
  {
    id: "I-07",
    signature: "users|role:ASCENDING,status:ASCENDING,createdAt:ASCENDING",
    stage: 4,
    query: "users: role == r && status == s orderBy createdAt asc",
  },
  {
    id: "I-09",
    signature: "adminAudit|actorUid:ASCENDING,createdAt:DESCENDING",
    stage: 4,
    query: "adminAudit: actorUid == a orderBy createdAt desc",
  },
  {
    id: "I-10",
    signature: "adminAudit|action:ASCENDING,createdAt:DESCENDING",
    stage: 4,
    query: "adminAudit: action == a orderBy createdAt desc",
  },
  {
    id: "I-11",
    signature:
      "accountTombstones|status:ASCENDING,deletedAt:ASCENDING",
    stage: 4,
    query: "accountTombstones: status == s orderBy deletedAt asc",
  },
];

const expectedSignatures = PLAN.map((entry) => entry.signature);

function signatureOf(entry) {
  const fields = entry.fields.map(
    (field) => `${field.fieldPath}:${field.order}`
  );
  return `${entry.collectionGroup}|${fields.join(",")}`;
}

const T0 = Timestamp.fromDate(new Date("2026-11-16T00:00:00Z"));
const at = (minutes) =>
  Timestamp.fromMillis(T0.toMillis() + minutes * 60 * 1000);

async function write(db, path, data) {
  await setDoc(doc(db, path), data);
}

async function seed(db) {
  // I-01 quizzes: a lesson-quiz list plus a final quiz and another course.
  await write(db, "contentVersions/v001/quizzes/quiz-l02", {
    courseId: "course-01",
    type: "lesson",
    order: 2,
  });
  await write(db, "contentVersions/v001/quizzes/quiz-l01", {
    courseId: "course-01",
    type: "lesson",
    order: 1,
  });
  await write(db, "contentVersions/v001/quizzes/quiz-final", {
    courseId: "course-01",
    type: "final",
    order: 999,
  });
  await write(db, "contentVersions/v001/quizzes/quiz-c2", {
    courseId: "course-02",
    type: "lesson",
    order: 1,
  });

  // I-02 lessons.
  await write(
    db,
    "contentVersions/v001/courses/course-01/lessons/lesson-02",
    {courseId: "course-01", order: 2}
  );
  await write(
    db,
    "contentVersions/v001/courses/course-01/lessons/lesson-01",
    {courseId: "course-01", order: 1}
  );
  await write(
    db,
    "contentVersions/v001/courses/course-02/lessons/lesson-03",
    {courseId: "course-02", order: 3}
  );

  // I-08 AI sections.
  await write(db, "contentVersions/v001/aiSections/sec-en-02", {
    courseId: "course-01",
    language: "en",
    order: 2,
  });
  await write(db, "contentVersions/v001/aiSections/sec-en-01", {
    courseId: "course-01",
    language: "en",
    order: 1,
  });
  await write(db, "contentVersions/v001/aiSections/sec-ar-01", {
    courseId: "course-01",
    language: "ar",
    order: 1,
  });
  await write(db, "contentVersions/v001/aiSections/sec-other", {
    courseId: "course-02",
    language: "en",
    order: 1,
  });

  // I-06 lesson progress.
  await write(db, "users/index-user/lessonProgress/lp-02", {
    courseId: "course-01",
    lessonOrder: 2,
  });
  await write(db, "users/index-user/lessonProgress/lp-01", {
    courseId: "course-01",
    lessonOrder: 1,
  });
  await write(db, "users/index-user/lessonProgress/lp-03", {
    courseId: "course-02",
    lessonOrder: 3,
  });

  // I-03, I-04, I-05 attempts.
  await write(db, "users/index-user/attempts/a3", {
    uid: "index-user",
    quizId: "quiz-1",
    status: "finalized",
    startedAt: at(30),
    deadlineAt: at(40),
  });
  await write(db, "users/index-user/attempts/a2", {
    uid: "index-user",
    quizId: "quiz-1",
    status: "active",
    startedAt: at(20),
    deadlineAt: at(50),
  });
  await write(db, "users/index-user/attempts/a1", {
    uid: "index-user",
    quizId: "quiz-1",
    status: "active",
    startedAt: at(10),
    deadlineAt: at(40),
  });
  await write(db, "users/other-user/attempts/a4", {
    uid: "other-user",
    quizId: "quiz-2",
    status: "active",
    startedAt: at(15),
    deadlineAt: at(45),
  });

  // I-07 users.
  await write(db, "users/u-01", {
    role: "student",
    status: "active",
    createdAt: at(1),
  });
  await write(db, "users/u-02", {
    role: "student",
    status: "active",
    createdAt: at(2),
  });
  await write(db, "users/u-03", {
    role: "student",
    status: "disabled",
    createdAt: at(3),
  });
  await write(db, "users/u-04", {
    role: "admin",
    status: "active",
    createdAt: at(4),
  });

  // I-09, I-10 audit events.
  await write(db, "adminAudit/e3", {
    action: "setRole",
    actorUid: "admin-2",
    createdAt: at(3),
  });
  await write(db, "adminAudit/e2", {
    action: "publishContent",
    actorUid: "admin-1",
    createdAt: at(2),
  });
  await write(db, "adminAudit/e1", {
    action: "publishContent",
    actorUid: "admin-1",
    createdAt: at(1),
  });

  // I-11 tombstones.
  await write(db, "accountTombstones/t2", {
    status: "purged",
    deletedAt: at(2),
  });
  await write(db, "accountTombstones/t1", {
    status: "purged",
    deletedAt: at(1),
  });
  await write(db, "accountTombstones/t3", {
    status: "pending",
    deletedAt: at(0),
  });

  // I-12 quizState: single-field cooldown sweep, no composite index.
  await write(db, "users/index-user/quizState/qs-01", {
    cooldownUntil: at(10),
  });
  await write(db, "users/index-user/quizState/qs-02", {
    cooldownUntil: at(20),
  });
  await write(db, "users/index-user/quizState/qs-03", {
    cooldownUntil: null,
  });
}

async function withDb(fn) {
  let result;
  await env.withSecurityRulesDisabled(async (context) => {
    result = await fn(context.firestore());
  });
  return result;
}

async function idsOf(db, ...clauses) {
  const snapshot = await getDocs(query(...clauses));
  return snapshot.docs.map((entry) => entry.id);
}

test("N2-06 index contract (static)", async (t) => {
  await t.test("index file is strict JSON", () => {
    assert.ok(parsed && typeof parsed === "object");
    assert.ok(Array.isArray(parsed.indexes));
    assert.ok(Array.isArray(parsed.fieldOverrides));
  });

  await t.test("index set matches the canonical plan exactly", () => {
    const actual = parsed.indexes.map(signatureOf);
    assert.deepEqual(actual, expectedSignatures);
  });

  await t.test("no duplicate index definitions", () => {
    const actual = parsed.indexes.map(signatureOf);
    assert.equal(new Set(actual).size, actual.length);
  });

  await t.test("entries use only supported keys", () => {
    for (const entry of parsed.indexes) {
      assert.deepEqual(Object.keys(entry).sort(), [
        "collectionGroup",
        "fields",
        "queryScope",
      ]);
      assert.equal(entry.queryScope, "COLLECTION");
      assert.ok(entry.fields.length >= 2, "composite index needs 2+ fields");
      for (const field of entry.fields) {
        assert.deepEqual(Object.keys(field).sort(), ["fieldPath", "order"]);
        assert.ok(
          field.order === "ASCENDING" || field.order === "DESCENDING",
          `invalid order ${field.order}`
        );
      }
    }
  });

  await t.test("single-field I-12 is not duplicated in the composite file", () => {
    assert.ok(
      parsed.indexes.every((entry) => entry.collectionGroup !== "quizState"),
      "quizState must rely on the automatic single-field index"
    );
  });

  await t.test("no speculative field overrides", () => {
    assert.deepEqual(parsed.fieldOverrides, []);
  });
});

test("N2-06 index query shapes (live)", async (t) => {
  await withDb(seed);

  const cases = [
    {
      id: "I-01",
      expect: ["quiz-l01", "quiz-l02"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "contentVersions/v001/quizzes"),
          where("courseId", "==", "course-01"),
          where("type", "==", "lesson"),
          orderBy("order", "asc")
        ),
    },
    {
      id: "I-02",
      expect: ["lesson-01", "lesson-02"],
      run: (db) =>
        idsOf(
          db,
          collection(
            db,
            "contentVersions/v001/courses/course-01/lessons"
          ),
          where("courseId", "==", "course-01"),
          orderBy("order", "asc")
        ),
    },
    {
      id: "I-08",
      expect: ["sec-en-01", "sec-en-02"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "contentVersions/v001/aiSections"),
          where("courseId", "==", "course-01"),
          where("language", "==", "en"),
          orderBy("order", "asc")
        ),
    },
    {
      id: "I-06",
      expect: ["lp-01", "lp-02"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "users/index-user/lessonProgress"),
          where("courseId", "==", "course-01"),
          orderBy("lessonOrder", "asc")
        ),
    },
    {
      id: "I-03",
      expect: ["a3", "a2", "a1"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "users/index-user/attempts"),
          where("uid", "==", "index-user"),
          orderBy("startedAt", "desc")
        ),
    },
    {
      id: "I-04",
      expect: ["a1", "a2"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "users/index-user/attempts"),
          where("quizId", "==", "quiz-1"),
          where("status", "==", "active"),
          orderBy("startedAt", "asc")
        ),
    },
    {
      id: "I-05",
      expect: ["a1", "a2"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "users/index-user/attempts"),
          where("status", "==", "active"),
          orderBy("deadlineAt", "asc")
        ),
    },
    {
      id: "I-07",
      expect: ["u-01", "u-02"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "users"),
          where("role", "==", "student"),
          where("status", "==", "active"),
          orderBy("createdAt", "asc")
        ),
    },
    {
      id: "I-09",
      expect: ["e2", "e1"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "adminAudit"),
          where("actorUid", "==", "admin-1"),
          orderBy("createdAt", "desc")
        ),
    },
    {
      id: "I-10",
      expect: ["e2", "e1"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "adminAudit"),
          where("action", "==", "publishContent"),
          orderBy("createdAt", "desc")
        ),
    },
    {
      id: "I-11",
      expect: ["t1", "t2"],
      run: (db) =>
        idsOf(
          db,
          collection(db, "accountTombstones"),
          where("status", "==", "purged"),
          orderBy("deletedAt", "asc")
        ),
    },
  ];

  for (const entry of cases) {
    await t.test(`${entry.id} query shape returns the ordered set`, async () => {
      const ids = await withDb(entry.run);
      assert.deepEqual(ids, entry.expect);
    });
  }

  await t.test("I-12 cooldown sweep uses the automatic single-field index", async () => {
    const ids = await withDb((db) =>
      idsOf(
        db,
        collection(db, "users/index-user/quizState"),
        where("cooldownUntil", ">", T0),
        orderBy("cooldownUntil", "asc")
      )
    );
    assert.deepEqual(ids, ["qs-01", "qs-02"]);
  });
});
