/**
 * N3-02 - Approved-content read path conformance.
 *
 * D-09: the Flutter client reads approved content with the Firebase client
 * SDK under the N2-04 rules. This suite executes the documented read
 * sequences as a guest and as two signed-in students, against the real
 * `firestore.rules`, in the private namespace demo-networking-contentread.
 *
 * It proves:
 *  - version resolution through system/publishedContentVersion;
 *  - the six-course catalog is public and ordered (all courses);
 *  - course-01 lessons/quizzes are public; later courses are gated;
 *  - an unlocked course-02 is readable, a locked course-03 is not;
 *  - banks, AI sections, checkpoint keys, and writes stay denied;
 *  - every returned item carries the active contentVersion;
 *  - a missing pointer fails closed.
 *
 * Prerequisite: Firestore emulator on 127.0.0.1:8080.
 */

import {test, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";

const here = dirname(fileURLToPath(import.meta.url));
const rulesPath = resolve(here, "..", "firestore.rules");

const PROJECT_ID = "demo-networking-contentread";
const RULES = readFileSync(rulesPath, "utf8");

const V = "v001";
const STAGING = "v002";
const UID_FREE = "student-free";
const UID_UNLOCKED = "student-unlocked";

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: RULES,
  },
});

after(async () => {
  await env.clearFirestore();
  await env.cleanup();
});

const guestDb = env.unauthenticatedContext().firestore();
const freeDb = env.authenticatedContext(UID_FREE).firestore();
const unlockedDb = env.authenticatedContext(UID_UNLOCKED).firestore();

const COURSE_IDS = [
  "course-01",
  "course-02",
  "course-03",
  "course-04",
  "course-05",
  "course-06",
];

/**
 * Builds the canonical catalog query.
 *
 * @param {object} db - Firestore client.
 * @return {object} Query over all courses ordered by `order`.
 */
function catalogQuery(db) {
  return query(
    collection(db, `contentVersions/${V}/courses`),
    orderBy("order")
  );
}

/**
 * Builds the canonical lesson-list query for one course (index I-02).
 *
 * @param {object} db - Firestore client.
 * @param {string} courseId - Course ID.
 * @return {object} Ordered lesson query.
 */
function lessonsQuery(db, courseId) {
  return query(
    collection(db, `contentVersions/${V}/courses/${courseId}/lessons`),
    where("courseId", "==", courseId),
    orderBy("order")
  );
}

/**
 * Builds the canonical lesson-quiz list query (index I-01).
 *
 * @param {object} db - Firestore client.
 * @param {string} courseId - Course ID.
 * @return {object} Ordered lesson-quiz query.
 */
function lessonQuizzesQuery(db, courseId) {
  return query(
    collection(db, `contentVersions/${V}/quizzes`),
    where("courseId", "==", courseId),
    where("type", "==", "lesson"),
    orderBy("order")
  );
}

/**
 * Seeds the private content-read namespace.
 *
 * @return {Promise<void>} Resolves when seeding is complete.
 */
async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "system/publishedContentVersion"), {
      contentVersion: V,
      formatVersion: 1,
      status: "published",
    });

    await setDoc(doc(db, `contentVersions/${V}`), {
      contentVersion: V,
      formatVersion: 1,
      status: "published",
      courseCount: 6,
      lessonCount: 12,
    });

    await setDoc(doc(db, `contentVersions/${STAGING}`), {
      contentVersion: STAGING,
      formatVersion: 1,
      status: "staging",
      courseCount: 1,
      lessonCount: 1,
    });

    await setDoc(doc(db, `contentVersions/${STAGING}/courses/course-01`), {
      courseId: "course-01",
      order: 1,
      title: {en: "Staged course", ar: "Staged course"},
      contentVersion: STAGING,
    });

    await setDoc(
      doc(db, `contentVersions/${STAGING}/courses/course-01/lessons/lesson-01-01`),
      {
        lessonId: "lesson-01-01",
        courseId: "course-01",
        order: 1,
        title: {en: "Staged lesson", ar: "Staged lesson"},
        contentVersion: STAGING,
      }
    );

    await setDoc(doc(db, `users/${UID_FREE}`), {
      uid: UID_FREE,
      role: "student",
      status: "active",
    });

    await setDoc(doc(db, `users/${UID_UNLOCKED}`), {
      uid: UID_UNLOCKED,
      role: "student",
      status: "active",
    });

    await setDoc(doc(db, `users/${UID_UNLOCKED}/courseProgress/course-01`), {
      courseId: "course-01",
      status: "completed",
      contentVersion: V,
    });

    await setDoc(doc(db, `users/${UID_UNLOCKED}/courseProgress/course-02`), {
      courseId: "course-02",
      status: "inProgress",
      contentVersion: V,
    });

    await setDoc(doc(db, `users/${UID_UNLOCKED}/courseProgress/course-03`), {
      courseId: "course-03",
      status: "locked",
      contentVersion: V,
    });

    for (let index = 1; index <= 6; index += 1) {
      const courseId = `course-0${index}`;

      await setDoc(doc(db, `contentVersions/${V}/courses/${courseId}`), {
        courseId,
        order: index,
        title: {en: `Course ${index}`, ar: `Course ${index}`},
        description: {en: `Description ${index}`, ar: `Description ${index}`},
        finalQuizId: `quiz-c0${index}-final`,
        status: "approved",
        contentVersion: V,
      });

      for (let lessonOrder = 1; lessonOrder <= 2; lessonOrder += 1) {
        const lessonId = `lesson-0${index}-0${lessonOrder}`;
        const lessonQuizId = `quiz-c0${index}-l0${lessonOrder}`;

        await setDoc(
          doc(db, `contentVersions/${V}/courses/${courseId}/lessons/${lessonId}`),
          {
            lessonId,
            courseId,
            order: lessonOrder,
            title: {
              en: `Lesson ${index}.${lessonOrder}`,
              ar: `Lesson ${index}.${lessonOrder}`,
            },
            summary: {
              en: `Summary ${index}.${lessonOrder}`,
              ar: `Summary ${index}.${lessonOrder}`,
            },
            status: "approved",
            contentVersion: V,
          }
        );

        await setDoc(doc(db, `contentVersions/${V}/quizzes/${lessonQuizId}`), {
          quizId: lessonQuizId,
          type: "lesson",
          courseId,
          lessonId,
          order: lessonOrder,
          title: {
            en: `Quiz ${index}.${lessonOrder}`,
            ar: `Quiz ${index}.${lessonOrder}`,
          },
          contentVersion: V,
        });
      }

      await setDoc(
        doc(db, `contentVersions/${V}/quizzes/quiz-c0${index}-final`),
        {
          quizId: `quiz-c0${index}-final`,
          type: "final",
          courseId,
          lessonId: null,
          order: 999,
          title: {en: `Final ${index}`, ar: `Final ${index}`},
          contentVersion: V,
        }
      );
    }

    await setDoc(doc(db, `contentVersions/${V}/quizBanks/quiz-c01-l01`), {
      quizId: "quiz-c01-l01",
      courseId: "course-01",
    });

    await setDoc(
      doc(db, `contentVersions/${V}/quizBanks/quiz-c01-l01/questions/q01`),
      {
        questionId: "q01",
        correctOptionIds: ["a"],
      }
    );

    await setDoc(doc(db, `contentVersions/${V}/aiSections/sec-01`), {
      sectionId: "sec-01",
      courseId: "course-01",
      approved: true,
    });

    await setDoc(
      doc(
        db,
        `contentVersions/${V}/courses/course-01/lessons/lesson-01-01/private/checkpointKey`
      ),
      {
        correctOptionId: "a",
      }
    );
  });
}

await seed();

test("N3-02 approved-content read path", async (t) => {
  await t.test("guest resolves the active content version", async () => {
    const snapshot = await getDoc(
      doc(guestDb, "system/publishedContentVersion")
    );

    assert.equal(snapshot.exists(), true);
    assert.equal(snapshot.data().contentVersion, V);
    assert.equal(snapshot.data().formatVersion, 1);
  });

  await t.test("active version metadata is published and complete", async () => {
    const snapshot = await getDoc(doc(guestDb, `contentVersions/${V}`));

    assert.equal(snapshot.data().status, "published");
    assert.equal(snapshot.data().formatVersion, 1);
    assert.equal(snapshot.data().courseCount, 6);
    assert.equal(snapshot.data().lessonCount, 12);
  });

  await t.test("guest cannot read a staging version", async () => {
    await assertFails(getDoc(doc(guestDb, `contentVersions/${STAGING}`)));
  });

  await t.test("guest cannot read a guessed archived version", async () => {
    await assertFails(getDoc(doc(guestDb, "contentVersions/v999")));
  });

  await t.test("guest lists the six-course catalog in order", async () => {
    const snapshot = await getDocs(catalogQuery(guestDb));

    assert.equal(snapshot.size, 6);
    assert.deepEqual(
      snapshot.docs.map((entry) => entry.id),
      COURSE_IDS
    );
    assert.deepEqual(
      snapshot.docs.map((entry) => entry.data().order),
      [1, 2, 3, 4, 5, 6]
    );
  });

  await t.test("catalog items carry the active content version", async () => {
    const snapshot = await getDocs(catalogQuery(guestDb));

    for (const entry of snapshot.docs) {
      assert.equal(entry.data().contentVersion, V);
      assert.equal(entry.data().status, "approved");
      assert.match(entry.data().finalQuizId, /^quiz-c0[1-6]-final$/);
    }
  });

  await t.test("guest reads one course document directly", async () => {
    const snapshot = await getDoc(
      doc(guestDb, `contentVersions/${V}/courses/course-01`)
    );

    assert.equal(snapshot.data().courseId, "course-01");
    assert.equal(snapshot.data().finalQuizId, "quiz-c01-final");
  });

  await t.test("guest cannot list staging courses", async () => {
    await assertFails(
      getDocs(
        query(
          collection(guestDb, `contentVersions/${STAGING}/courses`),
          orderBy("order")
        )
      )
    );
  });

  await t.test("guest cannot read a staging course document", async () => {
    await assertFails(
      getDoc(
        doc(guestDb, `contentVersions/${STAGING}/courses/course-01`)
      )
    );
  });

  await t.test("guest lists course-01 lessons in order", async () => {
    const snapshot = await getDocs(lessonsQuery(guestDb, "course-01"));

    assert.equal(snapshot.size, 2);
    assert.deepEqual(
      snapshot.docs.map((entry) => entry.id),
      ["lesson-01-01", "lesson-01-02"]
    );
    assert.deepEqual(
      snapshot.docs.map((entry) => entry.data().order),
      [1, 2]
    );
  });

  await t.test("guest reads one course-01 lesson", async () => {
    const snapshot = await getDoc(
      doc(guestDb, `contentVersions/${V}/courses/course-01/lessons/lesson-01-01`)
    );

    assert.equal(snapshot.data().lessonId, "lesson-01-01");
    assert.equal(snapshot.data().courseId, "course-01");
  });

  await t.test("guest lists course-01 lesson quizzes in order", async () => {
    const snapshot = await getDocs(lessonQuizzesQuery(guestDb, "course-01"));

    assert.equal(snapshot.size, 2);
    assert.deepEqual(
      snapshot.docs.map((entry) => entry.id),
      ["quiz-c01-l01", "quiz-c01-l02"]
    );

    for (const entry of snapshot.docs) {
      assert.equal(entry.data().type, "lesson");
      assert.equal(entry.data().courseId, "course-01");
    }
  });

  await t.test("guest reads the final quiz through finalQuizId", async () => {
    const course = await getDoc(
      doc(guestDb, `contentVersions/${V}/courses/course-01`)
    );
    const finalQuiz = await getDoc(
      doc(
        guestDb,
        `contentVersions/${V}/quizzes/${course.data().finalQuizId}`
      )
    );

    assert.equal(finalQuiz.data().type, "final");
    assert.equal(finalQuiz.data().lessonId, null);
  });

  await t.test("guest lists course-01 lessons by path without a filter",
    async () => {
      // Lessons are path-scoped, so `courseId` is known to the rules from the
      // document path. This query is valid and needs no `where` clause.
      const snapshot = await getDocs(
        query(
          collection(
            guestDb,
            `contentVersions/${V}/courses/course-01/lessons`
          ),
          orderBy("order")
        )
      );

      assert.equal(snapshot.size, 2);
      assert.deepEqual(
        snapshot.docs.map((entry) => entry.id),
        ["lesson-01-01", "lesson-01-02"]
      );
    });

  await t.test("a collection-group lesson query fails closed", async () => {
    // In a collection-group query the course is not in the path, and the rule
    // needs a concrete courseId, so the whole query is denied.
    await assertFails(
      getDocs(
        query(collectionGroup(guestDb, "lessons"), orderBy("order"))
      )
    );
  });

  await t.test("guest cannot read a checkpoint private key", async () => {
    await assertFails(
      getDoc(
        doc(
          guestDb,
          `contentVersions/${V}/courses/course-01/lessons/lesson-01-01/private/checkpointKey`
        )
      )
    );
  });

  await t.test("guest cannot list course-02 lessons", async () => {
    await assertFails(getDocs(lessonsQuery(guestDb, "course-02")));
  });

  await t.test("guest cannot read a course-02 lesson", async () => {
    await assertFails(
      getDoc(
        doc(guestDb, `contentVersions/${V}/courses/course-02/lessons/lesson-02-01`)
      )
    );
  });

  await t.test("guest cannot list course-02 quizzes", async () => {
    await assertFails(getDocs(lessonQuizzesQuery(guestDb, "course-02")));
  });

  await t.test("a student without progress cannot read course-02", async () => {
    await assertFails(
      getDoc(
        doc(freeDb, `contentVersions/${V}/courses/course-02/lessons/lesson-02-01`)
      )
    );
  });

  await t.test("a student without progress cannot list course-02 lessons",
    async () => {
      await assertFails(getDocs(lessonsQuery(freeDb, "course-02")));
    });

  await t.test("an unlocked student lists course-02 lessons", async () => {
    const snapshot = await getDocs(lessonsQuery(unlockedDb, "course-02"));

    assert.equal(snapshot.size, 2);
    assert.deepEqual(
      snapshot.docs.map((entry) => entry.id),
      ["lesson-02-01", "lesson-02-02"]
    );
  });

  await t.test("an unlocked student lists course-02 quizzes", async () => {
    const snapshot = await getDocs(
      lessonQuizzesQuery(unlockedDb, "course-02")
    );

    assert.equal(snapshot.size, 2);
    assert.equal(snapshot.docs[0].data().courseId, "course-02");
  });

  await t.test("a locked course-03 still denies the unlocked student",
    async () => {
      await assertFails(getDocs(lessonsQuery(unlockedDb, "course-03")));
      await assertFails(
        getDoc(
          doc(
            unlockedDb,
            `contentVersions/${V}/courses/course-03/lessons/lesson-03-01`
          )
        )
      );
    });

  await t.test("guest cannot read a bank question", async () => {
    await assertFails(
      getDoc(
        doc(
          guestDb,
          `contentVersions/${V}/quizBanks/quiz-c01-l01/questions/q01`
        )
      )
    );
  });

  await t.test("student cannot read a bank question", async () => {
    await assertFails(
      getDoc(
        doc(
          unlockedDb,
          `contentVersions/${V}/quizBanks/quiz-c01-l01/questions/q01`
        )
      )
    );
  });

  await t.test("student cannot read AI sections", async () => {
    await assertFails(
      getDoc(doc(unlockedDb, `contentVersions/${V}/aiSections/sec-01`))
    );
  });

  await t.test("student reads own progress but not another student's",
    async () => {
      const own = await getDoc(
        doc(unlockedDb, `users/${UID_UNLOCKED}/courseProgress/course-02`)
      );
      assert.equal(own.data().status, "inProgress");

      await assertFails(
        getDoc(doc(unlockedDb, `users/${UID_FREE}/courseProgress/course-02`))
      );
    });

  await t.test("every canonical item matches the active contentVersion",
    async () => {
      const pointer = await getDoc(
        doc(guestDb, "system/publishedContentVersion")
      );
      const active = pointer.data().contentVersion;

      const batches = [
        await getDocs(catalogQuery(guestDb)),
        await getDocs(lessonsQuery(guestDb, "course-01")),
        await getDocs(lessonQuizzesQuery(guestDb, "course-01")),
        await getDocs(lessonsQuery(unlockedDb, "course-02")),
      ];

      for (const snapshot of batches) {
        assert.ok(snapshot.size > 0, "a canonical read returned no documents");
        for (const entry of snapshot.docs) {
          assert.equal(entry.data().contentVersion, active);
        }
      }
    });

  await t.test("an unconstrained quiz list fails closed for an unlocked student",
    async () => {
      await assertFails(
        getDocs(
          query(
            collection(unlockedDb, `contentVersions/${V}/quizzes`),
            orderBy("order")
          )
        )
      );
    });

  await t.test("a missing pointer denies all content (fail-closed)", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(
        doc(context.firestore(), "system/publishedContentVersion")
      );
    });

    try {
      await assertFails(getDocs(catalogQuery(guestDb)));
      await assertFails(getDocs(lessonsQuery(guestDb, "course-01")));
    } finally {
      await env.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), "system/publishedContentVersion"),
          {
            contentVersion: V,
            formatVersion: 1,
            status: "published",
          }
        );
      });
    }
  });

  await t.test("an unlocked student cannot read a non-active version lesson",
    async () => {
      await assertFails(
        getDoc(
          doc(
            unlockedDb,
            `contentVersions/${STAGING}/courses/course-01/lessons/lesson-01-01`
          )
        )
      );
    });

  await t.test("clients cannot write content or progress", async () => {
    await assertFails(
      setDoc(
        doc(guestDb, `contentVersions/${V}/courses/course-01`),
        {order: 99}
      )
    );
    await assertFails(
      setDoc(
        doc(guestDb, `users/${UID_FREE}/courseProgress/course-01`),
        {status: "completed"}
      )
    );
    await assertFails(
      setDoc(
        doc(unlockedDb, `users/${UID_UNLOCKED}/courseProgress/course-03`),
        {status: "inProgress"}
      )
    );
  });
});
