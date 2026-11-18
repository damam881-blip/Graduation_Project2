/**
 * N3-05 - approved AI knowledge exporter.
 *
 * Reads the active published content version with the Admin SDK, derives
 * bilingual AI source sections from approved lesson prose only, and writes
 * them under contentVersions/{version}/aiSections/** (server-only).
 *
 * The exporter never reads quizBanks/** or checkpoint keys, never copies a
 * quizId/checkpoint/correct answer, and does not change the D-09 client read
 * path or firestore.rules. V-11 is enforced by validating both the source
 * documents and every generated section before any write.
 *
 * Contract: backend/docs/ai-export-n3.md.
 */

"use strict";

const crypto = require("node:crypto");
const {getAdminDb} = require("./content-import.cjs");

const POINTER_PATH = "system/publishedContentVersion";
const VERSION_RE = /^v\d{3}$/;
const LANGUAGES = ["en", "ar"];

// Public lessons legitimately contain quizId/checkpoint/question/options;
// those fields are ignored, never exported. Answer keys are rejected.
const FORBIDDEN_SOURCE_KEYS = [
  "correctOptionId",
  "correctOptionIds",
  "correctAnswer",
  "correctAnswers",
  "explanation",
  "review",
  "quizBank",
  "quizBanks",
  "bankSize",
];
const FORBIDDEN_DOCUMENT_KEYS = [
  ...FORBIDDEN_SOURCE_KEYS,
  "quizId",
  "quizIds",
  "finalQuizId",
  "checkpoint",
  "checkpointId",
  "question",
  "questions",
  "options",
  "private",
];
const FORBIDDEN_VALUE_PATTERNS = [
  /quiz-c0[1-6]-(?:l\d{2}|final)/i,
  /\bcorrectOption(?:Ids?)?\b/i,
  /\bcorrect\s+answers?\b/i,
  /\bcorrectAnswers?\b/i,
  /\bexplanation\b/i,
];

/**
 * Returns a localized string for one language.
 *
 * @param {unknown} value - Localized object or plain string.
 * @param {string} language - Language code.
 * @return {string} The string, or an empty string.
 */
function localized(value, language) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const text = value[language];
  return typeof text === "string" ? text.trim() : "";
}

/**
 * Converts approved Markdown prose into plain text.
 *
 * @param {string} text - Source text.
 * @return {string} Plain text with normalized whitespace.
 */
function toPlainText(text) {
  return String(text)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hashes a canonical JSON representation.
 *
 * @param {unknown} value - Value to hash.
 * @return {string} Lowercase SHA-256 hex digest.
 */
function hash(value) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

/**
 * Recursively scans a source value for protected assessment keys.
 *
 * @param {unknown} value - Value to scan.
 * @param {string} where - Error location prefix.
 * @param {string[]} errors - Accumulator of validation errors.
 * @return {void}
 */
function scanSource(value, where, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSource(item, `${where}[${index}]`, errors));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_SOURCE_KEYS.includes(key)) {
      errors.push({
        code: "PROTECTED_LEAK",
        where: `${where}.${key}`,
        message: `${key} must never enter the AI export`,
      });
    }
    scanSource(child, `${where}.${key}`, errors);
  }
}

/**
 * Validates one generated AI section before it can be written.
 *
 * @param {object} document - Generated section document.
 * @param {string} where - Error location prefix.
 * @param {string[]} errors - Accumulator of validation errors.
 * @return {void}
 */
function validateSection(document, where, errors) {
  for (const key of FORBIDDEN_DOCUMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(document, key)) {
      errors.push({
        code: "PROTECTED_LEAK",
        where: `${where}.${key}`,
        message: `${key} must never enter the AI export`,
      });
    }
  }
  const walk = (value, path) => {
    if (typeof value === "string") {
      for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
        if (pattern.test(value)) {
          errors.push({
            code: "PROTECTED_LEAK",
            where: path,
            message: `forbidden assessment token in ${path}`,
          });
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        walk(child, `${path}.${key}`);
      }
    }
  };
  walk(document, where);

  if (!/^ai-c\d{2}-(?:l\d{2}|course)-\d{3}$/.test(document.sectionId || "")) {
    errors.push({code: "INVALID_ID", where, message: "invalid aiSectionId"});
  }
  if (!LANGUAGES.includes(document.language)) {
    errors.push({code: "INVALID_LANGUAGE", where, message: "language must be en or ar"});
  }
  if (typeof document.body !== "string" || document.body.length === 0) {
    errors.push({code: "MISSING_FIELD", where: `${where}.body`, message: "body is required"});
  }
  if (!Array.isArray(document.keywords) || document.keywords.length === 0) {
    errors.push({code: "MISSING_FIELD", where: `${where}.keywords`, message: "keywords are required"});
  }
  if (document.approved !== true) {
    errors.push({code: "NOT_APPROVED", where, message: "approved must be true"});
  }
}

/**
 * Builds the approved plain-text body for one lesson and language.
 *
 * @param {object} lesson - Published lesson document.
 * @param {string} language - Language code.
 * @return {string} Plain-text body.
 */
function buildBody(lesson, language) {
  const parts = [];
  const summary = localized(lesson.summary, language);
  if (summary) parts.push(toPlainText(summary));

  for (const section of Array.isArray(lesson.sections) ? lesson.sections : []) {
    if (!section || typeof section !== "object") continue;
    if (section.type === "text" || section.type === "example") {
      const text = localized(section.text, language);
      if (text) parts.push(toPlainText(text));
      continue;
    }
    const caption = localized(section.caption, language);
    const alt = localized(section.alt, language);
    const fallback = localized(section.fallback, language);
    const text = caption || alt || fallback;
    if (text) parts.push(toPlainText(text));
  }
  return [...new Set(parts.filter(Boolean))].join("\n");
}

/**
 * Builds stable retrieval keywords from approved prose.
 *
 * @param {object} course - Course document.
 * @param {object} lesson - Lesson document.
 * @param {string} body - Generated body.
 * @param {string} language - Language code.
 * @return {string[]} Stable keywords.
 */
function buildKeywords(course, lesson, body, language) {
  const source = [
    course.courseId,
    lesson.lessonId,
    localized(course.title, language),
    localized(lesson.title, language),
    body,
  ].join(" ");
  const tokens = source.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [];
  const unique = [...new Set(tokens)];
  return unique.length > 0 ? unique.slice(0, 12) : [lesson.lessonId];
}

/**
 * Builds one AI section document for a lesson and language.
 *
 * @param {object} course - Approved course document.
 * @param {object} lesson - Approved lesson document.
 * @param {string} version - Pinned content version.
 * @param {string} language - Language code.
 * @return {object} Section document without its checksum.
 */
function buildSection(course, lesson, version, language) {
  const courseNumber = String(course.courseId).slice(-2);
  const lessonNumber = String(lesson.lessonId).split("-").pop();
  const suffix = language === "en" ? "001" : "002";
  const heading = localized(lesson.title, language);
  const body = buildBody(lesson, language);
  const section = {
    sectionId: `ai-c${courseNumber}-l${lessonNumber}-${suffix}`,
    courseId: course.courseId,
    lessonId: lesson.lessonId,
    language,
    heading,
    body,
    keywords: buildKeywords(course, lesson, body, language),
    sourceRef: `${lesson.lessonId}#sections`,
    order: ((Number(lesson.order) - 1) * 2) + (language === "en" ? 1 : 2),
    approved: true,
  };
  return {...section, checksum: hash(section)};
}

/**
 * Builds and validates AI sections from approved course/lesson documents.
 *
 * @param {object} options - Builder options.
 * @param {object[]} options.courses - Published course documents.
 * @param {object[]} options.lessons - Published lesson documents.
 * @param {string} options.version - Pinned content version.
 * @return {object} Build result with entries ready for a Firestore batch.
 */
function buildAiSections({courses = [], lessons = [], version} = {}) {
  const errors = [];
  const entries = [];
  const seen = new Set();

  if (!VERSION_RE.test(version || "")) {
    errors.push({code: "INVALID_VERSION", where: "version", message: "expected ^v\\d{3}$"});
  }
  if (!Array.isArray(courses) || courses.length === 0) {
    errors.push({code: "MISSING_FIELD", where: "courses", message: "no courses supplied"});
  }
  if (!Array.isArray(lessons) || lessons.length === 0) {
    errors.push({code: "MISSING_FIELD", where: "lessons", message: "no lessons supplied"});
  }

  const coursesById = new Map();
  for (const [index, course] of courses.entries()) {
    const where = `courses[${index}]`;
    scanSource(course, where, errors);
    if (course.status !== "approved") {
      errors.push({code: "NOT_APPROVED", where, message: "course is not approved"});
    }
    if (course.contentVersion && course.contentVersion !== version) {
      errors.push({code: "VERSION_MISMATCH", where, message: "course version differs"});
    }
    if (!course.courseId || coursesById.has(course.courseId)) {
      errors.push({code: "DUPLICATE_ID", where, message: "missing or duplicate courseId"});
    } else {
      coursesById.set(course.courseId, course);
    }
    if (!localized(course.title, "en") || !localized(course.title, "ar")) {
      errors.push({code: "MISSING_FIELD", where: `${where}.title`, message: "bilingual title required"});
    }
  }

  for (const [index, lesson] of lessons.entries()) {
    const where = `lessons[${index}]`;
    scanSource(lesson, where, errors);
    if (lesson.status !== "approved") {
      errors.push({code: "NOT_APPROVED", where, message: "lesson is not approved"});
    }
    if (lesson.contentVersion && lesson.contentVersion !== version) {
      errors.push({code: "VERSION_MISMATCH", where, message: "lesson version differs"});
    }
    const course = coursesById.get(lesson.courseId);
    if (!course) {
      errors.push({code: "BROKEN_REFERENCE", where, message: `unknown course ${lesson.courseId}`});
      continue;
    }
    if (!localized(lesson.title, "en") || !localized(lesson.title, "ar")) {
      errors.push({code: "MISSING_FIELD", where: `${where}.title`, message: "bilingual title required"});
    }
    if (!localized(lesson.summary, "en") || !localized(lesson.summary, "ar")) {
      errors.push({code: "MISSING_FIELD", where: `${where}.summary`, message: "bilingual summary required"});
    }
    if (!Number.isInteger(lesson.order) || lesson.order < 1) {
      errors.push({code: "BROKEN_ORDER", where, message: "lesson order must be positive"});
    }
    if (!/^lesson-\d{2}-\d{2}$/.test(lesson.lessonId || "")) {
      errors.push({code: "INVALID_ID", where, message: "invalid lessonId"});
    }
    for (const language of LANGUAGES) {
      const body = buildBody(lesson, language);
      if (!body) {
        errors.push({
          code: "MISSING_FIELD",
          where: `${where}.sections.${language}`,
          message: "approved prose is required in both languages",
        });
        continue;
      }
      const document = buildSection(course, lesson, version, language);
      validateSection(document, `${where}.${language}`, errors);
      if (seen.has(document.sectionId)) {
        errors.push({code: "DUPLICATE_ID", where, message: `duplicate ${document.sectionId}`});
      }
      seen.add(document.sectionId);
      entries.push([`contentVersions/${version}/aiSections/${document.sectionId}`, document]);
    }
  }

  const checksum = hash({
    version,
    entries: entries.map(([path, document]) => ({path, checksum: document.checksum})),
  });
  return {
    ok: errors.length === 0,
    errors,
    version,
    entries,
    checksum,
    counts: {
      courses: coursesById.size,
      lessons: new Set(lessons.map((lesson) => lesson.lessonId)).size,
      sections: entries.length,
    },
  };
}

/**
 * Resolves and validates the content version to export.
 *
 * @param {object} db - Admin Firestore.
 * @param {object} options - Resolver options.
 * @param {string} options.version - Explicit version, or null for the pointer.
 * @return {object} Version resolution result.
 */
async function resolveVersion(db, {version = null} = {}) {
  const errors = [];
  let pointerVersion = null;
  const pointer = await db.doc(POINTER_PATH).get();
  if (pointer.exists) {
    pointerVersion = pointer.data().contentVersion || null;
  }
  const resolved = version || pointerVersion;
  if (!resolved) {
    errors.push({code: "POINTER_MISSING", where: POINTER_PATH, message: "no active version"});
    return {ok: false, errors, version: null, pointerVersion};
  }
  if (!VERSION_RE.test(resolved)) {
    errors.push({code: "INVALID_VERSION", where: POINTER_PATH, message: "invalid contentVersion"});
    return {ok: false, errors, version: resolved, pointerVersion};
  }
  const snapshot = await db.doc(`contentVersions/${resolved}`).get();
  if (!snapshot.exists) {
    errors.push({code: "VERSION_MISSING", where: resolved, message: "version document missing"});
    return {ok: false, errors, version: resolved, pointerVersion};
  }
  if (snapshot.data().status !== "published") {
    errors.push({code: "NOT_PUBLISHED", where: resolved, message: "version is not published"});
  }
  return {
    ok: errors.length === 0,
    errors,
    version: resolved,
    pointerVersion,
    data: snapshot.data(),
  };
}

/**
 * Reads published course and lesson documents through path-scoped queries.
 *
 * @param {object} db - Admin Firestore.
 * @param {string} version - Published version ID.
 * @return {object} Course and lesson documents with their path IDs.
 */
async function readApprovedContent(db, version) {
  const courses = [];
  const lessons = [];
  const coursesSnap = await db.collection(`contentVersions/${version}/courses`).get();
  for (const courseDoc of coursesSnap.docs) {
    const course = {...courseDoc.data(), courseId: courseDoc.id};
    courses.push(course);
    const lessonsSnap = await db.collection(`${courseDoc.ref.path}/lessons`).get();
    for (const lessonDoc of lessonsSnap.docs) {
      const data = lessonDoc.data();
      lessons.push({
        ...data,
        lessonId: data.lessonId || lessonDoc.id,
        courseId: data.courseId || course.id,
      });
    }
  }
  return {courses, lessons};
}

/**
 * Validates the published content without writing anything.
 *
 * @param {object} db - Admin Firestore.
 * @param {object} options - Read options.
 * @param {string} options.version - Explicit version, or null for the pointer.
 * @return {object} Validation result with generated entries.
 */
async function validatePublished(db, {version = null} = {}) {
  const resolved = await resolveVersion(db, {version});
  if (!resolved.ok) {
    return {...resolved, entries: [], checksum: null, counts: null};
  }
  const content = await readApprovedContent(db, resolved.version);
  const built = buildAiSections({...content, version: resolved.version});
  return {...built, pointerVersion: resolved.pointerVersion};
}

/**
 * Writes generated AI sections in bounded batches.
 *
 * @param {object} db - Admin Firestore.
 * @param {object} options - Write options.
 * @param {Array} options.entries - [path, document] pairs.
 * @param {number} options.chunkSize - Maximum writes per batch.
 * @return {object} Write counts.
 */
async function writeSections(db, {entries, chunkSize = 400}) {
  let written = 0;
  for (let offset = 0; offset < entries.length; offset += chunkSize) {
    const batch = db.batch();
    for (const [path, document] of entries.slice(offset, offset + chunkSize)) {
      batch.set(db.doc(path), document);
    }
    await batch.commit();
    written += Math.min(chunkSize, entries.length - offset);
  }
  return {written, batches: Math.ceil(entries.length / chunkSize)};
}

/**
 * Exports approved AI sections from the published version.
 *
 * @param {object} db - Admin Firestore.
 * @param {object} options - Export options.
 * @param {string} options.version - Explicit version, or null for the pointer.
 * @param {number} options.chunkSize - Maximum writes per batch.
 * @return {object} Export result.
 */
async function exportPublished(db, {version = null, chunkSize = 400} = {}) {
  const validated = await validatePublished(db, {version});
  if (!validated.ok) return validated;
  const write = await writeSections(db, {
    entries: validated.entries,
    chunkSize,
  });
  return {
    ok: true,
    errors: [],
    version: validated.version,
    pointerVersion: validated.pointerVersion,
    checksum: validated.checksum,
    counts: validated.counts,
    write,
    sections: validated.entries.map(([path, document]) => ({
      path,
      sectionId: document.sectionId,
      language: document.language,
      order: document.order,
      checksum: document.checksum,
    })),
  };
}

/**
 * Lists exported sections for a version without reading their prose.
 *
 * @param {object} db - Admin Firestore.
 * @param {string} version - Version ID.
 * @return {object} Preview summary.
 */
async function preview(db, version) {
  if (!VERSION_RE.test(version || "")) throw new Error("INVALID_VERSION");
  const snapshot = await db.collection(`contentVersions/${version}/aiSections`).get();
  const sections = snapshot.docs
    .map((item) => ({sectionId: item.id, ...item.data()}))
    .sort((left, right) => left.order - right.order);
  return {
    version,
    sectionCount: sections.length,
    languages: [...new Set(sections.map((item) => item.language))].sort(),
    sections: sections.map((item) => ({
      sectionId: item.sectionId,
      courseId: item.courseId,
      lessonId: item.lessonId,
      language: item.language,
      order: item.order,
      approved: item.approved,
      checksum: item.checksum,
    })),
  };
}

module.exports = {
  POINTER_PATH,
  LANGUAGES,
  getAdminDb,
  buildAiSections,
  resolveVersion,
  validatePublished,
  writeSections,
  exportPublished,
  preview,
};
