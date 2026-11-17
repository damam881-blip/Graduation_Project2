/**
 * N3-04 - validated importer, staging, publish, and rollback.
 *
 * The pure validation half runs against copies of the real source tree, so a
 * single mutated field proves that the importer refuses to write. The
 * lifecycle half uses the real firestore.rules in the private namespace
 * demo-networking-contentimport and calls the production Admin SDK helpers,
 * not copies of the transactions.
 *
 * Prerequisite: Firestore emulator on 127.0.0.1:8080.
 */

import {test, after} from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {dirname, join, resolve} from "node:path";

import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";

import {doc, getDoc} from "firebase/firestore";

const require = createRequire(import.meta.url);
const importer = require("../functions/scripts/content-import.cjs");

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(here, "..", "content");
const PROTECTED = resolve(here, "..", "functions", "scripts", "import-data");
const RULES = readFileSync(resolve(here, "..", "firestore.rules"), "utf8");
const PROJECT_ID = "demo-networking-contentimport";
const BASE_URL = "http://127.0.0.1:8081";
const VERSION = "v004";
const NOW = 1760000000000;

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: RULES,
  },
});
const db = importer.getAdminDb({projectId: PROJECT_ID});
const guest = env.unauthenticatedContext().firestore();
const tempDirs = [];

after(async () => {
  for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true});
  await env.clearFirestore();
  await env.cleanup();
});

/**
 * Copies the public and protected sources into a scratch directory.
 *
 * @return {object} Paths of the copied sources.
 */
function cloneSources() {
  const root = mkdtempSync(join(tmpdir(), "n3import-"));
  tempDirs.push(root);
  const contentRoot = join(root, "content");
  const protectedRoot = join(root, "protected");
  cpSync(CONTENT, contentRoot, {recursive: true});
  cpSync(PROTECTED, protectedRoot, {recursive: true});
  return {contentRoot, protectedRoot};
}

/**
 * Mutates a copied JSON source file.
 *
 * @param {object} sources - Copied source paths.
 * @param {string} rel - File relative to the content root.
 * @param {Function} mutate - Mutation applied to the parsed document.
 * @return {void}
 */
function editJson(sources, rel, mutate) {
  const file = join(sources.contentRoot, rel);
  const document = JSON.parse(readFileSync(file, "utf8"));
  mutate(document);
  writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
}

/**
 * Replaces one line in a copied CSV source file.
 *
 * @param {object} sources - Copied source paths.
 * @param {string} name - CSV file name.
 * @param {string} from - Original line without the newline.
 * @param {string|null} to - Replacement line, or null to delete it.
 * @return {void}
 */
function editCsvLine(sources, name, from, to) {
  const file = join(sources.protectedRoot, name);
  const lines = readFileSync(file, "utf8").split("\n");
  const index = lines.indexOf(from);
  assert.notEqual(index, -1, `CSV line not found: ${from}`);
  if (to === null) {
    lines.splice(index, 1);
  } else {
    lines[index] = to;
  }
  writeFileSync(file, lines.join("\n"));
}

/**
 * Loads and validates a source copy.
 *
 * @param {object} sources - Copied source paths.
 * @return {object} Validation result.
 */
function validateCopy(sources) {
  const model = importer.loadSources({
    contentRoot: sources.contentRoot,
    protectedRoot: sources.protectedRoot,
  });
  return importer.validateSources(model, {
    version: VERSION,
    imageUrlBase: BASE_URL,
    now: NOW,
  });
}

/**
 * Seeds the active v001 baseline in the test namespace.
 *
 * @return {Promise<void>} Resolves after the baseline is written.
 */
async function seedBaseline() {
  await env.clearFirestore();
  await db.doc("system/publishedContentVersion").set({
    contentVersion: "v001",
    previousContentVersion: null,
    checksum: "checksum-v001",
    status: "published",
    publishedAt: NOW - 1000,
  });
  await db.doc("contentVersions/v001").set({
    contentVersion: "v001",
    status: "published",
    checksum: "checksum-v001",
    validation: {ok: true, errors: []},
    publishedAt: NOW - 1000,
    archivedAt: null,
  });
}

/**
 * Stages the real validated import into the test namespace.
 *
 * @return {object} Validation result and preview.
 */
async function stageRealImport() {
  await seedBaseline();
  const result = validateCopy(cloneSources());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  await importer.stage(db, {entries: result.entries});
  return {result, preview: await importer.preview(db, VERSION)};
}

test("N3-04 validated importer and lifecycle", async (t) => {
  await t.test("the approved source tree validates before any write", () => {
    const result = validateCopy(cloneSources());
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.checksum.length, 64);
    assert.deepEqual(result.counts, {
      courses: 6,
      lessons: 12,
      quizzes: 18,
      checkpointKeys: 12,
      questions: 324,
      documents: 391,
      assets: 2,
    });
  });

  await t.test("missing fields are rejected before any write", () => {
    const sources = cloneSources();
    editJson(sources, "courses/course-01.json", (course) => {
      delete course.description.en;
    });
    const result = validateCopy(sources);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) =>
      item.code === "MISSING_FIELD" && item.where.includes("description")));
  });

  await t.test("duplicate IDs are rejected before any write", () => {
    const sources = cloneSources();
    editJson(sources, "lessons/lesson-01-02.json", (lesson) => {
      lesson.lessonId = "lesson-01-01";
    });
    const result = validateCopy(sources);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "DUPLICATE_ID"));
  });

  await t.test("broken references are rejected before any write", () => {
    const sources = cloneSources();
    editJson(sources, "courses/course-01.json", (course) => {
      course.finalQuizId = "quiz-c99-final";
    });
    const result = validateCopy(sources);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "BROKEN_REFERENCE" &&
      item.where === "course-01"));
  });

  await t.test("insufficient bank size is rejected before any write", () => {
    const sources = cloneSources();
    editCsvLine(sources, "quiz-answers.csv",
      "quiz-c01-l01,a,12", "quiz-c01-l01,a,9");
    const result = validateCopy(sources);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "BANK_TOO_SMALL" &&
      item.where === "quiz quiz-c01-l01"));
  });

  await t.test("a missing private key or a client-side answer is rejected", () => {
    const missingKey = cloneSources();
    editCsvLine(missingKey, "checkpoint-keys.csv",
      "lesson-01-01,a,\"Option A is the approved checkpoint answer for this lesson.\",\"الخيار A هو إجابة نقطة التحقق المعتمدة لهذا الدرس.\"",
      null);
    const withoutKey = validateCopy(missingKey);
    assert.equal(withoutKey.ok, false);
    assert.ok(withoutKey.errors.some((item) => item.code === "MISSING_PRIVATE_KEY"));

    const leaked = cloneSources();
    editJson(leaked, "lessons/lesson-01-01.json", (lesson) => {
      lesson.checkpoint.explanation = {en: "leaked", ar: "تسريب"};
    });
    const withLeak = validateCopy(leaked);
    assert.equal(withLeak.ok, false);
    assert.ok(withLeak.errors.some((item) => item.code === "PROTECTED_LEAK"));
  });

  await t.test("media, video, and protected paths are mapped correctly", () => {
    const result = validateCopy(cloneSources());
    const lesson = result.entries.find(([path]) =>
      path.endsWith("lessons/lesson-01-01"))[1];
    const image = lesson.sections.find((section) => section.type === "image");
    assert.equal(image.imageUrl, `${BASE_URL}/${VERSION}/media/network-diagram.svg`);
    assert.equal("asset" in image, false);

    const videoLesson = result.entries.find(([path]) =>
      path.endsWith("lessons/lesson-01-02"))[1];
    const video = videoLesson.sections.find((section) => section.type === "video");
    assert.equal(video.videoUrl, "https://www.youtube.com/watch?v=00000000000");
    assert.equal("videoId" in video, false);

    const publicPaths = result.entries
      .map(([path]) => path)
      .filter((path) => !path.includes("/private/") && !path.includes("/quizBanks/"));
    for (const [path, document] of result.entries) {
      const text = JSON.stringify(document);
      if (publicPaths.includes(path)) {
        for (const token of ["correctOptionId", "correctOptionIds", "explanation", "review"]) {
          assert.equal(text.includes(token), false, `${path} leaks ${token}`);
        }
      }
    }
    assert.ok(result.entries.some(([path]) =>
      path.endsWith("/private/checkpointKey")));
    assert.ok(result.entries.some(([path]) =>
      path.endsWith("/quizBanks/quiz-c01-final/questions/q001")));
  });

  await t.test("SVG bytes are uploaded to a verified local asset store", () => {
    const result = validateCopy(cloneSources());
    const destDir = join(tempDirs[0], "assets");
    const uploaded = importer.publishAssets({
      assets: result.assets,
      version: VERSION,
      destDir,
    });
    assert.equal(uploaded.length, 2);
    for (const asset of uploaded) {
      const bytes = readFileSync(asset.destination);
      assert.ok(bytes.length > 0);
      assert.equal(asset.sha256.length, 64);
    }
  });

  await t.test("staging is invisible to clients and preview reports it", async () => {
    const {preview} = await stageRealImport();
    assert.equal(preview.status, "staging");
    assert.equal(preview.validation.ok, true);
    assert.equal(preview.activeVersion, "v001");
    assert.equal(preview.visibleToClients, false);
    assert.equal(preview.courseCount, 6);
    assert.equal(preview.lessonCount, 12);
    assert.equal(preview.quizCount, 18);

    const active = await getDoc(doc(guest, "contentVersions/v001"));
    assert.equal(active.exists(), true);
    await assertFails(getDoc(doc(guest,
      `contentVersions/${VERSION}/courses/course-01`)));
    await assertFails(getDoc(doc(guest,
      `contentVersions/${VERSION}/courses/course-01/lessons/lesson-01-01/private/checkpointKey`)));
  });

  await t.test("publish flips the pointer and statuses in one transaction", async () => {
    await stageRealImport();
    const result = await importer.publish(db, {version: VERSION, actor: "n3-test"});
    assert.equal(result.previousId, "v001");

    const pointer = (await db.doc("system/publishedContentVersion").get()).data();
    assert.equal(pointer.contentVersion, VERSION);
    assert.equal(pointer.previousContentVersion, "v001");
    assert.equal(pointer.publishedBy, "n3-test");
    assert.equal((await db.doc(`contentVersions/${VERSION}`).get()).data().status, "published");
    assert.equal((await db.doc("contentVersions/v001").get()).data().status, "archived");

    const lesson = await getDoc(doc(guest,
      `contentVersions/${VERSION}/courses/course-01/lessons/lesson-01-01`));
    assert.equal(lesson.exists(), true);
    assert.equal(lesson.data().title.en, "What is a Network?");
    await assertFails(getDoc(doc(guest,
      `contentVersions/${VERSION}/quizBanks/quiz-c01-l01/questions/q001`)));
  });

  await t.test("a failed publish leaves the pointer and statuses unchanged", async () => {
    await seedBaseline();
    await db.doc(`contentVersions/${VERSION}`).set({
      contentVersion: VERSION,
      status: "staging",
      checksum: "bad",
      validation: {ok: false, errors: ["not validated"]},
    });
    await assert.rejects(() => importer.publish(db, {version: VERSION}), /NOT_VALIDATED/);
    assert.equal((await db.doc("system/publishedContentVersion").get()).data().contentVersion, "v001");
    assert.equal((await db.doc(`contentVersions/${VERSION}`).get()).data().status, "staging");
    assert.equal((await db.doc("contentVersions/v001").get()).data().status, "published");
  });

  await t.test("rollback restores the previous version atomically", async () => {
    await stageRealImport();
    await importer.publish(db, {version: VERSION, actor: "n3-test"});
    const result = await importer.rollback(db, {
      version: VERSION,
      restoreVersion: "v001",
      actor: "n3-test",
    });
    assert.equal(result.restoredVersion, "v001");

    const pointer = (await db.doc("system/publishedContentVersion").get()).data();
    assert.equal(pointer.contentVersion, "v001");
    assert.equal(pointer.previousContentVersion, null);
    assert.equal((await db.doc(`contentVersions/${VERSION}`).get()).data().status, "rolledBack");
    const restored = (await db.doc("contentVersions/v001").get()).data();
    assert.equal(restored.status, "published");
    assert.equal(restored.rollbackOf, VERSION);

    await assertFails(getDoc(doc(guest, `contentVersions/${VERSION}/courses/course-01`)));
    assert.equal((await getDoc(doc(guest, "contentVersions/v001"))).exists(), true);
  });

  await t.test("a failed rollback leaves the pointer unchanged", async () => {
    await seedBaseline();
    await assert.rejects(() => importer.rollback(db, {
      version: VERSION,
      restoreVersion: "v001",
    }), /NOT_ACTIVE/);
    assert.equal((await db.doc("system/publishedContentVersion").get()).data().contentVersion, "v001");
  });
});
