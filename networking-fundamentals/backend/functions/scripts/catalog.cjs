/* eslint-disable */
/**
 * N3-01 locked course catalog, sourced from the Git content tree (N3-03).
 *
 * The normative data lives in `backend/content/catalog.json`; this module
 * maps it to the compact shape used by `fixtures.cjs` and
 * `tests/catalog.test.cjs`, so there is exactly one catalog source.
 *
 * Course IDs and lesson IDs are permanent. See `backend/docs/catalog-n3.md`.
 */

const catalog = require("../../content/catalog.json");

const COURSES = catalog.courses.map((course) => ({
  id: course.courseId,
  order: course.order,
  title: [course.title.en, course.title.ar],
  description: [course.description.en, course.description.ar],
  estimatedMinutes: course.estimatedMinutes,
}));

const LESSONS = catalog.lessons.map((lesson) => ({
  id: lesson.lessonId,
  courseId: lesson.courseId,
  order: lesson.order,
  title: [lesson.title.en, lesson.title.ar],
  summary: [lesson.summary.en, lesson.summary.ar],
}));

module.exports = {COURSES, LESSONS};
