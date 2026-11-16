/**
 * N2-05 — durable Firestore rules suite.
 *
 * Positive, negative, and ownership-attack coverage for backend/firestore.rules.
 * Runs in its own emulator project namespace ("demo-networking-rules") so it
 * never reads, clears, or collides with the demo-networking-p1 fixtures.
 *
 * Prerequisite: Firestore emulator on 127.0.0.1:8080.
 */

import {test, after} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";

import {
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";

const here = dirname(fileURLToPath(import.meta.url));
const rulesPath = resolve(here, "..", "firestore.rules");

const PROJECT_ID = "demo-networking-rules";

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: readFileSync(rulesPath, "utf8"),
  },
});

after(async () => {
  await env.clearFirestore();
  await env.cleanup();
});

const TS = Timestamp.fromDate(new Date("2026-11-16T00:00:00Z"));

function profile(uid, role, status) {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: `Fixture ${uid}`,
    preferredLanguage: "en",
    role,
    status,
    createdAt: TS,
    updatedAt: TS,
  };
}

async function seed() {
  await env.clearFirestore();

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const write = (path, data) => setDoc(doc(db, path), data);

    await write("system/publishedContentVersion", {
      contentVersion: "v001",
      previousContentVersion: null,
      formatVersion: 1,
      checksum: "rules-fixture",
      publishedAt: TS,
      publishedBy: "fixture-admin",
      status: "published",
    });

    await write("contentVersions/v001", {
      contentVersion: "v001",
      formatVersion: 1,
      status: "published",
      courseCount: 6,
      lessonCount: 12,
      checksum: "rules-fixture",
      createdAt: TS,
      createdBy: "fixture-admin",
      publishedAt: TS,
      publishedBy: "fixture-admin",
      archivedAt: null,
      rollbackOf: null,
      validation: {ok: true, errors: [], validatedAt: TS},
    });
    await write("contentVersions/v002", {
      contentVersion: "v002",
      formatVersion: 1,
      status: "staging",
      courseCount: 6,
      lessonCount: 12,
      checksum: "rules-staging",
      createdAt: TS,
      createdBy: "fixture-admin",
      publishedAt: null,
      publishedBy: null,
      archivedAt: null,
      rollbackOf: null,
      validation: {ok: false, errors: ["staging"], validatedAt: TS},
    });
    await write("contentVersions/v003", {
      contentVersion: "v003",
      formatVersion: 1,
      status: "archived",
      courseCount: 6,
      lessonCount: 12,
      checksum: "rules-archived",
      createdAt: TS,
      createdBy: "fixture-admin",
      publishedAt: TS,
      publishedBy: "fixture-admin",
      archivedAt: TS,
      rollbackOf: null,
      validation: {ok: true, errors: [], validatedAt: TS},
    });

    for (const n of ["01", "02", "03"]) {
      await write(`contentVersions/v001/courses/course-${n}`, {
        courseId: `course-${n}`,
        order: Number(n),
        title: {en: `Course ${n}`, ar: `مقرر ${n}`},
        description: {en: "Rules fixture", ar: "بيانات قواعد"},
        estimatedMinutes: 90,
        lessonCount: 2,
        finalQuizId: `quiz-c${n}-final`,
        status: "approved",
        contentVersion: "v001",
        createdAt: TS,
        updatedAt: TS,
      });

      for (const l of ["01", "02"]) {
        await write(
          `contentVersions/v001/courses/course-${n}/lessons/lesson-${n}-${l}`,
          {
            lessonId: `lesson-${n}-${l}`,
            courseId: `course-${n}`,
            order: Number(l),
            title: {en: `Lesson ${n}-${l}`, ar: `درس ${n}-${l}`},
            summary: {en: "Rules fixture", ar: "بيانات قواعد"},
            estimatedMinutes: 20,
            sections: [],
            checkpoint: {checkpointId: "cp-01", options: []},
            quizId: `quiz-c${n}-l${l}`,
            status: "approved",
            contentVersion: "v001",
            updatedAt: TS,
          }
        );
      }

      await write(`contentVersions/v001/quizzes/quiz-c${n}-l01`, {
        quizId: `quiz-c${n}-l01`,
        type: "lesson",
        courseId: `course-${n}`,
        lessonId: `lesson-${n}-01`,
        order: 1,
        timeLimitMinutes: 15,
        questionCount: 10,
        passingScore: 7,
        passingPercent: 70,
        status: "approved",
        contentVersion: "v001",
      });
    }

    await write(
      "contentVersions/v001/courses/course-01/lessons/lesson-01-01/private/checkpointKey",
      {
        checkpointId: "cp-01",
        correctOptionId: "a",
        explanation: {en: "Secret", ar: "سر"},
        updatedAt: TS,
      }
    );
    await write("contentVersions/v001/quizBanks/quiz-c01-l01", {
      quizId: "quiz-c01-l01",
      type: "lesson",
      courseId: "course-01",
      questionCount: 12,
    });
    await write("contentVersions/v001/quizBanks/quiz-c01-l01/questions/q001", {
      questionId: "q001",
      prompt: {en: "Question", ar: "سؤال"},
      options: [],
      correctOptionIds: ["a"],
      explanation: {en: "Secret", ar: "سر"},
    });
    await write("contentVersions/v001/aiSections/ai-c01-l01-001", {
      sectionId: "ai-c01-l01-001",
      courseId: "course-01",
      lessonId: "lesson-01-01",
      approved: true,
      heading: "Approved source",
      body: "Approved AI source body.",
    });

    await write("contentVersions/v002/courses/course-01", {
      courseId: "course-01",
      order: 1,
      title: {en: "Draft", ar: "مسودة"},
      contentVersion: "v002",
    });
    await write(
      "contentVersions/v002/courses/course-01/lessons/lesson-01-01",
      {
        lessonId: "lesson-01-01",
        courseId: "course-01",
        contentVersion: "v002",
        sections: [],
      }
    );

    await write(
      "users/fixture-student-01",
      profile("fixture-student-01", "student", "active")
    );
    await write(
      "users/fixture-student-02",
      profile("fixture-student-02", "student", "active")
    );
    await write(
      "users/fixture-no-progress",
      profile("fixture-no-progress", "student", "active")
    );
    await write(
      "users/fixture-disabled",
      profile("fixture-disabled", "student", "disabled")
    );
    await write(
      "users/fixture-admin",
      profile("fixture-admin", "admin", "active")
    );

    await write("users/fixture-student-01/courseProgress/course-01", {
      courseId: "course-01",
      order: 1,
      status: "completed",
    });
    await write("users/fixture-student-01/courseProgress/course-02", {
      courseId: "course-02",
      order: 2,
      status: "unlocked",
    });
    await write("users/fixture-student-01/courseProgress/course-03", {
      courseId: "course-03",
      order: 3,
      status: "locked",
    });
    await write("users/fixture-student-01/lessonProgress/lesson-01-01", {
      lessonId: "lesson-01-01",
      courseId: "course-01",
      isCompleted: true,
    });
    await write("users/fixture-student-01/attempts/a1", {
      attemptId: "a1",
      uid: "fixture-student-01",
      status: "finalized",
    });
    await write("users/fixture-student-01/quizState/quiz-c01-l01", {
      quizId: "quiz-c01-l01",
      totalAttempts: 1,
    });
    await write("users/fixture-student-01/idempotency/k1", {
      operation: "startQuiz",
    });

    await write("users/fixture-student-02/courseProgress/course-01", {
      courseId: "course-01",
      order: 1,
      status: "inProgress",
    });
    await write("users/fixture-student-02/lessonProgress/lesson-01-01", {
      lessonId: "lesson-01-01",
      courseId: "course-01",
      isCompleted: false,
    });
    await write("users/fixture-student-02/attempts/a2", {
      attemptId: "a2",
      uid: "fixture-student-02",
      status: "active",
    });

    await write("accountTombstones/fixture-deleted", {
      uid: "fixture-deleted",
      status: "purged",
    });
    await write("adminAudit/e1", {
      eventId: "e1",
      action: "publishContent",
      actorUid: "fixture-admin",
    });
  });
}

test("N2-05 Firestore rules", async (t) => {
  await seed();

  const guestDb = env.unauthenticatedContext().firestore();
  const studentDb = env
    .authenticatedContext("fixture-student-01", {role: "student"})
    .firestore();
  const student2Db = env
    .authenticatedContext("fixture-student-02", {role: "student"})
    .firestore();
  const noProgressDb = env
    .authenticatedContext("fixture-no-progress", {role: "student"})
    .firestore();
  const disabledDb = env
    .authenticatedContext("fixture-disabled", {role: "student"})
    .firestore();
  const adminDb = env
    .authenticatedContext("fixture-admin", {role: "admin"})
    .firestore();

  const read = (db, path) => getDoc(doc(db, path));
  const readList = (db, path) => getDocs(collection(db, path));
  const update = (db, path, data) => updateDoc(doc(db, path), data);
  const create = (db, path, data) => setDoc(doc(db, path), data);
  const remove = (db, path) => deleteDoc(doc(db, path));

  // ---- Guest: active content surface -------------------------------------

  await t.test("guest reads the active pointer", async () => {
    await assertSucceeds(read(guestDb, "system/publishedContentVersion"));
  });

  await t.test("guest reads the active version", async () => {
    await assertSucceeds(read(guestDb, "contentVersions/v001"));
  });

  await t.test("guest cannot read a staging version", async () => {
    await assertFails(read(guestDb, "contentVersions/v002"));
  });

  await t.test("guest cannot read an archived version", async () => {
    await assertFails(read(guestDb, "contentVersions/v003"));
  });

  await t.test("guest reads active course metadata", async () => {
    await assertSucceeds(
      read(guestDb, "contentVersions/v001/courses/course-01")
    );
  });

  await t.test("guest reads locked course metadata", async () => {
    await assertSucceeds(
      read(guestDb, "contentVersions/v001/courses/course-03")
    );
  });

  await t.test("guest lists active course metadata", async () => {
    await assertSucceeds(readList(guestDb, "contentVersions/v001/courses"));
  });

  await t.test("guest cannot list staging course metadata", async () => {
    await assertFails(readList(guestDb, "contentVersions/v002/courses"));
  });

  await t.test("guest reads a course-01 lesson", async () => {
    await assertSucceeds(
      read(
        guestDb,
        "contentVersions/v001/courses/course-01/lessons/lesson-01-01"
      )
    );
  });

  await t.test("guest lists course-01 lessons", async () => {
    await assertSucceeds(
      readList(guestDb, "contentVersions/v001/courses/course-01/lessons")
    );
  });

  await t.test("guest cannot read a course-02 lesson", async () => {
    await assertFails(
      read(
        guestDb,
        "contentVersions/v001/courses/course-02/lessons/lesson-02-01"
      )
    );
  });

  await t.test("guest cannot list course-02 lessons", async () => {
    await assertFails(
      readList(guestDb, "contentVersions/v001/courses/course-02/lessons")
    );
  });

  await t.test("guest reads a course-01 quiz", async () => {
    await assertSucceeds(
      read(guestDb, "contentVersions/v001/quizzes/quiz-c01-l01")
    );
  });

  await t.test("guest lists course-01 quizzes", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(guestDb, "contentVersions/v001/quizzes"),
          where("courseId", "==", "course-01")
        )
      )
    );
  });

  await t.test("guest cannot list quizzes without a course filter", async () => {
    // resource.data is unavailable to unconstrained list rules, so this
    // fails closed. Clients use the indexed courseId query above.
    await assertFails(readList(guestDb, "contentVersions/v001/quizzes"));
  });

  await t.test("guest cannot read a course-02 quiz", async () => {
    await assertFails(
      read(guestDb, "contentVersions/v001/quizzes/quiz-c02-l01")
    );
  });

  await t.test("guest cannot read a staging lesson", async () => {
    await assertFails(
      read(
        guestDb,
        "contentVersions/v002/courses/course-01/lessons/lesson-01-01"
      )
    );
  });

  // ---- Guest: secrets and private state ----------------------------------

  await t.test("guest cannot read the checkpoint key", async () => {
    await assertFails(
      read(
        guestDb,
        "contentVersions/v001/courses/course-01/lessons/lesson-01-01/private/checkpointKey"
      )
    );
  });

  await t.test("guest cannot read bank metadata", async () => {
    await assertFails(
      read(guestDb, "contentVersions/v001/quizBanks/quiz-c01-l01")
    );
  });

  await t.test("guest cannot read a bank question", async () => {
    await assertFails(
      read(
        guestDb,
        "contentVersions/v001/quizBanks/quiz-c01-l01/questions/q001"
      )
    );
  });

  await t.test("guest cannot read AI source sections", async () => {
    await assertFails(
      read(guestDb, "contentVersions/v001/aiSections/ai-c01-l01-001")
    );
  });

  await t.test("guest cannot read a user profile", async () => {
    await assertFails(read(guestDb, "users/fixture-student-01"));
  });

  await t.test("guest cannot list users", async () => {
    await assertFails(readList(guestDb, "users"));
  });

  await t.test("guest cannot read a tombstone", async () => {
    await assertFails(
      read(guestDb, "accountTombstones/fixture-deleted")
    );
  });

  await t.test("guest cannot read an audit event", async () => {
    await assertFails(read(guestDb, "adminAudit/e1"));
  });

  // ---- Guest: writes ------------------------------------------------------

  await t.test("guest cannot write the active pointer", async () => {
    await assertFails(
      create(guestDb, "system/publishedContentVersion", {
        contentVersion: "v999",
      })
    );
  });

  await t.test("guest cannot create a profile", async () => {
    await assertFails(
      create(guestDb, "users/guest", profile("guest", "student", "active"))
    );
  });

  await t.test("guest cannot write content", async () => {
    await assertFails(
      update(guestDb, "contentVersions/v001/courses/course-01", {
        title: {en: "Hijacked", ar: "مخترق"},
      })
    );
  });

  await t.test("guest cannot create progress", async () => {
    await assertFails(
      create(guestDb, "users/guest/courseProgress/course-01", {
        courseId: "course-01",
        status: "completed",
      })
    );
  });

  // ---- Student: own profile ---------------------------------------------

  await t.test("student reads own profile", async () => {
    await assertSucceeds(read(studentDb, "users/fixture-student-01"));
  });

  await t.test("student cannot read another profile", async () => {
    await assertFails(read(studentDb, "users/fixture-student-02"));
  });

  await t.test("student cannot read other users through a list", async () => {
    await assertFails(readList(studentDb, "users"));
  });

  await t.test("student updates own displayName", async () => {
    await assertSucceeds(
      update(studentDb, "users/fixture-student-01", {
        displayName: "Updated Student",
      })
    );
  });

  await t.test("student updates own preferredLanguage", async () => {
    await assertSucceeds(
      update(studentDb, "users/fixture-student-01", {
        preferredLanguage: "ar",
      })
    );
  });

  await t.test("student may use an 80-character displayName", async () => {
    await assertSucceeds(
      update(studentDb, "users/fixture-student-01", {
        displayName: "x".repeat(80),
      })
    );
  });

  await t.test("student cannot escalate role", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {role: "admin"})
    );
  });

  await t.test("student cannot change status", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {status: "disabled"})
    );
  });

  await t.test("student cannot change email", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {
        email: "attacker@example.test",
      })
    );
  });

  await t.test("student cannot change uid", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {uid: "fixture-admin"})
    );
  });

  await t.test("student cannot change updatedAt", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {
        updatedAt: Timestamp.fromDate(new Date("2030-01-01T00:00:00Z")),
      })
    );
  });

  await t.test("student cannot add an unknown profile field", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {isAdmin: true})
    );
  });

  await t.test("student cannot use an 81-character displayName", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {
        displayName: "x".repeat(81),
      })
    );
  });

  await t.test("student cannot send a non-string displayName", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {displayName: 42})
    );
  });

  await t.test("student cannot use an unsupported language", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {
        preferredLanguage: "fr",
      })
    );
  });

  await t.test("student cannot remove preferredLanguage", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01", {
        preferredLanguage: deleteField(),
      })
    );
  });

  await t.test("student cannot update another profile", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-02", {
        displayName: "Hijacked",
      })
    );
  });

  await t.test("student cannot delete own profile", async () => {
    await assertFails(remove(studentDb, "users/fixture-student-01"));
  });

  // ---- Student: own progress, server-only state --------------------------

  await t.test("student reads own courseProgress", async () => {
    await assertSucceeds(
      read(studentDb, "users/fixture-student-01/courseProgress/course-01")
    );
  });

  await t.test("student reads own lessonProgress", async () => {
    await assertSucceeds(
      read(studentDb, "users/fixture-student-01/lessonProgress/lesson-01-01")
    );
  });

  await t.test("student cannot read another courseProgress", async () => {
    await assertFails(
      read(studentDb, "users/fixture-student-02/courseProgress/course-01")
    );
  });

  await t.test("student cannot read another lessonProgress", async () => {
    await assertFails(
      read(studentDb, "users/fixture-student-02/lessonProgress/lesson-01-01")
    );
  });

  await t.test("student cannot write own courseProgress", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-01/courseProgress/course-01", {
        status: "locked",
      })
    );
  });

  await t.test("student cannot create own courseProgress", async () => {
    await assertFails(
      create(studentDb, "users/fixture-student-01/courseProgress/course-04", {
        courseId: "course-04",
        status: "completed",
      })
    );
  });

  await t.test("student cannot read own attempts", async () => {
    await assertFails(
      read(studentDb, "users/fixture-student-01/attempts/a1")
    );
  });

  await t.test("student cannot write own attempts", async () => {
    await assertFails(
      create(studentDb, "users/fixture-student-01/attempts/a9", {
        attemptId: "a9",
        status: "finalized",
      })
    );
  });

  await t.test("student cannot read another user's attempts", async () => {
    await assertFails(
      read(studentDb, "users/fixture-student-02/attempts/a2")
    );
  });

  await t.test("student cannot read own quizState", async () => {
    await assertFails(
      read(studentDb, "users/fixture-student-01/quizState/quiz-c01-l01")
    );
  });

  await t.test("student cannot read own idempotency records", async () => {
    await assertFails(
      read(studentDb, "users/fixture-student-01/idempotency/k1")
    );
  });

  await t.test("student cannot write to another user's progress", async () => {
    await assertFails(
      update(studentDb, "users/fixture-student-02/courseProgress/course-01", {
        status: "completed",
      })
    );
  });

  // ---- Student: unlock gate ---------------------------------------------

  await t.test("student reads an unlocked course-02 lesson", async () => {
    await assertSucceeds(
      read(
        studentDb,
        "contentVersions/v001/courses/course-02/lessons/lesson-02-01"
      )
    );
  });

  await t.test("student lists unlocked course-02 lessons", async () => {
    await assertSucceeds(
      readList(studentDb, "contentVersions/v001/courses/course-02/lessons")
    );
  });

  await t.test("student reads an unlocked course-02 quiz", async () => {
    await assertSucceeds(
      read(studentDb, "contentVersions/v001/quizzes/quiz-c02-l01")
    );
  });

  await t.test("student lists unlocked course-02 quizzes", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(studentDb, "contentVersions/v001/quizzes"),
          where("courseId", "==", "course-02")
        )
      )
    );
  });

  await t.test("student cannot list locked course-03 quizzes", async () => {
    await assertFails(
      getDocs(
        query(
          collection(studentDb, "contentVersions/v001/quizzes"),
          where("courseId", "==", "course-03")
        )
      )
    );
  });

  await t.test("student cannot read a locked course-03 lesson", async () => {
    await assertFails(
      read(
        studentDb,
        "contentVersions/v001/courses/course-03/lessons/lesson-03-01"
      )
    );
  });

  await t.test("student cannot read a locked course-03 quiz", async () => {
    await assertFails(
      read(studentDb, "contentVersions/v001/quizzes/quiz-c03-l01")
    );
  });

  await t.test("student cannot read a staging lesson", async () => {
    await assertFails(
      read(
        studentDb,
        "contentVersions/v002/courses/course-01/lessons/lesson-01-01"
      )
    );
  });

  await t.test("student without progress reads course-01", async () => {
    await assertSucceeds(
      read(
        noProgressDb,
        "contentVersions/v001/courses/course-01/lessons/lesson-01-01"
      )
    );
  });

  await t.test("student without progress cannot read course-02", async () => {
    await assertFails(
      read(
        noProgressDb,
        "contentVersions/v001/courses/course-02/lessons/lesson-02-01"
      )
    );
  });

  await t.test("student-02 reads only the free course-01 lesson", async () => {
    await assertSucceeds(
      read(
        student2Db,
        "contentVersions/v001/courses/course-01/lessons/lesson-01-01"
      )
    );
  });

  await t.test("student-02 cannot read course-02", async () => {
    await assertFails(
      read(
        student2Db,
        "contentVersions/v001/courses/course-02/lessons/lesson-02-01"
      )
    );
  });

  // ---- Disabled owner ----------------------------------------------------

  await t.test("disabled student reads own profile", async () => {
    await assertSucceeds(read(disabledDb, "users/fixture-disabled"));
  });

  await t.test("disabled student cannot update own profile", async () => {
    await assertFails(
      update(disabledDb, "users/fixture-disabled", {
        displayName: "Nope",
      })
    );
  });

  // ---- Admin client (no Admin SDK bypass) --------------------------------

  await t.test("admin client reads own profile", async () => {
    await assertSucceeds(read(adminDb, "users/fixture-admin"));
  });

  await t.test("admin client cannot read another profile", async () => {
    await assertFails(read(adminDb, "users/fixture-student-01"));
  });

  await t.test("admin client cannot read adminAudit", async () => {
    await assertFails(read(adminDb, "adminAudit/e1"));
  });

  await t.test("admin client cannot read tombstones", async () => {
    await assertFails(read(adminDb, "accountTombstones/fixture-deleted"));
  });

  await t.test("admin client cannot read bank questions", async () => {
    await assertFails(
      read(adminDb, "contentVersions/v001/quizBanks/quiz-c01-l01/questions/q001")
    );
  });

  await t.test("admin client cannot escalate own role", async () => {
    await assertFails(
      update(adminDb, "users/fixture-admin", {role: "student"})
    );
  });

  // ---- Content is read-only for every client -----------------------------

  await t.test("student cannot write content", async () => {
    await assertFails(
      update(studentDb, "contentVersions/v001/courses/course-01", {
        title: {en: "Hijacked", ar: "مخترق"},
      })
    );
  });

  await t.test("student cannot delete content", async () => {
    await assertFails(
      remove(studentDb, "contentVersions/v001/courses/course-01")
    );
  });

  await t.test("student cannot read the checkpoint key", async () => {
    await assertFails(
      read(
        studentDb,
        "contentVersions/v001/courses/course-01/lessons/lesson-01-01/private/checkpointKey"
      )
    );
  });

  await t.test("student cannot write the checkpoint key", async () => {
    await assertFails(
      update(
        studentDb,
        "contentVersions/v001/courses/course-01/lessons/lesson-01-01/private/checkpointKey",
        {correctOptionId: "b"}
      )
    );
  });

  await t.test("student cannot read a bank question", async () => {
    await assertFails(
      read(
        studentDb,
        "contentVersions/v001/quizBanks/quiz-c01-l01/questions/q001"
      )
    );
  });

  await t.test("student cannot read AI source sections", async () => {
    await assertFails(
      read(studentDb, "contentVersions/v001/aiSections/ai-c01-l01-001")
    );
  });

  // ---- Ownership attacks and default deny --------------------------------

  await t.test("question banks are denied through a collection group", async () => {
    await assertFails(getDocs(collectionGroup(studentDb, "questions")));
  });

  await t.test("private documents are denied through a collection group", async () => {
    await assertFails(getDocs(collectionGroup(studentDb, "private")));
  });

  await t.test("broad lesson collection-group query is denied", async () => {
    await assertFails(getDocs(collectionGroup(guestDb, "lessons")));
  });

  await t.test("unknown collections are denied for reads", async () => {
    await assertFails(read(guestDb, "security_test/example"));
  });

  await t.test("unknown collections are denied for writes", async () => {
    await assertFails(
      create(guestDb, "security_test/example", {test: true})
    );
  });
});
