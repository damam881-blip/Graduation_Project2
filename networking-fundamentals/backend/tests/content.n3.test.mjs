/**
 * N3-03 - Git-managed bilingual content.
 *
 * Validates the public content tree in `backend/content` as bytes, not as a
 * rendered view: UTF-8 with no BOM, stable IDs, reference integrity, bilingual
 * fields, media agreement, the video fallback, the public-only checkpoint
 * projection, and the absence of protected assessment data.
 *
 * No emulator is required. The suite also proves that the Functions catalog
 * loader (`functions/scripts/catalog.cjs`) reads this tree, so there is exactly
 * one catalog source.
 *
 * Contract: backend/docs/content-n3.md. Tier rules: backend/content/README.md.
 */

import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join, relative, resolve, sep} from "node:path";
import {createRequire} from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(here, "..", "content");

const VERSION = "v003";
const FORMAT_VERSION = 1;
const COURSE_IDS = [
  "course-01",
  "course-02",
  "course-03",
  "course-04",
  "course-05",
  "course-06",
];
const SECTION_TYPES = ["text", "example", "image", "video"];

const COURSE_KEYS = [
  "courseId",
  "order",
  "title",
  "description",
  "estimatedMinutes",
  "finalQuizId",
  "lessonIds",
  "status",
  "contentVersion",
];

const LESSON_KEYS = [
  "lessonId",
  "courseId",
  "order",
  "title",
  "summary",
  "estimatedMinutes",
  "sections",
  "checkpoint",
  "quizId",
  "status",
  "contentVersion",
];

/**
 * Reads a file under `content` and rejects a BOM.
 *
 * @param {string} rel - POSIX-style path relative to the content root.
 * @return {string} Decoded text.
 */
function readStrict(rel) {
  const buffer = readFileSync(join(CONTENT, rel));

  assert.notEqual(buffer[0], 0xef, `${rel} must not start with a UTF-8 BOM`);
  assert.notEqual(buffer[0], 0xff, `${rel} must not start with a UTF-16 BOM`);

  return new TextDecoder("utf-8", {fatal: true}).decode(buffer);
}

/**
 * Reads and parses a JSON file under `content`.
 *
 * @param {string} rel - POSIX-style path relative to the content root.
 * @return {object} Parsed document.
 */
function readJson(rel) {
  return JSON.parse(readStrict(rel));
}

/**
 * Recursively lists files under a directory.
 *
 * @param {string} dir - Absolute directory.
 * @return {string[]} Absolute file paths.
 */
function listFiles(dir) {
  const out = [];

  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
    } else {
      out.push(full);
    }
  }

  return out;
}

/**
 * Checks that an object has no keys outside an allow-list.
 *
 * @param {object} value - Object to inspect.
 * @param {string[]} allowed - Allowed keys.
 * @param {string} label - Assertion label.
 */
function assertKeys(value, allowed, label) {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  assert.deepEqual(extra, [], `${label} has unexpected keys: ${extra.join(", ")}`);
}

const allFiles = listFiles(CONTENT)
  .map((full) => relative(CONTENT, full).split(sep).join("/"))
  .sort();

const jsonFiles = allFiles.filter((file) => file.endsWith(".json"));
const mediaFiles = allFiles.filter((file) => file.startsWith("media/"));

const manifest = readJson("manifest.json");
const catalog = readJson("catalog.json");
const courses = manifest.courses.map(readJson);
const lessons = manifest.lessons.map(readJson);

const courseById = new Map(courses.map((course) => [course.courseId, course]));
const lessonById = new Map(lessons.map((lesson) => [lesson.lessonId, lesson]));

/**
 * Returns the number of bytes in a content file.
 *
 * @param {string} rel - POSIX-style path relative to the content root.
 * @return {number} Byte length.
 */
function sizeOf(rel) {
  return readFileSync(join(CONTENT, rel)).length;
}

test("N3-03 Git-managed bilingual content", async (t) => {
  await t.test("manifest declares the locked version and languages", () => {
    assert.equal(manifest.contentVersion, VERSION);
    assert.equal(manifest.formatVersion, FORMAT_VERSION);
    assert.equal(manifest.defaultLanguage, "en");
    assert.deepEqual(manifest.languages, ["en", "ar"]);
    assert.equal(manifest.courses.length, 6);
    assert.equal(manifest.lessons.length, 12);
    assert.equal(manifest.media.length, 2);
    assert.equal(typeof manifest.note, "string");
    assert.match(manifest.note, /Public approved content only/);

    assertKeys(manifest, [
      "contentVersion",
      "formatVersion",
      "defaultLanguage",
      "languages",
      "courses",
      "lessons",
      "media",
      "note",
    ], "manifest.json");
  });

  await t.test("manifest files exist and the tree has no orphans", () => {
    for (const rel of [
      ...manifest.courses,
      ...manifest.lessons,
      ...manifest.media,
    ]) {
      assert.ok(allFiles.includes(rel), `manifest lists missing file ${rel}`);
    }

    assert.equal(new Set(manifest.courses).size, 6);
    assert.equal(new Set(manifest.lessons).size, 12);
    assert.equal(new Set(manifest.media).size, 2);

    const courseFiles = jsonFiles.filter((file) => file.startsWith("courses/"));
    const lessonFiles = jsonFiles.filter((file) => file.startsWith("lessons/"));
    const structuralFiles = jsonFiles.filter(
      (file) => !file.startsWith("courses/") && !file.startsWith("lessons/")
    );

    assert.deepEqual(structuralFiles, ["catalog.json", "manifest.json"]);
    assert.deepEqual(courseFiles.slice().sort(), manifest.courses.slice().sort());
    assert.deepEqual(lessonFiles.slice().sort(), manifest.lessons.slice().sort());
    assert.deepEqual(mediaFiles.slice().sort(), manifest.media.slice().sort());

    const topLevel = readdirSync(CONTENT, {withFileTypes: true})
      .map((entry) => `${entry.name}${entry.isDirectory() ? "/" : ""}`)
      .sort();

    assert.deepEqual(topLevel, [
      "README.md",
      "catalog.json",
      "courses/",
      "lessons/",
      "manifest.json",
      "media/",
    ]);
  });

  await t.test("every content file is valid UTF-8 without BOM", () => {
    for (const rel of allFiles) {
      const text = readStrict(rel);

      assert.ok(text.length > 0, `${rel} is empty`);
      assert.equal(text.includes("\u0000"), false, `${rel} contains a NUL byte`);
      assert.equal(text.includes("\r"), false, `${rel} must use LF line endings`);
      assert.ok(text.endsWith("\n"), `${rel} must end with a newline`);
    }
  });

  await t.test("course files match the schema and locked IDs", () => {
    assert.equal(courses.length, 6);

    courses.forEach((course, index) => {
      const label = `courses/${course.courseId}.json`;

      assert.equal(course.courseId, COURSE_IDS[index]);
      assert.equal(course.order, index + 1);
      assert.equal(course.status, "approved");
      assert.equal(course.contentVersion, VERSION);
      assert.ok(Number.isInteger(course.estimatedMinutes));
      assert.ok(course.estimatedMinutes > 0);
      assert.deepEqual(course.lessonIds, [
        `lesson-0${index + 1}-01`,
        `lesson-0${index + 1}-02`,
      ]);
      assert.match(
        course.finalQuizId,
        new RegExp(`^quiz-c0${index + 1}-final$`)
      );
      assertKeys(course, COURSE_KEYS, label);

      assert.equal(allFiles.includes(label), true, `${label} is not on disk`);
    });
  });

  await t.test("lesson files match the schema, course, and order", () => {
    assert.equal(lessons.length, 12);

    for (const course of courses) {
      const owned = lessons
        .filter((lesson) => lesson.courseId === course.courseId)
        .sort((left, right) => left.order - right.order);

      assert.equal(owned.length, 2);
      assert.deepEqual(
        owned.map((lesson) => lesson.lessonId),
        course.lessonIds
      );

      owned.forEach((lesson, index) => {
        const label = `lessons/${lesson.lessonId}.json`;
        const suffix = course.courseId.slice(-2);

        assert.equal(lesson.order, index + 1);
        assert.equal(lesson.status, "approved");
        assert.equal(lesson.contentVersion, VERSION);
        assert.ok(Number.isInteger(lesson.estimatedMinutes));
        assert.ok(lesson.estimatedMinutes > 0);
        assert.ok(Array.isArray(lesson.sections));
        assert.ok(lesson.sections.length >= 2);
        assert.equal(
          lesson.quizId,
          `quiz-c${suffix}-l0${index + 1}`
        );
        assertKeys(lesson, LESSON_KEYS, label);
        assert.equal(allFiles.includes(label), true, `${label} is not on disk`);
      });
    }

    assert.equal(lessonById.size, 12);
    assert.equal(courseById.size, 6);
  });

  await t.test("section IDs are unique and ordered in every lesson", () => {
    for (const lesson of lessons) {
      const ids = lesson.sections.map((section) => section.sectionId);

      assert.equal(new Set(ids).size, ids.length, `${lesson.lessonId} reuses a sectionId`);
      assert.deepEqual(
        lesson.sections.map((section) => section.order),
        lesson.sections.map((_, index) => index + 1),
        `${lesson.lessonId} section order is not contiguous`
      );
      assert.deepEqual(
        ids,
        ids.map((_, index) => `sec-0${index + 1}`),
        `${lesson.lessonId} section IDs are not sequential`
      );
    }
  });

  await t.test("section types are allowed and carry their required keys", () => {
    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        assert.ok(
          SECTION_TYPES.includes(section.type),
          `${lesson.lessonId}/${section.sectionId} has type ${section.type}`
        );

        if (section.type === "text" || section.type === "example") {
          assertKeys(section, ["order", "sectionId", "type", "text"], "section");
          assert.equal(typeof section.text.en, "string");
          assert.equal(typeof section.text.ar, "string");
        }

        if (section.type === "image") {
          assertKeys(
            section,
            ["order", "sectionId", "type", "asset", "alt", "caption"],
            "image section"
          );
          assert.match(section.asset, /^media\/[a-z0-9-]+\.svg$/);
        }

        if (section.type === "video") {
          assertKeys(
            section,
            [
              "order",
              "sectionId",
              "type",
              "provider",
              "videoId",
              "unlisted",
              "caption",
              "fallback",
            ],
            "video section"
          );
        }
      }
    }
  });

  await t.test("every lesson has text and at most one media block", () => {
    for (const lesson of lessons) {
      const types = lesson.sections.map((section) => section.type);
      const media = types.filter((type) => type === "image" || type === "video");

      assert.ok(types.includes("text"), `${lesson.lessonId} has no text section`);
      assert.ok(media.length <= 1, `${lesson.lessonId} has ${media.length} media blocks`);
    }
  });

  await t.test("image assets exist, are manifest-listed, and are SVG", () => {
    const referenced = new Set();

    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (section.type !== "image") {
          continue;
        }

        referenced.add(section.asset);
        assert.ok(
          manifest.media.includes(section.asset),
          `${section.asset} is not in manifest.media`
        );
        assert.ok(allFiles.includes(section.asset), `${section.asset} is missing`);

        const svg = readStrict(section.asset);

        assert.match(svg, /^<svg\b/);
        assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        assert.match(svg, /viewBox="[^"]+"/);
        assert.match(svg, /<\/svg>\n$/);
        assert.equal(svg.includes("<script"), false);
        assert.ok(sizeOf(section.asset) > 200);
      }
    }

    assert.deepEqual(
      [...referenced].sort(),
      manifest.media.slice().sort(),
      "manifest.media and referenced image assets disagree"
    );
    assert.ok(referenced.size >= 1);
  });

  await t.test("video sections use YouTube with a bilingual fallback", () => {
    let videoCount = 0;

    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (section.type !== "video") {
          continue;
        }

        videoCount += 1;
        assert.equal(section.provider, "youtube");
        assert.match(section.videoId, /^[A-Za-z0-9_-]{11}$/);
        assert.equal(section.unlisted, true);
        assert.ok(section.fallback.en.length > 0);
        assert.ok(section.fallback.ar.length > 0);
        assert.ok(section.caption.en.length > 0);
        assert.ok(section.caption.ar.length > 0);
      }
    }

    assert.ok(videoCount >= 1, "no video section exercises the fallback path");
  });

  await t.test("checkpoints are public-only and never carry an answer", () => {
    const CHECKPOINT_KEYS = [
      "checkpointId",
      "afterSectionId",
      "question",
      "options",
      "maxRetries",
    ];
    const OPTION_KEYS = ["optionId", "text"];

    for (const lesson of lessons) {
      const checkpoint = lesson.checkpoint;
      const sectionIds = lesson.sections.map((section) => section.sectionId);

      assertKeys(checkpoint, CHECKPOINT_KEYS, `${lesson.lessonId} checkpoint`);
      assert.equal(checkpoint.checkpointId, "cp-01");
      assert.ok(sectionIds.includes(checkpoint.afterSectionId));
      assert.equal(checkpoint.maxRetries, null);
      assert.ok(checkpoint.question.en.length > 0);
      assert.ok(checkpoint.question.ar.length > 0);
      assert.ok(checkpoint.options.length >= 2);
      assert.ok(checkpoint.options.length <= 6);

      const optionIds = checkpoint.options.map((option) => option.optionId);

      assert.equal(new Set(optionIds).size, optionIds.length);
      assert.deepEqual(
        optionIds,
        "abcdef".slice(0, optionIds.length).split("")
      );

      for (const option of checkpoint.options) {
        assertKeys(option, OPTION_KEYS, `${lesson.lessonId} checkpoint option`);
        assert.ok(option.text.en.length > 0);
        assert.ok(option.text.ar.length > 0);
      }

      for (const forbidden of [
        "correctOptionId",
        "correctOptionIds",
        "answer",
        "explanation",
        "review",
      ]) {
        assert.equal(
          Object.hasOwn(checkpoint, forbidden),
          false,
          `${lesson.lessonId} checkpoint exposes ${forbidden}`
        );
      }
    }
  });

  await t.test("protected assessment tokens never appear in public content", () => {
    const pattern = new RegExp(
      [
        "correctOptionIds?",
        "explanation",
        "quizBank",
        "checkpointKey",
        "answerKey",
        "review",
        "\"questions\"",
      ].join("|"),
      "i"
    );

    for (const rel of jsonFiles) {
      const text = readStrict(rel);

      assert.equal(
        pattern.test(text),
        false,
        `${rel} contains a protected assessment token`
      );
    }
  });

  await t.test("catalog.json agrees with the course and lesson files", () => {
    assert.equal(catalog.contentVersion, VERSION);
    assert.equal(catalog.formatVersion, FORMAT_VERSION);
    assertKeys(
      catalog,
      ["contentVersion", "formatVersion", "courses", "lessons"],
      "catalog.json"
    );

    assert.deepEqual(
      catalog.courses.map((course) => course.courseId),
      COURSE_IDS
    );
    assert.equal(catalog.lessons.length, 12);

    for (const entry of catalog.courses) {
      assertKeys(
        entry,
        [
          "courseId",
          "order",
          "title",
          "description",
          "estimatedMinutes",
          "lessonIds",
        ],
        `catalog course ${entry.courseId}`
      );

      const source = courseById.get(entry.courseId);

      assert.ok(source, `catalog references unknown ${entry.courseId}`);
      assert.equal(entry.order, source.order);
      assert.deepEqual(entry.title, source.title);
      assert.deepEqual(entry.description, source.description);
      assert.equal(entry.estimatedMinutes, source.estimatedMinutes);
      assert.deepEqual(entry.lessonIds, source.lessonIds);
    }

    for (const entry of catalog.lessons) {
      assertKeys(
        entry,
        [
          "lessonId",
          "courseId",
          "order",
          "title",
          "summary",
          "estimatedMinutes",
        ],
        `catalog lesson ${entry.lessonId}`
      );

      const source = lessonById.get(entry.lessonId);

      assert.ok(source, `catalog references unknown ${entry.lessonId}`);
      assert.equal(entry.courseId, source.courseId);
      assert.equal(entry.order, source.order);
      assert.deepEqual(entry.title, source.title);
      assert.deepEqual(entry.summary, source.summary);
      assert.equal(entry.estimatedMinutes, source.estimatedMinutes);
    }
  });

  await t.test("no course, lesson, quiz, or option ID is reused", () => {
    const courseIds = courses.map((course) => course.courseId);
    const lessonIds = lessons.map((lesson) => lesson.lessonId);
    const quizIds = [
      ...lessons.map((lesson) => lesson.quizId),
      ...courses.map((course) => course.finalQuizId),
    ];

    assert.equal(new Set(courseIds).size, courseIds.length);
    assert.equal(new Set(lessonIds).size, lessonIds.length);
    assert.equal(new Set(quizIds).size, quizIds.length);

    for (const lesson of lessons) {
      const optionIds = lesson.checkpoint.options.map((option) => option.optionId);
      assert.equal(new Set(optionIds).size, optionIds.length);
    }
  });

  await t.test("IDs follow the schema-lock grammars", () => {
    assert.match(VERSION, /^v\d{3}$/);

    for (const course of courses) {
      assert.match(course.courseId, /^course-0[1-6]$/);
      assert.match(course.finalQuizId, /^quiz-c0[1-6]-final$/);

      for (const lessonId of course.lessonIds) {
        assert.match(lessonId, /^lesson-0[1-6]-0[12]$/);
      }
    }

    for (const lesson of lessons) {
      assert.match(lesson.lessonId, /^lesson-0[1-6]-0[12]$/);
      assert.match(lesson.quizId, /^quiz-c0[1-6]-l0[12]$/);
      assert.match(lesson.checkpoint.checkpointId, /^cp-0[1-9]$/);

      for (const section of lesson.sections) {
        assert.match(section.sectionId, /^sec-0[1-9]$/);
      }
    }
  });

  await t.test("every user-visible string is non-empty in English and Arabic", () => {
    const PLACEHOLDERS = ["TODO", "TBD", "lorem ipsum", "translation pending", "xxx"];

    /**
     * Walks a parsed document and checks every bilingual pair.
     *
     * @param {*} value - Current node.
     * @param {string} path - Path for messages.
     */
    function walk(value, path) {
      if (Array.isArray(value)) {
        value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
        return;
      }

      if (value === null || typeof value !== "object") {
        return;
      }

      const keys = Object.keys(value);

      if (keys.includes("en") || keys.includes("ar")) {
        assert.deepEqual(
          keys.filter((key) => key === "en" || key === "ar").sort(),
          ["ar", "en"],
          `${path} is not a complete bilingual pair`
        );

        for (const language of ["en", "ar"]) {
          assert.equal(typeof value[language], "string", `${path}.${language} is not a string`);
          assert.ok(value[language].trim().length > 0, `${path}.${language} is empty`);

          for (const placeholder of PLACEHOLDERS) {
            assert.equal(
              value[language].toLowerCase().includes(placeholder.toLowerCase()),
              false,
              `${path}.${language} contains placeholder ${placeholder}`
            );
          }
        }
      }

      for (const [key, child] of Object.entries(value)) {
        walk(child, `${path}.${key}`);
      }
    }

    for (const rel of jsonFiles) {
      walk(readJson(rel), rel);
    }

    for (const lesson of lessons) {
      for (const section of lesson.sections) {
        if (section.type === "image" || section.type === "video") {
          assert.ok(section.caption.en.length > 0);
          assert.ok(section.caption.ar.length > 0);
        }
      }
    }
  });

  await t.test("per-file size caps are respected", () => {
    assert.ok(sizeOf("manifest.json") <= 4096);
    assert.ok(sizeOf("catalog.json") <= 32768);

    for (const rel of manifest.courses) {
      assert.ok(sizeOf(rel) <= 4096, `${rel} exceeds 4 KB`);
    }

    for (const rel of manifest.lessons) {
      assert.ok(sizeOf(rel) <= 16384, `${rel} exceeds 16 KB`);
    }
  });

  await t.test("the Functions catalog loader derives its data from this tree", () => {
    const require = createRequire(import.meta.url);
    const loader = require(resolve(here, "..", "functions", "scripts", "catalog.cjs"));

    assert.equal(loader.COURSES.length, 6);
    assert.equal(loader.LESSONS.length, 12);

    assert.deepEqual(
      loader.COURSES.map((course) => course.id),
      COURSE_IDS
    );

    loader.COURSES.forEach((course, index) => {
      const source = catalog.courses[index];

      assert.equal(course.id, source.courseId);
      assert.equal(course.order, source.order);
      assert.deepEqual(course.title, [source.title.en, source.title.ar]);
      assert.deepEqual(course.description, [
        source.description.en,
        source.description.ar,
      ]);
      assert.equal(course.estimatedMinutes, source.estimatedMinutes);
    });

    loader.LESSONS.forEach((lesson, index) => {
      const source = catalog.lessons[index];

      assert.equal(lesson.id, source.lessonId);
      assert.equal(lesson.courseId, source.courseId);
      assert.equal(lesson.order, source.order);
      assert.deepEqual(lesson.title, [source.title.en, source.title.ar]);
      assert.deepEqual(lesson.summary, [source.summary.en, source.summary.ar]);
    });
  });
});
