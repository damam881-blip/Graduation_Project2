/**
 * N3-01 catalog contract test.
 *
 * Static validation of `scripts/catalog.cjs`: stable IDs, locked order,
 * bilingual (EN/AR) titles/descriptions, >= 12 lesson contracts, and no
 * protected quiz material. This runs without the emulators.
 */

const {test} = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");

const {COURSES, LESSONS} = require("../scripts/catalog.cjs");

const ARABIC_SCRIPT = /[\u0600-\u06FF]/;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;
const CATALOG_PATH = join(__dirname, "..", "scripts", "catalog.cjs");

/**
 * Asserts that a value is a non-empty [en, ar] pair.
 *
 * @param {unknown} value - Candidate pair.
 * @param {string} label - Field label for failure messages.
 * @return {void} Nothing.
 */
function assertBilingual(value, label) {
  assert.ok(
    Array.isArray(value) && value.length === 2,
    `${label} must be an [en, ar] pair`
  );

  const [en, ar] = value;

  assert.equal(typeof en, "string", `${label}.en must be a string`);
  assert.equal(typeof ar, "string", `${label}.ar must be a string`);
  assert.ok(en.trim().length > 0, `${label}.en must not be empty`);
  assert.ok(ar.trim().length > 0, `${label}.ar must not be empty`);
  assert.match(en, PRINTABLE_ASCII, `${label}.en must be printable ASCII`);
  assert.match(ar, ARABIC_SCRIPT, `${label}.ar must contain Arabic script`);
}

test("N3-01 locked course catalog", async (t) => {
  await t.test("six courses use stable IDs and a 1..6 order", () => {
    assert.equal(COURSES.length, 6);

    const ids = COURSES.map((course) => course.id);
    assert.deepEqual(ids, [
      "course-01",
      "course-02",
      "course-03",
      "course-04",
      "course-05",
      "course-06",
    ]);

    const orders = COURSES.map((course) => course.order);
    assert.deepEqual(orders, [1, 2, 3, 4, 5, 6]);

    for (const course of COURSES) {
      assert.equal(
        course.id,
        `course-0${course.order}`,
        `id/order mismatch: ${course.id}`
      );
    }
  });

  await t.test("FR-05 endpoints are locked in English", () => {
    assert.equal(COURSES[0].title[0], "Networking Fundamentals");
    assert.equal(COURSES[5].title[0], "Network Security Basics");
  });

  await t.test("course titles are bilingual and unique", () => {
    for (const course of COURSES) {
      assertBilingual(course.title, `${course.id}.title`);
    }

    const english = COURSES.map((course) => course.title[0]);
    assert.equal(new Set(english).size, english.length, "duplicate EN title");

    const arabic = COURSES.map((course) => course.title[1]);
    assert.equal(new Set(arabic).size, arabic.length, "duplicate AR title");
  });

  await t.test("course descriptions are bilingual with a duration", () => {
    for (const course of COURSES) {
      assertBilingual(course.description, `${course.id}.description`);
      assert.equal(
        Number.isInteger(course.estimatedMinutes) &&
          course.estimatedMinutes > 0,
        true,
        `${course.id}.estimatedMinutes must be a positive integer`
      );
    }
  });

  await t.test("at least 12 lessons, exactly two per course", () => {
    assert.ok(LESSONS.length >= 12, "catalog must define >= 12 lessons");
    assert.equal(LESSONS.length, 12);

    for (const course of COURSES) {
      const count = LESSONS.filter(
        (lesson) => lesson.courseId === course.id
      ).length;
      assert.equal(count, 2, `${course.id} must have 2 lessons`);
    }
  });

  await t.test("lesson IDs are unique and match their course", () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate lesson ID");

    for (const lesson of LESSONS) {
      assert.match(lesson.id, /^lesson-0[1-6]-\d{2}$/);
      assert.equal(
        lesson.id.slice(7, 9),
        lesson.courseId.slice(7, 9),
        `lesson/course prefix mismatch: ${lesson.id}`
      );
    }
  });

  await t.test("lesson order is contiguous from 1 within each course", () => {
    for (const course of COURSES) {
      const orders = LESSONS
        .filter((lesson) => lesson.courseId === course.id)
        .map((lesson) => lesson.order);

      assert.deepEqual(orders, [1, 2], `${course.id} lesson order`);
    }
  });

  await t.test("lesson titles and summaries are bilingual and unique", () => {
    for (const course of COURSES) {
      const titles = LESSONS
        .filter((lesson) => lesson.courseId === course.id)
        .map((lesson) => lesson.title[0]);

      assert.equal(
        new Set(titles).size,
        titles.length,
        `duplicate lesson title in ${course.id}`
      );
    }

    for (const lesson of LESSONS) {
      assertBilingual(lesson.title, `${lesson.id}.title`);
      assertBilingual(lesson.summary, `${lesson.id}.summary`);
    }
  });

  await t.test("catalog carries no protected quiz material", () => {
    const serialized = JSON.stringify({COURSES, LESSONS});

    for (const token of [
      "correctOption",
      "correctAnswer",
      "explanation",
      "quizBank",
      "questionBank",
    ]) {
      assert.equal(
        serialized.includes(token),
        false,
        `catalog must not contain ${token}`
      );
    }
  });

  await t.test("catalog source is UTF-8 without BOM and totals 6/12", () => {
    const bytes = readFileSync(CATALOG_PATH);
    const hasBom =
      bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;

    assert.equal(hasBom, false, "catalog.cjs must not start with a BOM");
    assert.equal(COURSES.length, 6);
    assert.equal(LESSONS.length, 12);
  });
});
