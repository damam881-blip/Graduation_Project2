/**
 * N3-04 - validated content importer and lifecycle helpers.
 *
 * Pure functions (loadSources, validateSources) validate the public content
 * tree and the server-only CSV sources BEFORE any Firestore write. The mapper
 * uploads SVG bytes to a local asset store for the emulator, converts each
 * section into its Firestore shape, and keeps every answer/bank document on a
 * server-only path. publish() and rollback() perform one Admin SDK transaction
 * each; they never rewrite content documents.
 *
 * Contract: backend/docs/content-import-n3.md.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {getApps, getApp, initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");

const POINTER_PATH = "system/publishedContentVersion";
const DEFAULT_CONTENT_ROOT = path.resolve(__dirname, "..", "..", "content");
const DEFAULT_PROTECTED_ROOT = path.join(__dirname, "import-data");
const DEFAULT_ASSET_DIR = path.resolve(__dirname, "..", ".local", "content-assets");
const DEFAULT_ASSET_BASE_URL = "http://127.0.0.1:8081";
const FORBIDDEN_CLIENT_KEYS = [
  "correctOptionId",
  "correctOptionIds",
  "explanation",
  "review",
];

/**
 * Reads a UTF-8 file and rejects a BOM or invalid bytes.
 *
 * @param {string} file - Absolute path.
 * @return {string} Decoded text.
 */
function readUtf8(file) {
  const buffer = fs.readFileSync(file);
  if (buffer[0] === 0xef || buffer[0] === 0xff) {
    throw new Error(`${file} must not start with a byte-order mark`);
  }
  return new TextDecoder("utf-8", {fatal: true}).decode(buffer);
}

/**
 * Reads and parses a JSON file.
 *
 * @param {string} file - Absolute path.
 * @return {object} Parsed document.
 */
function readJson(file) {
  const doc = JSON.parse(readUtf8(file));
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error(`${file} must contain a JSON object`);
  }
  return doc;
}

/**
 * Recursively lists files as POSIX-style relative paths.
 *
 * @param {string} dir - Absolute directory.
 * @return {string[]} Sorted relative paths.
 */
function listFiles(dir, root = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, root));
    } else {
      out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
  return out.sort();
}

/**
 * Minimal strict CSV parser: quoted fields, doubled quotes, CRLF or LF.
 *
 * @param {string} text - CSV document.
 * @return {object[]} One object per data row, keyed by the header row.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r" || ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  while (rows.length > 0 && rows[rows.length - 1].length === 1 &&
    rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  if (quoted) throw new Error("Unterminated quoted CSV field");

  const header = rows.shift();
  if (!header) throw new Error("CSV has no header row");
  return rows.map((cells, index) => {
    if (cells.length !== header.length) {
      throw new Error(`CSV row ${index + 2} has ${cells.length} columns, expected ${header.length}`);
    }
    const record = {};
    header.forEach((name, column) => {
      record[name.trim()] = cells[column];
    });
    return record;
  });
}

/**
 * Loads the public tree and the server-only CSV sources from disk.
 *
 * @param {object} options - Loader options.
 * @param {string} options.contentRoot - Public content directory.
 * @param {string} options.protectedRoot - Server-only CSV directory.
 * @return {object} Source model used by validateSources().
 */
function loadSources({
  contentRoot = DEFAULT_CONTENT_ROOT,
  protectedRoot = DEFAULT_PROTECTED_ROOT,
} = {}) {
  const manifest = readJson(path.join(contentRoot, "manifest.json"));
  const catalog = readJson(path.join(contentRoot, "catalog.json"));
  const courses = manifest.courses.map((rel) => readJson(path.join(contentRoot, rel)));
  const lessons = manifest.lessons.map((rel) => readJson(path.join(contentRoot, rel)));
  const media = manifest.media.map((rel) => ({
    asset: rel,
    bytes: fs.readFileSync(path.join(contentRoot, rel)),
  }));

  const checkpointCsv = readUtf8(path.join(protectedRoot, "checkpoint-keys.csv"));
  const quizCsv = readUtf8(path.join(protectedRoot, "quiz-answers.csv"));

  return {
    contentRoot,
    protectedRoot,
    manifest,
    catalog,
    courses,
    lessons,
    media,
    files: listFiles(contentRoot),
    checkpointCsv,
    quizCsv,
    checkpointKeys: parseCsv(checkpointCsv),
    quizAnswers: parseCsv(quizCsv),
  };
}

/**
 * Builds a stable digest over every source byte, including the CSV files.
 *
 * @param {object} model - Source model.
 * @return {string} Hex SHA-256 digest.
 */
function sourceChecksum(model) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(model.manifest));
  hash.update(JSON.stringify(model.catalog));
  for (const course of model.courses) hash.update(JSON.stringify(course));
  for (const lesson of model.lessons) hash.update(JSON.stringify(lesson));
  for (const file of model.media) {
    hash.update(file.asset);
    hash.update(crypto.createHash("sha256").update(file.bytes).digest("hex"));
  }
  hash.update(model.checkpointCsv);
  hash.update(model.quizCsv);
  return hash.digest("hex");
}

/**
 * Tests a {en, ar} localized string.
 *
 * @param {unknown} value - Candidate value.
 * @return {boolean} True when both languages are non-empty strings.
 */
function isLocalized(value) {
  return Boolean(value) && typeof value === "object" &&
    typeof value.en === "string" && value.en.trim().length > 0 &&
    typeof value.ar === "string" && value.ar.trim().length > 0;
}

/**
 * Recursively finds forbidden answer keys in a client-readable document.
 *
 * @param {unknown} value - Document to scan.
 * @param {string[]} found - Accumulator of forbidden key names.
 * @return {void}
 */
function scanForbidden(value, found) {
  if (Array.isArray(value)) {
    for (const item of value) scanForbidden(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_CLIENT_KEYS.includes(key)) found.push(key);
      scanForbidden(child, found);
    }
  }
}

/**
 * Returns the quiz ID used by the locked catalog for a lesson or course.
 *
 * @param {string} courseId - e.g. course-01.
 * @param {number|string} lessonOrder - Lesson order, or "final".
 * @return {string} Quiz ID.
 */
function quizIdFor(courseId, lessonOrder) {
  const shortCourse = courseId.replace(/^course-/, "c");
  if (lessonOrder === "final") return `quiz-${shortCourse}-final`;
  return `quiz-${shortCourse}-l${String(lessonOrder).padStart(2, "0")}`;
}

/**
 * Builds the mapped lesson sections and reports source defects.
 *
 * @param {object[]} sections - Public source sections.
 * @param {Map} assetUrls - asset path -> mapped URL.
 * @param {string} where - Error location prefix.
 * @param {Function} error - Error collector.
 * @return {object[]} Firestore section values.
 */
function mapSections(sections, assetUrls, where, error) {
  if (!Array.isArray(sections) || sections.length === 0) {
    error("MISSING_FIELD", where, "sections must be a non-empty array");
    return [];
  }
  const mapped = [];
  const seenIds = new Set();

  sections.forEach((section, index) => {
    const at = `${where}.sections[${index}]`;
    if (!section || typeof section !== "object") {
      error("MISSING_FIELD", at, "section must be an object");
      return;
    }
    const id = section.sectionId;
    if (typeof id !== "string" || !id) {
      error("MISSING_FIELD", at, "sectionId is required");
    } else if (seenIds.has(id)) {
      error("DUPLICATE_ID", at, `duplicate sectionId ${id}`);
    } else {
      seenIds.add(id);
    }
    if (!section || section.order !== index + 1) {
      error("BROKEN_ORDER", at, `order must be ${index + 1}`);
    }
    if (!section || !["text", "example", "image", "video"].includes(section.type)) {
      error("INVALID_TYPE", at, "unknown section type");
      return;
    }

    const base = {sectionId: id, order: section.order, type: section.type};
    if (section.type === "text" || section.type === "example") {
      if (!isLocalized(section.text)) error("MISSING_FIELD", at, "text.en/ar required");
      base.text = section.text;
    } else if (section.type === "image") {
      if (typeof section.asset !== "string" || !section.asset) {
        error("MISSING_FIELD", at, "asset is required");
      } else if (!assetUrls.has(section.asset)) {
        error("BROKEN_REFERENCE", at, `asset ${section.asset} is not in the manifest`);
      }
      if (!isLocalized(section.alt)) error("MISSING_FIELD", at, "alt.en/ar required");
      if (!isLocalized(section.caption)) error("MISSING_FIELD", at, "caption.en/ar required");
      base.imageUrl = assetUrls.get(section.asset) || "";
      base.alt = section.alt;
      base.caption = section.caption;
    } else {
      if (section.provider !== "youtube") {
        error("INVALID_TYPE", at, "provider must be youtube");
      }
      if (typeof section.videoId !== "string" ||
        !/^[A-Za-z0-9_-]{11}$/.test(section.videoId)) {
        error("MISSING_FIELD", at, "videoId must be an 11-character YouTube ID");
      }
      if (!isLocalized(section.caption)) error("MISSING_FIELD", at, "caption.en/ar required");
      if (!isLocalized(section.fallback)) error("MISSING_FIELD", at, "fallback.en/ar required");
      base.videoUrl = `https://www.youtube.com/watch?v=${section.videoId}`;
      base.caption = section.caption;
      base.fallback = section.fallback;
    }
    mapped.push(base);
  });
  return mapped;
}

/**
 * Validates the public checkpoint projection.
 *
 * @param {object} checkpoint - Public checkpoint.
 * @param {Set} sectionIds - Section IDs of the same lesson.
 * @param {string} where - Error location prefix.
 * @param {Function} error - Error collector.
 * @return {void}
 */
function validateCheckpoint(checkpoint, sectionIds, where, error) {
  if (!checkpoint || typeof checkpoint !== "object") {
    error("MISSING_FIELD", where, "checkpoint is required");
    return;
  }
  if (!sectionIds.has(checkpoint.afterSectionId)) {
    error("BROKEN_REFERENCE", `${where}.afterSectionId`,
      `unknown section ${checkpoint.afterSectionId}`);
  }
  if (!isLocalized(checkpoint.question)) {
    error("MISSING_FIELD", `${where}.question`, "question.en/ar required");
  }
  if (!Array.isArray(checkpoint.options) || checkpoint.options.length < 2 ||
    checkpoint.options.length > 4) {
    error("INVALID_OPTIONS", `${where}.options`, "expected 2 to 4 options");
    return;
  }
  const ids = new Set();
  for (const [index, option] of checkpoint.options.entries()) {
    const at = `${where}.options[${index}]`;
    if (!option || typeof option.optionId !== "string" || !option.optionId) {
      error("MISSING_FIELD", at, "optionId is required");
    } else if (ids.has(option.optionId)) {
      error("DUPLICATE_ID", at, `duplicate optionId ${option.optionId}`);
    } else {
      ids.add(option.optionId);
    }
    if (!isLocalized(option.text)) error("MISSING_FIELD", at, "text.en/ar required");
  }
}

/**
 * Builds one deterministic bank question from a lesson's public checkpoint.
 *
 * @param {object} quiz - Public quiz definition.
 * @param {object} checkpoint - Source checkpoint used for the options.
 * @param {object} answer - Server-only answer row.
 * @param {number} index - One-based question number.
 * @return {object} Server-only question document.
 */
function buildQuestion(quiz, checkpoint, answer, index) {
  const lessonSource = quiz.lessonId || quiz.courseId;
  const prompt = index === 1 && quiz.type === "lesson" && checkpoint ?
    checkpoint.question :
    {
      en: `Which statement about ${lessonSource} is correct? (question ${index})`,
      ar: `أي عبارة حول ${lessonSource} صحيحة؟ (السؤال ${index})`,
    };

  return {
    questionId: `q${String(index).padStart(3, "0")}`,
    type: "mcq",
    prompt,
    options: checkpoint.options.map((option) => ({
      optionId: option.optionId,
      text: option.text,
    })),
    correctOptionIds: [answer.correctOptionId],
    explanation: {
      en: `The approved correct option is ${answer.correctOptionId}.`,
      ar: `الخيار الصحيح المعتمد هو ${answer.correctOptionId}.`,
    },
    difficulty: ["easy", "medium", "hard"][index % 3],
    tags: ["imported", quiz.type],
    sourceRef: quiz.lessonId ? `${quiz.lessonId}#checkpoint` : `${quiz.courseId}#final`,
  };
}

/**
 * Validates every source and builds the Firestore write set.
 *
 * No write is performed here. A non-ok result must abort stage/publish.
 *
 * @param {object} model - Source model from loadSources().
 * @param {object} options - Build options.
 * @param {string} options.version - Version ID to stage.
 * @param {string} options.imageUrlBase - Base URL for mapped SVG assets.
 * @param {number} options.now - Timestamp in milliseconds.
 * @return {object} Validation result with public/protected write entries.
 */
function validateSources(model, {
  version = "v004",
  imageUrlBase = DEFAULT_ASSET_BASE_URL,
  now = Date.now(),
} = {}) {
  const errors = [];
  const error = (code, where, message) => errors.push({code, where, message});
  const assets = model.media.map((file) => ({
    asset: file.asset,
    bytes: file.bytes,
    sha256: crypto.createHash("sha256").update(file.bytes).digest("hex"),
    imageUrl: `${imageUrlBase.replace(/\/$/, "")}/${version}/${file.asset}`,
  }));
  const assetUrls = new Map(assets.map((item) => [item.asset, item.imageUrl]));

  if (typeof model.manifest.contentVersion !== "string" ||
    !model.manifest.contentVersion) {
    error("MISSING_FIELD", "manifest.json", "contentVersion is required");
  }
  if (model.manifest.formatVersion !== 1) {
    error("INVALID_FORMAT", "manifest.json", "formatVersion must be 1");
  }
  const declared = [
    "manifest.json",
    "catalog.json",
    "README.md",
    ...model.manifest.courses,
    ...model.manifest.lessons,
    ...model.manifest.media,
  ].sort();
  if (JSON.stringify(declared) !== JSON.stringify(model.files)) {
    error("MANIFEST_MISMATCH", "manifest.json",
      `declared files differ from disk: ${model.files.filter((f) => !declared.includes(f)).join(", ")}`);
  }
  if (model.courses.length !== 6) {
    error("COURSE_COUNT", "manifest.courses", "exactly 6 courses are required");
  }

  const coursesById = new Map();
  for (const [index, course] of model.courses.entries()) {
    const where = `course[${index}]`;
    if (!course.courseId) error("MISSING_FIELD", where, "courseId is required");
    if (coursesById.has(course.courseId)) {
      error("DUPLICATE_ID", where, `duplicate courseId ${course.courseId}`);
    }
    coursesById.set(course.courseId, course);
    if (course.order !== index + 1) {
      error("BROKEN_ORDER", where, `order must be ${index + 1}`);
    }
    if (course.status !== "approved") {
      error("NOT_APPROVED", where, "status must be approved");
    }
    if (course.contentVersion !== model.manifest.contentVersion) {
      error("VERSION_MISMATCH", where, "contentVersion differs from the manifest");
    }
    if (!isLocalized(course.title)) {
      error("MISSING_FIELD", `${where}.title`, "title.en/ar required");
    }
    if (!isLocalized(course.description)) {
      error("MISSING_FIELD", `${where}.description`, "description.en/ar required");
    }
    if (!Number.isInteger(course.estimatedMinutes) || course.estimatedMinutes <= 0) {
      error("MISSING_FIELD", where, "estimatedMinutes must be positive");
    }
  }

  const lessonsById = new Map();
  const lessonsByCourse = new Map();
  for (const [index, lesson] of model.lessons.entries()) {
    const where = `lesson[${index}]`;
    if (!lesson.lessonId) error("MISSING_FIELD", where, "lessonId is required");
    if (lessonsById.has(lesson.lessonId)) {
      error("DUPLICATE_ID", where, `duplicate lessonId ${lesson.lessonId}`);
    }
    lessonsById.set(lesson.lessonId, lesson);
    if (!coursesById.has(lesson.courseId)) {
      error("BROKEN_REFERENCE", where, `unknown courseId ${lesson.courseId}`);
    }
    if (lesson.status !== "approved") error("NOT_APPROVED", where, "status must be approved");
    if (lesson.contentVersion !== model.manifest.contentVersion) {
      error("VERSION_MISMATCH", where, "contentVersion differs from the manifest");
    }
    if (!isLocalized(lesson.title)) {
      error("MISSING_FIELD", `${where}.title`, "title.en/ar required");
    }
    if (!isLocalized(lesson.summary)) {
      error("MISSING_FIELD", `${where}.summary`, "summary.en/ar required");
    }
    if (!Number.isInteger(lesson.estimatedMinutes) || lesson.estimatedMinutes <= 0) {
      error("MISSING_FIELD", where, "estimatedMinutes must be positive");
    }
    const coursePrefix = String(lesson.courseId).replace(/^course-/, "");
    if (!String(lesson.lessonId).startsWith(`lesson-${coursePrefix}-`)) {
      error("BROKEN_REFERENCE", where, "lessonId prefix must match courseId");
    }
    if (!lessonsByCourse.has(lesson.courseId)) lessonsByCourse.set(lesson.courseId, []);
    lessonsByCourse.get(lesson.courseId).push(lesson);
  }
  if (model.lessons.length < 12) {
    error("LESSON_COUNT", "manifest.lessons", "at least 12 lessons are required");
  }
  for (const [courseId, lessons] of lessonsByCourse) {
    if (lessons.length < 2) {
      error("LESSON_COUNT", courseId, "every course needs at least 2 lessons");
    }
    lessons.forEach((lesson, index) => {
      if (lesson.order !== index + 1) {
        error("BROKEN_ORDER", lesson.lessonId, `order must be ${index + 1}`);
      }
    });
  }

  for (const course of model.courses) {
    const expected = (lessonsByCourse.get(course.courseId) || [])
      .map((lesson) => lesson.lessonId).sort();
    const declaredLessons = Array.isArray(course.lessonIds) ? [...course.lessonIds].sort() : [];
    if (JSON.stringify(expected) !== JSON.stringify(declaredLessons)) {
      error("BROKEN_REFERENCE", course.courseId, "lessonIds do not match the lesson files");
    }
  }

  const catalogCourseIds = (model.catalog.courses || []).map((item) => item.courseId).sort();
  const catalogLessonIds = (model.catalog.lessons || []).map((item) => item.lessonId).sort();
  if (JSON.stringify(catalogCourseIds) !==
    JSON.stringify(model.courses.map((item) => item.courseId).sort())) {
    error("CATALOG_MISMATCH", "catalog.json", "course IDs differ from the course files");
  }
  if (JSON.stringify(catalogLessonIds) !==
    JSON.stringify(model.lessons.map((item) => item.lessonId).sort())) {
    error("CATALOG_MISMATCH", "catalog.json", "lesson IDs differ from the lesson files");
  }
  if (model.catalog.contentVersion !== model.manifest.contentVersion) {
    error("VERSION_MISMATCH", "catalog.json", "contentVersion differs from the manifest");
  }

  const publicEntries = [];
  const protectedEntries = [];
  const mappedLessons = new Map();

  for (const course of model.courses) {
    const lessonCount = (lessonsByCourse.get(course.courseId) || []).length;
    publicEntries.push([`contentVersions/${version}/courses/${course.courseId}`, {
      courseId: course.courseId,
      order: course.order,
      title: course.title,
      description: course.description,
      estimatedMinutes: course.estimatedMinutes,
      lessonCount,
      finalQuizId: course.finalQuizId,
      status: "approved",
      contentVersion: version,
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
    }]);
  }

  for (const lesson of model.lessons) {
    const at = lesson.lessonId;
    const sectionIds = new Set((lesson.sections || []).map((section) => section && section.sectionId));
    const sections = mapSections(lesson.sections, assetUrls, at, error);
    validateCheckpoint(lesson.checkpoint, sectionIds, `${at}.checkpoint`, error);
    const mapped = {
      lessonId: lesson.lessonId,
      courseId: lesson.courseId,
      order: lesson.order,
      title: lesson.title,
      summary: lesson.summary,
      estimatedMinutes: lesson.estimatedMinutes,
      sections,
      checkpoint: lesson.checkpoint,
      quizId: lesson.quizId,
      status: "approved",
      contentVersion: version,
      updatedAt: Timestamp.fromMillis(now),
    };
    mappedLessons.set(lesson.lessonId, mapped);
    publicEntries.push([
      `contentVersions/${version}/courses/${lesson.courseId}/lessons/${lesson.lessonId}`,
      mapped,
    ]);
  }

  const keyByLesson = new Map();
  if (model.checkpointKeys.length !== model.lessons.length) {
    error("COUNT_MISMATCH", "checkpoint-keys.csv",
      `expected ${model.lessons.length} rows, got ${model.checkpointKeys.length}`);
  }
  for (const [index, row] of model.checkpointKeys.entries()) {
    const at = `checkpoint-keys.csv row ${index + 2}`;
    if (!row.lessonId || !lessonsById.has(row.lessonId)) {
      error("BROKEN_REFERENCE", at, `unknown lessonId ${row.lessonId}`);
      continue;
    }
    if (keyByLesson.has(row.lessonId)) {
      error("DUPLICATE_ID", at, `duplicate lessonId ${row.lessonId}`);
      continue;
    }
    keyByLesson.set(row.lessonId, row);
    const lesson = lessonsById.get(row.lessonId);
    const options = (lesson.checkpoint && lesson.checkpoint.options || [])
      .map((option) => option && option.optionId);
    if (!options.includes(row.correctOptionId)) {
      error("BROKEN_REFERENCE", at, `correctOptionId ${row.correctOptionId} is not a public option`);
    }
    if (!row.explanationEn || !row.explanationAr) {
      error("MISSING_FIELD", at, "bilingual explanation is required");
      continue;
    }
    protectedEntries.push([
      `contentVersions/${version}/courses/${lesson.courseId}/lessons/${lesson.lessonId}/private/checkpointKey`,
      {
        checkpointId: lesson.checkpoint.checkpointId,
        correctOptionId: row.correctOptionId,
        explanation: {en: row.explanationEn, ar: row.explanationAr},
        updatedAt: Timestamp.fromMillis(now),
      },
    ]);
  }
  for (const lesson of model.lessons) {
    if (!keyByLesson.has(lesson.lessonId)) {
      error("MISSING_PRIVATE_KEY", lesson.lessonId, "no server-only checkpoint key");
    }
  }

  const answerByQuiz = new Map();
  if (model.quizAnswers.length !== model.courses.length + model.lessons.length) {
    error("COUNT_MISMATCH", "quiz-answers.csv",
      `expected ${model.courses.length + model.lessons.length} rows, got ${model.quizAnswers.length}`);
  }
  for (const [index, row] of model.quizAnswers.entries()) {
    const at = `quiz-answers.csv row ${index + 2}`;
    if (!row.quizId) {
      error("MISSING_FIELD", at, "quizId is required");
      continue;
    }
    if (answerByQuiz.has(row.quizId)) {
      error("DUPLICATE_ID", at, `duplicate quizId ${row.quizId}`);
      continue;
    }
    answerByQuiz.set(row.quizId, row);
  }

  const expectedQuizzes = [];
  for (const lesson of model.lessons) {
    expectedQuizzes.push({
      id: quizIdFor(lesson.courseId, lesson.order),
      type: "lesson",
      courseId: lesson.courseId,
      lessonId: lesson.lessonId,
      order: lesson.order,
      questionCount: 10,
      timeLimitMinutes: 15,
      passingScore: 7,
      checkpoint: lesson.checkpoint,
      sourceLesson: lesson,
    });
    const resolved = lesson.quizId === quizIdFor(lesson.courseId, lesson.order);
    if (!resolved) {
      error("BROKEN_REFERENCE", lesson.lessonId,
        `quizId ${lesson.quizId} does not resolve to the lesson quiz`);
    }
  }
  for (const course of model.courses) {
    const finalId = quizIdFor(course.courseId, "final");
    const firstLesson = (lessonsByCourse.get(course.courseId) || [])[0];
    expectedQuizzes.push({
      id: finalId,
      type: "final",
      courseId: course.courseId,
      lessonId: null,
      order: 999,
      questionCount: 20,
      timeLimitMinutes: 30,
      passingScore: 14,
      checkpoint: firstLesson && firstLesson.checkpoint,
      sourceLesson: firstLesson,
    });
    if (course.finalQuizId !== finalId) {
      error("BROKEN_REFERENCE", course.courseId,
        `finalQuizId ${course.finalQuizId} does not resolve to the final quiz`);
    }
  }

  for (const spec of expectedQuizzes) {
    const answer = answerByQuiz.get(spec.id);
    const at = `quiz ${spec.id}`;
    if (!answer) {
      error("MISSING_PRIVATE_KEY", at, "no server-only quiz answer row");
      continue;
    }
    const bankSize = Number.parseInt(answer.bankSize, 10);
    if (!Number.isInteger(bankSize) || bankSize < spec.questionCount) {
      error("BANK_TOO_SMALL", at,
        `bankSize ${answer.bankSize} is below questionCount ${spec.questionCount}`);
      continue;
    }
    if (!spec.checkpoint || !Array.isArray(spec.checkpoint.options)) {
      error("BROKEN_REFERENCE", at, "no public checkpoint supplies the bank options");
      continue;
    }
    const optionIds = spec.checkpoint.options.map((option) => option.optionId);
    if (!optionIds.includes(answer.correctOptionId)) {
      error("BROKEN_REFERENCE", at, "correctOptionId is not one of the public options");
      continue;
    }

    const quiz = {
      quizId: spec.id,
      type: spec.type,
      courseId: spec.courseId,
      lessonId: spec.lessonId,
      order: spec.order,
      title: {
        en: spec.type === "final" ?
          `${coursesById.get(spec.courseId).title.en} Final` :
          `${spec.sourceLesson.title.en} Quiz`,
        ar: spec.type === "final" ?
          `الاختبار النهائي ${coursesById.get(spec.courseId).title.ar}` :
          `اختبار ${spec.sourceLesson.title.ar}`,
      },
      timeLimitMinutes: spec.timeLimitMinutes,
      questionCount: spec.questionCount,
      passingScore: spec.passingScore,
      passingPercent: 70,
      maxAttemptsPerCycle: 3,
      cooldownMinutes: 30,
      bankSize,
      status: "approved",
      contentVersion: version,
    };
    publicEntries.push([`contentVersions/${version}/quizzes/${spec.id}`, quiz]);
    protectedEntries.push([`contentVersions/${version}/quizBanks/${spec.id}`, {
      quizId: spec.id,
      type: spec.type,
      courseId: spec.courseId,
      lessonId: spec.lessonId,
      questionCount: bankSize,
      checksum: crypto.createHash("sha256").update(`${spec.id}:${bankSize}`).digest("hex"),
      updatedAt: Timestamp.fromMillis(now),
    }]);
    for (let index = 1; index <= bankSize; index += 1) {
      const question = buildQuestion(quiz, spec.checkpoint, answer, index);
      protectedEntries.push([
        `contentVersions/${version}/quizBanks/${spec.id}/questions/${question.questionId}`,
        question,
      ]);
    }
  }

  for (const [documentPath, document] of publicEntries) {
    const found = [];
    scanForbidden(document, found);
    if (found.length > 0) {
      error("PROTECTED_LEAK", documentPath, `client-readable document has ${found.join(", ")}`);
    }
  }

  const checksum = sourceChecksum(model);
  const entries = [
    [`contentVersions/${version}`, {
      contentVersion: version,
      formatVersion: 1,
      status: "staging",
      courseCount: model.courses.length,
      lessonCount: model.lessons.length,
      quizCount: expectedQuizzes.length,
      checksum,
      assets: assets.map(({asset, imageUrl, sha256, bytes}) => ({
        asset,
        imageUrl,
        sha256,
        bytes: bytes.length,
      })),
      createdAt: Timestamp.fromMillis(now),
      createdBy: "n3-04-importer",
      publishedAt: null,
      publishedBy: null,
      archivedAt: null,
      rollbackOf: null,
      validation: {
        ok: errors.length === 0,
        errors: errors.map((item) => `${item.code}: ${item.where}`),
        validatedAt: Timestamp.fromMillis(now),
      },
      notes: "N3-04 validated import of backend/content (public) + import-data (server-only)",
    }],
    ...publicEntries,
    ...protectedEntries,
  ];

  return {
    ok: errors.length === 0,
    errors,
    checksum,
    version,
    counts: {
      courses: model.courses.length,
      lessons: model.lessons.length,
      quizzes: expectedQuizzes.length,
      checkpointKeys: keyByLesson.size,
      questions: protectedEntries.filter(([p]) => p.includes("/questions/")).length,
      documents: entries.length,
      assets: assets.length,
    },
    assets,
    entries,
  };
}

/**
 * Writes SVG bytes to the local asset store and verifies them by digest.
 * Set CONTENT_ASSETS_BUCKET in production to upload to Cloud Storage instead.
 *
 * @param {object} options - Upload options.
 * @param {object[]} options.assets - Assets from validateSources().
 * @param {string} options.version - Version ID (path segment).
 * @param {string} options.destDir - Local asset root.
 * @return {object[]} Verified upload records.
 */
function publishAssets({
  assets,
  version,
  destDir = DEFAULT_ASSET_DIR,
}) {
  return assets.map((asset) => {
    const destination = path.join(destDir, version, ...asset.asset.split("/"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, asset.bytes);
    const written = fs.readFileSync(destination);
    const sha256 = crypto.createHash("sha256").update(written).digest("hex");
    if (sha256 !== asset.sha256) {
      throw new Error(`Asset verification failed for ${asset.asset}`);
    }
    return {
      asset: asset.asset,
      destination,
      bytes: written.length,
      sha256,
      imageUrl: asset.imageUrl,
    };
  });
}

/**
 * Creates an Admin SDK Firestore client for the local emulator or a project.
 *
 * @param {object} options - Connection options.
 * @param {string} options.projectId - Firestore project namespace.
 * @return {object} Admin Firestore instance.
 */
function getAdminDb({projectId = process.env.GCLOUD_PROJECT || "demo-networking-p1"} = {}) {
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  process.env.NO_GCE_CHECK = "true";
  const name = `content-import-${projectId}`;
  const app = getApps().some((item) => item.name === name) ?
    getApp(name) : initializeApp({projectId}, name);
  return getFirestore(app);
}

/**
 * Writes a validated import into staging. Callers must check result.ok first.
 *
 * @param {object} db - Admin Firestore.
 * @param {object} options - Stage options.
 * @param {object[]} options.entries - Entries from validateSources().
 * @param {number} options.chunkSize - Maximum writes per batch.
 * @return {object} Write counts.
 */
async function stage(db, {entries, chunkSize = 400}) {
  let written = 0;
  for (let offset = 0; offset < entries.length; offset += chunkSize) {
    const batch = db.batch();
    for (const [documentPath, data] of entries.slice(offset, offset + chunkSize)) {
      batch.set(db.doc(documentPath), data);
    }
    await batch.commit();
    written += Math.min(chunkSize, entries.length - offset);
  }
  return {written, batches: Math.ceil(entries.length / chunkSize)};
}

/**
 * Reads a staging version without exposing it through an active pointer.
 *
 * @param {object} db - Admin Firestore.
 * @param {string} version - Version ID.
 * @return {object} Preview summary.
 */
async function preview(db, version) {
  const prefix = `contentVersions/${version}`;
  const [versionSnap, pointerSnap, coursesSnap] = await Promise.all([
    db.doc(prefix).get(),
    db.doc(POINTER_PATH).get(),
    db.collection(`${prefix}/courses`).get(),
  ]);
  if (!versionSnap.exists) throw new Error(`VERSION_MISSING: ${version}`);

  let lessonCount = 0;
  for (const course of coursesSnap.docs) {
    const lessons = await db.collection(`${prefix}/courses/${course.id}/lessons`).get();
    lessonCount += lessons.size;
  }
  const quizzesSnap = await db.collection(`${prefix}/quizzes`).get();
  const data = versionSnap.data();
  return {
    version,
    status: data.status,
    validation: data.validation || null,
    checksum: data.checksum || null,
    activeVersion: pointerSnap.exists ? pointerSnap.data().contentVersion : null,
    visibleToClients: pointerSnap.exists && pointerSnap.data().contentVersion === version,
    courseCount: coursesSnap.size,
    lessonCount,
    quizCount: quizzesSnap.size,
    courses: coursesSnap.docs
      .sort((left, right) => left.data().order - right.data().order)
      .map((course) => ({courseId: course.id, title: course.data().title})),
  };
}

/**
 * Atomically activates a validated staging version.
 *
 * @param {object} db - Admin Firestore.
 * @param {object} options - Publish options.
 * @param {string} options.version - Staging version ID.
 * @param {string} options.actor - Admin identity recorded in the pointer.
 * @param {number} options.now - Timestamp in milliseconds.
 * @return {object} Previous version ID.
 */
async function publish(db, {version, actor = "n3-04-importer", now = Date.now()}) {
  const pointerRef = db.doc(POINTER_PATH);
  const versionRef = db.doc(`contentVersions/${version}`);
  let previousId = null;

  await db.runTransaction(async (transaction) => {
    const [pointerSnap, versionSnap] = await Promise.all([
      transaction.get(pointerRef),
      transaction.get(versionRef),
    ]);
    if (!pointerSnap.exists) throw new Error("POINTER_MISSING");
    if (!versionSnap.exists) throw new Error(`VERSION_MISSING: ${version}`);
    const data = versionSnap.data();
    if (data.status !== "staging") throw new Error(`NOT_STAGING: ${data.status}`);
    if (!data.validation || data.validation.ok !== true) throw new Error("NOT_VALIDATED");

    previousId = pointerSnap.data().contentVersion;
    if (previousId === version) throw new Error("ALREADY_ACTIVE");
    const previousRef = db.doc(`contentVersions/${previousId}`);
    const previousSnap = await transaction.get(previousRef);
    if (!previousSnap.exists) throw new Error(`PREVIOUS_MISSING: ${previousId}`);

    const at = Timestamp.fromMillis(now);
    transaction.update(versionRef, {status: "published", publishedAt: at, publishedBy: actor});
    transaction.update(pointerRef, {
      contentVersion: version,
      previousContentVersion: previousId,
      checksum: data.checksum,
      publishedAt: at,
      publishedBy: actor,
      status: "published",
    });
    transaction.update(previousRef, {status: "archived", archivedAt: at});
  });
  return {previousId};
}

/**
 * Atomically restores the previous version and marks the bad one rolledBack.
 *
 * @param {object} db - Admin Firestore.
 * @param {object} options - Rollback options.
 * @param {string} options.version - Currently active bad version.
 * @param {string} options.restoreVersion - Version to restore.
 * @param {string} options.actor - Admin identity recorded in the pointer.
 * @param {number} options.now - Timestamp in milliseconds.
 * @return {object} Restored version ID.
 */
async function rollback(db, {
  version,
  restoreVersion,
  actor = "n3-04-importer",
  now = Date.now(),
}) {
  if (!restoreVersion) throw new Error("RESTORE_VERSION_REQUIRED");
  const pointerRef = db.doc(POINTER_PATH);
  const badRef = db.doc(`contentVersions/${version}`);
  const restoreRef = db.doc(`contentVersions/${restoreVersion}`);

  await db.runTransaction(async (transaction) => {
    const [pointerSnap, badSnap, restoreSnap] = await Promise.all([
      transaction.get(pointerRef),
      transaction.get(badRef),
      transaction.get(restoreRef),
    ]);
    if (!pointerSnap.exists) throw new Error("POINTER_MISSING");
    if (pointerSnap.data().contentVersion !== version) throw new Error("NOT_ACTIVE");
    if (!badSnap.exists) throw new Error(`VERSION_MISSING: ${version}`);
    if (!restoreSnap.exists) throw new Error(`VERSION_MISSING: ${restoreVersion}`);
    if (restoreVersion === version) throw new Error("RESTORE_IS_ACTIVE");

    const at = Timestamp.fromMillis(now);
    const restoreData = restoreSnap.data();
    transaction.update(pointerRef, {
      contentVersion: restoreVersion,
      previousContentVersion: null,
      checksum: restoreData.checksum,
      publishedAt: at,
      publishedBy: actor,
      status: "published",
    });
    transaction.update(badRef, {status: "rolledBack", archivedAt: at});
    transaction.update(restoreRef, {
      status: "published",
      publishedAt: at,
      publishedBy: actor,
      archivedAt: null,
      rollbackOf: version,
    });
  });
  return {restoredVersion: restoreVersion};
}

module.exports = {
  POINTER_PATH,
  DEFAULT_ASSET_BASE_URL,
  DEFAULT_ASSET_DIR,
  DEFAULT_CONTENT_ROOT,
  DEFAULT_PROTECTED_ROOT,
  loadSources,
  parseCsv,
  sourceChecksum,
  validateSources,
  publishAssets,
  getAdminDb,
  stage,
  preview,
  publish,
  rollback,
};
