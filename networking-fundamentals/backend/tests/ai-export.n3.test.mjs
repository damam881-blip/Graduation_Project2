/**
 * N3-05 - approved AI knowledge exporter.
 *
 * The pure half proves that only approved lesson prose becomes an AI section
 * and that quiz IDs, checkpoint data, answer keys, and explanations are not
 * copied. The Firestore half uses the real firestore.rules in the private
 * namespace demo-networking-aiexport and calls the production Admin SDK
 * exporter, not a copy of it.
 *
 * Prerequisite: Firestore emulator on 127.0.0.1:8080.
 */

import {test, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {dirname, resolve} from "node:path";

import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";

import {doc, getDoc} from "firebase/firestore";

const require = createRequire(import.meta.url);
const aiExport = require("../functions/scripts/ai-export.cjs");

const here = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(here, "..", "firestore.rules"), "utf8");
const PROJECT_ID = "demo-networking-aiexport";
const VERSION = "v001";

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: RULES,
  },
});
const db = aiExport.getAdminDb({projectId: PROJECT_ID});
const guest = env.unauthenticatedContext().firestore();

const COURSE = {
  courseId: "course-01",
  order: 1,
  title: {en: "Networking Basics", ar: "أساسيات الشبكات"},
  description: {
    en: "Nodes, links, and the purpose of networks.",
    ar: "العقد والروابط والغرض من الشبكات.",
  },
  estimatedMinutes: 90,
  finalQuizId: "quiz-c01-final",
  lessonIds: ["lesson-01-01", "lesson-01-02"],
  status: "approved",
  contentVersion: VERSION,
};

const LESSONS = [
  {
    lessonId: "lesson-01-01",
    courseId: "course-01",
    order: 1,
    title: {en: "Nodes and Links", ar: "العقد والروابط"},
    summary: {
      en: "Devices exchange data over links.",
      ar: "تتبادل الأجهزة البيانات عبر الروابط.",
    },
    sections: [
      {
        sectionId: "sec-01",
        order: 1,
        type: "text",
        text: {
          en: "A **network** connects devices so they can share data.",
          ar: "تربط **الشبكة** الأجهزة لتبادل البيانات.",
        },
      },
      {
        sectionId: "sec-02",
        order: 2,
        type: "image",
        imageUrl: "https://example.test/network.svg",
        alt: {en: "Two connected nodes", ar: "عقدتان متصلتان"},
        caption: {en: "A simple link", ar: "رابط بسيط"},
      },
    ],
    checkpoint: {
      checkpointId: "cp-01",
      afterSectionId: "sec-01",
      question: {en: "Which node is central?", ar: "أي عقدة مركزية؟"},
      options: [{optionId: "a", text: {en: "The switch", ar: "المبدل"}}],
    },
    quizId: "quiz-c01-l01",
    status: "approved",
    contentVersion: VERSION,
  },
  {
    lessonId: "lesson-01-02",
    courseId: "course-01",
    order: 2,
    title: {en: "LAN and WAN", ar: "الشبكتان المحلية والواسعة"},
    summary: {
      en: "LANs cover small areas; WANs span regions.",
      ar: "تغطي الشبكات المحلية مساحات صغيرة والواسعة مناطق أوسع.",
    },
    sections: [
      {
        sectionId: "sec-01",
        order: 1,
        type: "example",
        text: {
          en: "A home `LAN` links computers in one building.",
          ar: "تربط الشبكة المحلية المنزلية حواسيب في مبنى واحد.",
        },
      },
    ],
    checkpoint: {
      checkpointId: "cp-02",
      afterSectionId: "sec-01",
      question: {en: "Which is a WAN?", ar: "أي شبكة واسعة؟"},
      options: [{optionId: "b", text: {en: "A city network", ar: "شبكة مدينة"}}],
    },
    quizId: "quiz-c01-l02",
    status: "approved",
    contentVersion: VERSION,
  },
];

after(async () => {
  await env.clearFirestore();
  await env.cleanup();
});

/**
 * Seeds one published version with two approved lessons.
 *
 * @return {Promise<void>} Resolves after all documents are written.
 */
async function seedPublished() {
  await env.clearFirestore();
  await db.doc("system/publishedContentVersion").set({
    contentVersion: VERSION,
    status: "published",
  });
  await db.doc(`contentVersions/${VERSION}`).set({
    contentVersion: VERSION,
    formatVersion: 1,
    status: "published",
    checksum: "published-checksum",
  });
  await db.doc(`contentVersions/${VERSION}/courses/course-01`).set(COURSE);
  for (const lesson of LESSONS) {
    await db.doc(
      `contentVersions/${VERSION}/courses/course-01/lessons/${lesson.lessonId}`,
    ).set(lesson);
  }
}

test("N3-05 approved AI knowledge exporter", async (t) => {
  await t.test("only approved lesson prose becomes a bilingual section", () => {
    const built = aiExport.buildAiSections({
      courses: [COURSE],
      lessons: LESSONS,
      version: VERSION,
    });
    assert.equal(built.ok, true, JSON.stringify(built.errors));
    assert.deepEqual(built.counts, {courses: 1, lessons: 2, sections: 4});
    assert.deepEqual(built.entries.map(([path]) => path.split("/").pop()).sort(), [
      "ai-c01-l01-001",
      "ai-c01-l01-002",
      "ai-c01-l02-001",
      "ai-c01-l02-002",
    ]);
    assert.deepEqual(
      built.entries.map(([, document]) => document.order).sort((a, b) => a - b),
      [1, 2, 3, 4],
    );

    const forbidden = [
      "quiz-c01",
      "finalQuizId",
      "checkpoint",
      "correctOptionId",
      "correctAnswer",
      "explanation",
    ];
    for (const [path, document] of built.entries) {
      const text = JSON.stringify(document);
      for (const token of forbidden) {
        assert.equal(text.includes(token), false, `${path} leaks ${token}`);
      }
      assert.equal(document.approved, true);
      assert.equal(document.checksum.length, 64);
      assert.ok(["en", "ar"].includes(document.language));
      assert.ok(document.body.length > 0);
      assert.ok(document.sourceRef.endsWith("#sections"));
    }
    const enSection = built.entries.find(([path]) => path.endsWith("ai-c01-l01-001"))[1];
    assert.match(enSection.body, /network connects devices/i);
    assert.doesNotMatch(enSection.body, /[*_`~]/);
  });

  await t.test("the same approved input produces the same checksum", () => {
    const first = aiExport.buildAiSections({courses: [COURSE], lessons: LESSONS, version: VERSION});
    const second = aiExport.buildAiSections({courses: [COURSE], lessons: LESSONS, version: VERSION});
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(first.checksum, second.checksum);
    assert.deepEqual(first.entries, second.entries);
  });

  await t.test("an unapproved lesson fails closed", () => {
    const lessons = structuredClone(LESSONS);
    lessons[1].status = "archived";
    const result = aiExport.buildAiSections({courses: [COURSE], lessons, version: VERSION});
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "NOT_APPROVED"));
  });

  await t.test("an answer key in the source fails closed", () => {
    const lessons = structuredClone(LESSONS);
    lessons[0].checkpoint.correctOptionId = "a";
    const result = aiExport.buildAiSections({courses: [COURSE], lessons, version: VERSION});
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) =>
      item.code === "PROTECTED_LEAK" && item.where.includes("correctOptionId")));
  });

  await t.test("export writes only server-only sections for the pinned version", async () => {
    await seedPublished();
    const pointerBefore = (await db.doc("system/publishedContentVersion").get()).data();
    const versionBefore = (await db.doc(`contentVersions/${VERSION}`).get()).data();
    const result = await aiExport.exportPublished(db, {version: VERSION});
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.version, VERSION);
    assert.equal(result.write.written, 4);
    assert.equal(result.write.batches, 1);
    assert.equal(result.checksum.length, 64);

    const snapshot = await db.collection(`contentVersions/${VERSION}/aiSections`).get();
    assert.equal(snapshot.size, 4);
    for (const item of snapshot.docs) {
      assert.match(item.ref.path, /\/aiSections\/ai-c01-l\d{2}-\d{3}$/);
      assert.equal(item.data().approved, true);
      assert.equal(item.data().lessonId in {
        "lesson-01-01": true,
        "lesson-01-02": true,
      }, true);
    }
    assert.deepEqual((await db.doc("system/publishedContentVersion").get()).data(), pointerBefore);
    assert.deepEqual((await db.doc(`contentVersions/${VERSION}`).get()).data(), versionBefore);
  });

  await t.test("re-export is idempotent", async () => {
    const first = await aiExport.exportPublished(db, {version: VERSION});
    assert.equal(first.ok, true);
    const second = await aiExport.exportPublished(db, {version: VERSION});
    assert.equal(second.ok, true);
    assert.equal(second.checksum, first.checksum);
    assert.equal(second.write.written, 4);
    assert.equal((await db.collection(`contentVersions/${VERSION}/aiSections`).get()).size, 4);
    const preview = await aiExport.preview(db, VERSION);
    assert.equal(preview.sectionCount, 4);
    assert.deepEqual(preview.languages, ["ar", "en"]);
  });

  await t.test("clients cannot read AI sections but keep the D-09 read path", async () => {
    const lesson = await getDoc(doc(guest,
      `contentVersions/${VERSION}/courses/course-01/lessons/lesson-01-01`));
    assert.equal(lesson.exists(), true);
    await assertFails(getDoc(doc(guest,
      `contentVersions/${VERSION}/aiSections/ai-c01-l01-001`)));
    await assertFails(getDoc(doc(guest,
      `contentVersions/${VERSION}/courses/course-01/lessons/lesson-01-01/private/checkpointKey`)));
  });

  await t.test("a non-published version cannot be exported", async () => {
    await seedPublished();
    await db.doc(`contentVersions/${VERSION}`).update({status: "staging"});
    const result = await aiExport.validatePublished(db, {version: VERSION});
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "NOT_PUBLISHED"));
    assert.equal((await db.collection(`contentVersions/${VERSION}/aiSections`).get()).size, 0);
  });
});
