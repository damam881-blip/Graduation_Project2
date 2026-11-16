/* eslint-disable */
/**
 * N2-03 emulator fixtures (catalog locked by N3-01).
 *
 * Seeds deterministic Guest/Student/Admin fixture data into the Firebase
 * emulators and verifies it against the N2-01/N2-02 schema invariants.
 *
 * This is a script, not deployed Functions code. It uses the Admin SDK because
 * scripts bypass the N2-04 least-privilege client rules by design.
 */

const assert = require("node:assert/strict");
const {getApps, initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");

const PROJECT_ID = "demo-networking-p1";
const CONTENT_VERSION = "v001";
const STAGING_VERSION = "v002";
const POINTER_PATH = "system/publishedContentVersion";

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || PROJECT_ID;
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
// The emulators ignore credentials; this only silences the metadata probe.
process.env.NO_GCE_CHECK = process.env.NO_GCE_CHECK || "true";

const UIDS = {
  student: "fixture-student-01",
  cooldown: "fixture-student-02",
  admin: "fixture-admin",
  disabled: "fixture-disabled",
  deleted: "fixture-deleted",
};

const ATTEMPT = {
  final1: "01J8Z3K4M5N6P7Q8R9S0T1V2W3",
  final2: "01J8Z3K4M5N6P7Q8R9S0T1V2W4",
  pass1: "01J8Z3K4M5N6P7Q8R9S0T1V2W5",
  pass2: "01J8Z3K4M5N6P7Q8R9S0T1V2W6",
  expired: "01J8Z3K4M5N6P7Q8R9S0T1V2W7",
  fail: "01J8Z3K4M5N6P7Q8R9S0T1V2W8",
  void: "01J8Z3K4M5N6P7Q8R9S0T1V2W9",
  active: "01J8Z3K4M5N6P7Q8R9S0T1V2X1",
  stale: "01J8Z3K4M5N6P7Q8R9S0T1V2X2",
  cooldown1: "01J8Z3K4M5N6P7Q8R9S0T1V2X3",
  cooldown2: "01J8Z3K4M5N6P7Q8R9S0T1V2X4",
  cooldown3: "01J8Z3K4M5N6P7Q8R9S0T1V2X5",
};

const AUDIT = {
  publish: "01J8Z3K4M5N6P7Q8R9S0T1V2Y3",
  role: "01J8Z3K4M5N6P7Q8R9S0T1V2Y4",
};

// N3-01: the catalog (IDs, order, bilingual titles/descriptions) is owned by
// scripts/catalog.cjs and validated by tests/catalog.test.cjs.
const {COURSES, LESSONS} = require("./catalog.cjs");

function initialize() {
  if (!getApps().length) {
    initializeApp({projectId: PROJECT_ID});
  }
  return {db: getFirestore(), auth: getAuth()};
}

function ts(ms) {
  return Timestamp.fromMillis(ms);
}

function localized(en, ar) {
  return {en, ar};
}

function courseNumber(courseId) {
  return courseId.slice(-2);
}

function lessonNumbers(lessonId) {
  const parts = lessonId.split("-");
  return {course: parts[1], lesson: parts[2]};
}

function lessonQuizId(lessonId) {
  const n = lessonNumbers(lessonId);
  return `quiz-c${n.course}-l${n.lesson}`;
}

function finalQuizId(courseId) {
  return `quiz-c${courseNumber(courseId)}-final`;
}

function rotate(items, by) {
  const offset = by % items.length;
  return items.slice(offset).concat(items.slice(0, offset));
}

function buildSections(lesson) {
  const title = localized(lesson.title[0], lesson.title[1]);
  const second = lesson.id === "lesson-01-01" ?
    {
      sectionId: "sec-02",
      order: 2,
      type: "image",
      imageUrl: "https://example.test/fixtures/network.svg",
      alt: localized("Network diagram", "مخطط شبكة"),
      caption: localized("Fixture image", "صورة تجريبية"),
    } :
    {
      sectionId: "sec-02",
      order: 2,
      type: "example",
      text: localized(
        `Example for ${title.en}.`,
        `مثال على ${title.ar}.`
      ),
    };

  return [
    {
      sectionId: "sec-01",
      order: 1,
      type: "text",
      text: localized(
        `Introduction to ${title.en}.`,
        `مقدمة إلى ${title.ar}.`
      ),
    },
    second,
    {
      sectionId: "sec-03",
      order: 3,
      type: "text",
      text: localized(
        `Summary of ${title.en}.`,
        `ملخص ${title.ar}.`
      ),
    },
  ];
}

function buildCheckpoint(lesson) {
  return {
    checkpointId: "cp-01",
    afterSectionId: "sec-02",
    question: localized(
      `Checkpoint for ${lesson.title[0]}.`,
      `نقطة تحقق لدرس ${lesson.title[1]}.`
    ),
    options: [
      {
        optionId: "a",
        text: localized("The correct fixture answer.", "الإجابة الصحيحة التجريبية."),
      },
      {
        optionId: "b",
        text: localized("A distractor fixture answer.", "إجابة مشتتة تجريبية."),
      },
    ],
    maxRetries: null,
  };
}

function buildCheckpointKey(lesson) {
  return {
    checkpointId: "cp-01",
    correctOptionId: "a",
    explanation: localized(
      `The checkpoint answer for ${lesson.title[0]} is option A.`,
      `إجابة نقطة التحقق لدرس ${lesson.title[1]} هي الخيار A.`
    ),
    updatedAt: ts(Date.now()),
  };
}

function buildLessonQuiz(lesson) {
  return {
    quizId: lessonQuizId(lesson.id),
    type: "lesson",
    courseId: lesson.courseId,
    lessonId: lesson.id,
    order: lesson.order,
    title: localized(
      `${lesson.title[0]} Quiz`,
      `اختبار ${lesson.title[1]}`
    ),
    timeLimitMinutes: 15,
    questionCount: 10,
    passingScore: 7,
    passingPercent: 70,
    maxAttemptsPerCycle: 3,
    cooldownMinutes: 30,
    bankSize: 12,
    status: "approved",
    contentVersion: CONTENT_VERSION,
  };
}

function buildFinalQuiz(course) {
  return {
    quizId: finalQuizId(course.id),
    type: "final",
    courseId: course.id,
    lessonId: null,
    order: 999,
    title: localized(
      `${course.title[0]} Final`,
      `الاختبار النهائي ${course.title[1]}`
    ),
    timeLimitMinutes: 30,
    questionCount: 20,
    passingScore: 14,
    passingPercent: 70,
    maxAttemptsPerCycle: 3,
    cooldownMinutes: 30,
    bankSize: 24,
    status: "approved",
    contentVersion: CONTENT_VERSION,
  };
}

function makeQuestions(quiz, count) {
  const questions = [];

  for (let i = 1; i <= count; i += 1) {
    const questionId = `q${String(i).padStart(3, "0")}`;
    const isTrueFalse = i % 5 === 0;
    const optionIds = isTrueFalse ? ["true", "false"] : ["a", "b", "c", "d"];
    const options = optionIds.map((optionId) => ({
      optionId,
      text: isTrueFalse ?
        localized(
          optionId === "true" ? "True" : "False",
          optionId === "true" ? "صح" : "خطأ"
        ) :
        localized(
          `Option ${optionId.toUpperCase()} (${i})`,
          `الخيار ${optionId.toUpperCase()} (${i})`
        ),
    }));
    const correctOptionId = isTrueFalse ?
      (i % 10 === 0 ? "false" : "true") :
      optionIds[i % optionIds.length];

    questions.push({
      questionId,
      type: isTrueFalse ? "true_false" : "mcq",
      prompt: localized(
        `Fixture question ${i} for ${quiz.quizId}.`,
        `سؤال تجريبي ${i} لـ ${quiz.quizId}.`
      ),
      options,
      correctOptionIds: [correctOptionId],
      explanation: localized(
        `${correctOptionId} is the correct fixture option.`,
        `${correctOptionId} هو الخيار الصحيح في بيانات الاختبار.`
      ),
      difficulty: ["easy", "medium", "hard"][i % 3],
      tags: ["fixture", quiz.type],
      sourceRef: quiz.lessonId ?
        `${quiz.lessonId}#sec-01` :
        `${quiz.courseId}#final`,
    });
  }

  return questions;
}

function buildContent(now) {
  const entries = [];
  const quizzes = new Map();
  const questionMap = new Map();
  const add = (path, data) => entries.push([path, data]);
  const publishedAt = now - 3600000;
  const createdAt = now - 7200000;

  add(`contentVersions/${CONTENT_VERSION}`, {
    contentVersion: CONTENT_VERSION,
    formatVersion: 1,
    status: "published",
    courseCount: COURSES.length,
    lessonCount: LESSONS.length,
    checksum: "fixture-checksum-v001",
    createdAt: ts(createdAt),
    createdBy: UIDS.admin,
    publishedAt: ts(publishedAt),
    publishedBy: UIDS.admin,
    archivedAt: null,
    rollbackOf: null,
    validation: {ok: true, errors: [], validatedAt: ts(publishedAt - 60000)},
    notes: "N2-03 fixture content",
  });

  add(POINTER_PATH, {
    contentVersion: CONTENT_VERSION,
    previousContentVersion: null,
    formatVersion: 1,
    checksum: "fixture-checksum-v001",
    publishedAt: ts(publishedAt),
    publishedBy: UIDS.admin,
    status: "published",
  });

  for (const course of COURSES) {
    add(`contentVersions/${CONTENT_VERSION}/courses/${course.id}`, {
      courseId: course.id,
      order: course.order,
      title: localized(course.title[0], course.title[1]),
      description: localized(course.description[0], course.description[1]),
      estimatedMinutes: course.estimatedMinutes,
      lessonCount: LESSONS.filter((lesson) => lesson.courseId === course.id).length,
      finalQuizId: finalQuizId(course.id),
      status: "approved",
      contentVersion: CONTENT_VERSION,
      createdAt: ts(createdAt),
      updatedAt: ts(publishedAt),
    });
  }

  for (const lesson of LESSONS) {
    add(
      `contentVersions/${CONTENT_VERSION}/courses/${lesson.courseId}/lessons/${lesson.id}`,
      {
        lessonId: lesson.id,
        courseId: lesson.courseId,
        order: lesson.order,
        title: localized(lesson.title[0], lesson.title[1]),
        summary: localized(
          `Fixture summary for ${lesson.title[0]}.`,
          `ملخص تجريبي لدرس ${lesson.title[1]}.`
        ),
        estimatedMinutes: 20,
        sections: buildSections(lesson),
        checkpoint: buildCheckpoint(lesson),
        quizId: lessonQuizId(lesson.id),
        status: "approved",
        contentVersion: CONTENT_VERSION,
        updatedAt: ts(publishedAt),
      }
    );

    add(
      `contentVersions/${CONTENT_VERSION}/courses/${lesson.courseId}/lessons/${lesson.id}/private/checkpointKey`,
      buildCheckpointKey(lesson)
    );

    const aiBase = `ai-c${lessonNumbers(lesson.id).course}-l${lessonNumbers(lesson.id).lesson}`;
    add(`contentVersions/${CONTENT_VERSION}/aiSections/${aiBase}-001`, {
      sectionId: `${aiBase}-001`,
      courseId: lesson.courseId,
      lessonId: lesson.id,
      language: "en",
      heading: lesson.title[0],
      body: `Approved fixture AI section for ${lesson.title[0]}.`,
      keywords: ["fixture", lesson.courseId, lesson.id],
      sourceRef: `${lesson.id}#sec-01`,
      order: 1,
      approved: true,
      checksum: `fixture-${aiBase}-001`,
    });
    add(`contentVersions/${CONTENT_VERSION}/aiSections/${aiBase}-002`, {
      sectionId: `${aiBase}-002`,
      courseId: lesson.courseId,
      lessonId: lesson.id,
      language: "ar",
      heading: lesson.title[1],
      body: `قسم ذكاء اصطناعي تجريبي معتمد لدرس ${lesson.title[1]}.`,
      keywords: ["fixture", lesson.courseId, lesson.id],
      sourceRef: `${lesson.id}#sec-01`,
      order: 2,
      approved: true,
      checksum: `fixture-${aiBase}-002`,
    });

    const lessonQuiz = buildLessonQuiz(lesson);
    quizzes.set(lessonQuiz.quizId, lessonQuiz);
    add(`contentVersions/${CONTENT_VERSION}/quizzes/${lessonQuiz.quizId}`, lessonQuiz);
    add(`contentVersions/${CONTENT_VERSION}/quizBanks/${lessonQuiz.quizId}`, {
      quizId: lessonQuiz.quizId,
      type: lessonQuiz.type,
      courseId: lessonQuiz.courseId,
      lessonId: lessonQuiz.lessonId,
      questionCount: lessonQuiz.bankSize,
      checksum: `fixture-bank-${lessonQuiz.quizId}`,
      updatedAt: ts(publishedAt),
    });

    const lessonQuestions = makeQuestions(lessonQuiz, lessonQuiz.bankSize);
    questionMap.set(lessonQuiz.quizId, lessonQuestions);
    for (const question of lessonQuestions) {
      add(
        `contentVersions/${CONTENT_VERSION}/quizBanks/${lessonQuiz.quizId}/questions/${question.questionId}`,
        question
      );
    }
  }

  for (const course of COURSES) {
    const finalQuiz = buildFinalQuiz(course);
    quizzes.set(finalQuiz.quizId, finalQuiz);
    add(`contentVersions/${CONTENT_VERSION}/quizzes/${finalQuiz.quizId}`, finalQuiz);
    add(`contentVersions/${CONTENT_VERSION}/quizBanks/${finalQuiz.quizId}`, {
      quizId: finalQuiz.quizId,
      type: finalQuiz.type,
      courseId: finalQuiz.courseId,
      lessonId: null,
      questionCount: finalQuiz.bankSize,
      checksum: `fixture-bank-${finalQuiz.quizId}`,
      updatedAt: ts(publishedAt),
    });

    const finalQuestions = makeQuestions(finalQuiz, finalQuiz.bankSize);
    questionMap.set(finalQuiz.quizId, finalQuestions);
    for (const question of finalQuestions) {
      add(
        `contentVersions/${CONTENT_VERSION}/quizBanks/${finalQuiz.quizId}/questions/${question.questionId}`,
        question
      );
    }
  }

  add(`contentVersions/${STAGING_VERSION}`, {
    contentVersion: STAGING_VERSION,
    formatVersion: 1,
    status: "staging",
    courseCount: 1,
    lessonCount: 1,
    checksum: "fixture-checksum-v002",
    createdAt: ts(now - 600000),
    createdBy: UIDS.admin,
    publishedAt: null,
    publishedBy: null,
    archivedAt: null,
    rollbackOf: null,
    validation: {ok: false, errors: ["staging fixture"], validatedAt: ts(now - 600000)},
    notes: "Must stay invisible while the active pointer is v001",
  });

  add(`contentVersions/${STAGING_VERSION}/courses/course-01`, {
    courseId: "course-01",
    order: 1,
    title: localized("Draft Networking Foundations", "مسودة أساسيات الشبكات"),
    description: localized("Staging draft.", "مسودة قيد الإعداد."),
    estimatedMinutes: 90,
    lessonCount: 1,
    finalQuizId: "quiz-c01-final",
    status: "approved",
    contentVersion: STAGING_VERSION,
    createdAt: ts(now - 600000),
    updatedAt: ts(now - 600000),
  });

  add(`contentVersions/${STAGING_VERSION}/courses/course-01/lessons/lesson-01-01`, {
    lessonId: "lesson-01-01",
    courseId: "course-01",
    order: 1,
    title: localized("Draft Lesson", "درس مسودة"),
    summary: localized("Staging draft.", "مسودة قيد الإعداد."),
    estimatedMinutes: 20,
    sections: [],
    checkpoint: buildCheckpoint({id: "lesson-01-01", title: ["Draft Lesson", "درس مسودة"]}),
    quizId: "quiz-c01-l01",
    status: "approved",
    contentVersion: STAGING_VERSION,
    updatedAt: ts(now - 600000),
  });

  return {
    entries,
    quizzes,
    questionMap,
    counts: {
      contentDocuments: entries.length,
      courses: COURSES.length,
      lessons: LESSONS.length,
      quizzes: quizzes.size,
      banks: quizzes.size,
      questions: Array.from(questionMap.values()).reduce((sum, list) => sum + list.length, 0),
      aiSections: LESSONS.length * 2,
      checkpointKeys: LESSONS.length,
    },
  };
}

let uuidCounter = 0;

function uuid() {
  uuidCounter += 1;
  return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
}

function buildDraw(questions, count) {
  const drawn = questions.slice(0, count);
  const optionOrder = {};

  drawn.forEach((question, index) => {
    optionOrder[question.questionId] = rotate(
      question.options.map((option) => option.optionId),
      index % question.options.length
    );
  });

  return {
    questionIds: drawn.map((question) => question.questionId),
    optionOrder,
  };
}

function buildAnswers(questions, count, correctCount) {
  const answers = {};

  questions.slice(0, count).forEach((question, index) => {
    const correct = question.correctOptionIds[0];
    const wrong = question.options
      .map((option) => option.optionId)
      .find((optionId) => optionId !== correct);

    answers[question.questionId] = [index < correctCount ? correct : wrong];
  });

  return answers;
}

function buildReview(questions, answers) {
  return Object.entries(answers).map(([questionId, selectedOptionIds]) => {
    const question = questions.find((item) => item.questionId === questionId);
    const isCorrect =
      selectedOptionIds.length === question.correctOptionIds.length &&
      selectedOptionIds.every((id) => question.correctOptionIds.includes(id));

    return {
      questionId,
      selectedOptionIds,
      correctOptionIds: question.correctOptionIds,
      isCorrect,
      explanation: question.explanation,
    };
  });
}

function makeAttempt({
  id,
  uid,
  quiz,
  questions,
  status,
  attemptNumber,
  startedAt,
  deadlineAt,
  finalizedAt = null,
  gradedAt = null,
  answers = {},
  correctCount = null,
  passed = null,
  review = null,
  voidReason = null,
}) {
  const answeredCount = Object.keys(answers).length;
  const lastSavedAt = answeredCount ?
    ts(Math.min(startedAt + 600000, deadlineAt - 1000)) :
    null;

  return {
    attemptId: id,
    uid,
    quizId: quiz.quizId,
    type: quiz.type,
    courseId: quiz.courseId,
    lessonId: quiz.lessonId,
    contentVersion: CONTENT_VERSION,
    attemptNumberInCycle: attemptNumber,
    status,
    startedAt: ts(startedAt),
    deadlineAt: ts(deadlineAt),
    timeLimitMinutes: quiz.timeLimitMinutes,
    questionCount: quiz.questionCount,
    passingScore: quiz.passingScore,
    draw: buildDraw(questions, quiz.questionCount),
    answers,
    answeredCount,
    finalizedAt: finalizedAt === null ? null : ts(finalizedAt),
    gradedAt: gradedAt === null ? null : ts(gradedAt),
    gradingVersion: gradedAt === null ? null : "g1",
    correctCount,
    scorePercent: correctCount === null ?
      null :
      Math.round((correctCount / quiz.questionCount) * 100),
    passed,
    review,
    startIdempotencyKey: uuid(),
    lastSaveIdempotencyKey: answeredCount ? uuid() : null,
    finalizeIdempotencyKey: finalizedAt === null ? null : uuid(),
    saveCount: answeredCount,
    lastSavedAt,
    voidReason,
    updatedAt: ts(finalizedAt === null ? startedAt + 300000 : finalizedAt),
  };
}

function courseProgressDoc(courseId, order, status, extra = {}) {
  return {
    courseId,
    order,
    status,
    unlockedAt: extra.unlockedAt ?? null,
    unlockSource: extra.unlockSource ?? null,
    unlockedByAttemptId: extra.unlockedByAttemptId ?? null,
    completedAt: extra.completedAt ?? null,
    finalPassedAt: extra.finalPassedAt ?? null,
    finalBestScore: extra.finalBestScore ?? null,
    finalBestTotal: 20,
    contentVersion: CONTENT_VERSION,
    updatedAt: ts(Date.now() - 60000),
  };
}

function lessonProgressDoc(lessonId, courseId, order, extra = {}) {
  return {
    lessonId,
    courseId,
    lessonOrder: order,
    checkpointPassed: extra.checkpointPassed ?? false,
    checkpointPassedAt: extra.checkpointPassedAt ?? null,
    checkpointAnswerCount: extra.checkpointAnswerCount ?? 0,
    isCompleted: extra.isCompleted ?? false,
    completedAt: extra.completedAt ?? null,
    lessonQuizPassed: extra.lessonQuizPassed ?? false,
    lessonQuizBestScore: extra.lessonQuizBestScore ?? null,
    lastAttemptId: extra.lastAttemptId ?? null,
    contentVersion: CONTENT_VERSION,
    updatedAt: ts(Date.now() - 60000),
  };
}

function quizStateDoc(quiz, extra = {}) {
  return {
    quizId: quiz.quizId,
    courseId: quiz.courseId,
    lessonId: quiz.lessonId,
    type: quiz.type,
    activeAttemptId: extra.activeAttemptId ?? null,
    activeDeadlineAt: extra.activeDeadlineAt ?? null,
    lastAttemptAt: extra.lastAttemptAt ?? null,
    cycleAttemptsUsed: extra.cycleAttemptsUsed ?? 0,
    cooldownUntil: extra.cooldownUntil ?? null,
    cooldownReason: extra.cooldownReason ?? null,
    bestCorrectCount: extra.bestCorrectCount ?? null,
    bestScorePercent: extra.bestScorePercent ?? null,
    totalAttempts: extra.totalAttempts ?? 0,
    passedAt: extra.passedAt ?? null,
    updatedAt: ts(Date.now() - 60000),
  };
}

function buildUserData(now, quizzes, questionMap) {
  const entries = [];
  const add = (path, data) => entries.push([path, data]);
  const H = 3600000;
  const M = 60000;
  const final1 = quizzes.get("quiz-c01-final");
  const final2 = quizzes.get("quiz-c02-final");
  const l01 = quizzes.get("quiz-c01-l01");
  const l02 = quizzes.get("quiz-c01-l02");
  const l0201 = quizzes.get("quiz-c02-l01");
  const l0202 = quizzes.get("quiz-c02-l02");
  const l0301 = quizzes.get("quiz-c03-l01");
  const l0302 = quizzes.get("quiz-c03-l02");

  add(`users/${UIDS.student}`, {
    uid: UIDS.student,
    email: "fixture-student-01@example.test",
    displayName: "Fixture Student 01",
    preferredLanguage: "en",
    role: "student",
    status: "active",
    createdAt: ts(now - 8 * 86400000),
    updatedAt: ts(now - 60000),
    lastLoginAt: ts(now - 3600000),
  });
  add(`users/${UIDS.cooldown}`, {
    uid: UIDS.cooldown,
    email: "fixture-student-02@example.test",
    displayName: "Fixture Student 02",
    preferredLanguage: "ar",
    role: "student",
    status: "active",
    createdAt: ts(now - 7 * 86400000),
    updatedAt: ts(now - 60000),
    lastLoginAt: ts(now - 400000),
  });
  add(`users/${UIDS.admin}`, {
    uid: UIDS.admin,
    email: "fixture-admin@example.test",
    displayName: "Fixture Admin",
    preferredLanguage: "en",
    role: "admin",
    status: "active",
    createdAt: ts(now - 30 * 86400000),
    updatedAt: ts(now - 60000),
    lastLoginAt: ts(now - 7200000),
  });
  add(`users/${UIDS.disabled}`, {
    uid: UIDS.disabled,
    email: "fixture-disabled@example.test",
    displayName: "Fixture Disabled",
    preferredLanguage: "en",
    role: "student",
    status: "disabled",
    createdAt: ts(now - 20 * 86400000),
    updatedAt: ts(now - 60000),
    lastLoginAt: ts(now - 10 * 86400000),
  });

  const final1At = now - 7 * H + 25 * M;
  const final2At = now - 4 * H + 28 * M;
  const pass1At = now - 8 * H + 12 * M;
  const pass2At = now - 7 * H - 27 * M;
  const expiredAt = now - 4.5 * H + 15 * M;
  const failAt = now - 4 * H - 36 * M;

  add(`users/${UIDS.student}/courseProgress/course-01`, courseProgressDoc(
    "course-01", 1, "completed", {
      unlockedAt: ts(now - 8 * 86400000),
      unlockSource: "default",
      completedAt: ts(final1At),
      finalPassedAt: ts(final1At),
      finalBestScore: 18,
    }
  ));
  add(`users/${UIDS.student}/courseProgress/course-02`, courseProgressDoc(
    "course-02", 2, "completed", {
      unlockedAt: ts(final1At),
      unlockSource: "finalPass",
      unlockedByAttemptId: ATTEMPT.final1,
      completedAt: ts(final2At),
      finalPassedAt: ts(final2At),
      finalBestScore: 16,
    }
  ));
  add(`users/${UIDS.student}/courseProgress/course-03`, courseProgressDoc(
    "course-03", 3, "inProgress", {
      unlockedAt: ts(final2At),
      unlockSource: "finalPass",
      unlockedByAttemptId: ATTEMPT.final2,
    }
  ));
  for (const order of [4, 5, 6]) {
    add(
      `users/${UIDS.student}/courseProgress/course-0${order}`,
      courseProgressDoc(`course-0${order}`, order, "locked")
    );
  }

  add(`users/${UIDS.cooldown}/courseProgress/course-01`, courseProgressDoc(
    "course-01", 1, "inProgress", {
      unlockedAt: ts(now - 7 * 86400000),
      unlockSource: "default",
    }
  ));

  add(`users/${UIDS.student}/lessonProgress/lesson-01-01`, lessonProgressDoc(
    "lesson-01-01", "course-01", 1, {
      checkpointPassed: true,
      checkpointPassedAt: ts(now - 8 * H - 10 * M),
      checkpointAnswerCount: 2,
      isCompleted: true,
      completedAt: ts(pass1At),
      lessonQuizPassed: true,
      lessonQuizBestScore: 9,
      lastAttemptId: ATTEMPT.pass1,
    }
  ));
  add(`users/${UIDS.student}/lessonProgress/lesson-01-02`, lessonProgressDoc(
    "lesson-01-02", "course-01", 2, {
      checkpointPassed: true,
      checkpointPassedAt: ts(now - 7 * H - 50 * M),
      checkpointAnswerCount: 1,
      isCompleted: true,
      completedAt: ts(pass2At),
      lessonQuizPassed: true,
      lessonQuizBestScore: 8,
      lastAttemptId: ATTEMPT.pass2,
    }
  ));
  add(`users/${UIDS.student}/lessonProgress/lesson-02-01`, lessonProgressDoc(
    "lesson-02-01", "course-02", 1, {
      checkpointPassed: true,
      checkpointPassedAt: ts(now - 4 * H - 40 * M),
      checkpointAnswerCount: 3,
      isCompleted: true,
      completedAt: ts(expiredAt),
      lessonQuizPassed: true,
      lessonQuizBestScore: 7,
      lastAttemptId: ATTEMPT.expired,
    }
  ));
  add(`users/${UIDS.student}/lessonProgress/lesson-02-02`, lessonProgressDoc(
    "lesson-02-02", "course-02", 2, {
      checkpointPassed: true,
      checkpointPassedAt: ts(now - 4 * H - 55 * M),
      checkpointAnswerCount: 1,
      isCompleted: false,
      lessonQuizPassed: false,
      lessonQuizBestScore: 6,
      lastAttemptId: ATTEMPT.fail,
    }
  ));
  add(`users/${UIDS.student}/lessonProgress/lesson-03-01`, lessonProgressDoc(
    "lesson-03-01", "course-03", 1, {
      checkpointPassed: true,
      checkpointPassedAt: ts(now - 2 * H - 10 * M),
      checkpointAnswerCount: 1,
      isCompleted: false,
      lessonQuizPassed: false,
      lastAttemptId: ATTEMPT.active,
    }
  ));

  add(`users/${UIDS.student}/attempts/${ATTEMPT.final1}`, makeAttempt({
    id: ATTEMPT.final1,
    uid: UIDS.student,
    quiz: final1,
    questions: questionMap.get(final1.quizId),
    status: "finalized",
    attemptNumber: 1,
    startedAt: now - 7 * H,
    deadlineAt: now - 7 * H + 30 * M,
    finalizedAt: final1At,
    gradedAt: final1At,
    answers: buildAnswers(questionMap.get(final1.quizId), 20, 18),
    correctCount: 18,
    passed: true,
    review: buildReview(
      questionMap.get(final1.quizId),
      buildAnswers(questionMap.get(final1.quizId), 20, 18)
    ),
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.final2}`, makeAttempt({
    id: ATTEMPT.final2,
    uid: UIDS.student,
    quiz: final2,
    questions: questionMap.get(final2.quizId),
    status: "finalized",
    attemptNumber: 1,
    startedAt: now - 4 * H,
    deadlineAt: now - 4 * H + 30 * M,
    finalizedAt: final2At,
    gradedAt: final2At,
    answers: buildAnswers(questionMap.get(final2.quizId), 20, 16),
    correctCount: 16,
    passed: true,
    review: buildReview(
      questionMap.get(final2.quizId),
      buildAnswers(questionMap.get(final2.quizId), 20, 16)
    ),
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.pass1}`, makeAttempt({
    id: ATTEMPT.pass1,
    uid: UIDS.student,
    quiz: l01,
    questions: questionMap.get(l01.quizId),
    status: "finalized",
    attemptNumber: 1,
    startedAt: now - 8 * H,
    deadlineAt: now - 8 * H + 15 * M,
    finalizedAt: pass1At,
    gradedAt: pass1At,
    answers: buildAnswers(questionMap.get(l01.quizId), 10, 9),
    correctCount: 9,
    passed: true,
    review: buildReview(
      questionMap.get(l01.quizId),
      buildAnswers(questionMap.get(l01.quizId), 10, 9)
    ),
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.pass2}`, makeAttempt({
    id: ATTEMPT.pass2,
    uid: UIDS.student,
    quiz: l02,
    questions: questionMap.get(l02.quizId),
    status: "finalized",
    attemptNumber: 1,
    startedAt: now - 7 * H - 40 * M,
    deadlineAt: now - 7 * H - 40 * M + 15 * M,
    finalizedAt: pass2At,
    gradedAt: pass2At,
    answers: buildAnswers(questionMap.get(l02.quizId), 10, 8),
    correctCount: 8,
    passed: true,
    review: buildReview(
      questionMap.get(l02.quizId),
      buildAnswers(questionMap.get(l02.quizId), 10, 8)
    ),
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.expired}`, makeAttempt({
    id: ATTEMPT.expired,
    uid: UIDS.student,
    quiz: l0201,
    questions: questionMap.get(l0201.quizId),
    status: "expired",
    attemptNumber: 1,
    startedAt: now - 4.5 * H,
    deadlineAt: now - 4.5 * H + 15 * M,
    finalizedAt: expiredAt,
    gradedAt: expiredAt,
    answers: buildAnswers(questionMap.get(l0201.quizId), 10, 7),
    correctCount: 7,
    passed: true,
    review: buildReview(
      questionMap.get(l0201.quizId),
      buildAnswers(questionMap.get(l0201.quizId), 10, 7)
    ),
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.fail}`, makeAttempt({
    id: ATTEMPT.fail,
    uid: UIDS.student,
    quiz: l0202,
    questions: questionMap.get(l0202.quizId),
    status: "finalized",
    attemptNumber: 1,
    startedAt: now - 4 * H - 50 * M,
    deadlineAt: now - 4 * H - 50 * M + 15 * M,
    finalizedAt: failAt,
    gradedAt: failAt,
    answers: buildAnswers(questionMap.get(l0202.quizId), 10, 6),
    correctCount: 6,
    passed: false,
    review: buildReview(
      questionMap.get(l0202.quizId),
      buildAnswers(questionMap.get(l0202.quizId), 10, 6)
    ),
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.void}`, makeAttempt({
    id: ATTEMPT.void,
    uid: UIDS.student,
    quiz: l0301,
    questions: questionMap.get(l0301.quizId),
    status: "void",
    attemptNumber: 1,
    startedAt: now - 2 * H,
    deadlineAt: now - 2 * H + 15 * M,
    finalizedAt: now - 2 * H + 10 * M,
    answers: {},
    correctCount: null,
    passed: null,
    review: null,
    voidReason: "Fixture admin void",
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.active}`, makeAttempt({
    id: ATTEMPT.active,
    uid: UIDS.student,
    quiz: l0301,
    questions: questionMap.get(l0301.quizId),
    status: "active",
    attemptNumber: 1,
    startedAt: now - 10 * M,
    deadlineAt: now + 5 * M,
    answers: buildAnswers(questionMap.get(l0301.quizId), 3, 3),
    correctCount: null,
    passed: null,
    review: null,
  }));
  add(`users/${UIDS.student}/attempts/${ATTEMPT.stale}`, makeAttempt({
    id: ATTEMPT.stale,
    uid: UIDS.student,
    quiz: l0302,
    questions: questionMap.get(l0302.quizId),
    status: "active",
    attemptNumber: 1,
    startedAt: now - 1 * H,
    deadlineAt: now - 45 * M,
    answers: buildAnswers(questionMap.get(l0302.quizId), 6, 4),
    correctCount: null,
    passed: null,
    review: null,
  }));

  const cooldownStarts = [
    now - 2 * H,
    now - 90 * M,
    now - 25 * M,
  ];
  const cooldownFinalized = [
    now - 2 * H + 12 * M,
    now - 90 * M + 12 * M,
    now - 10 * M,
  ];

  for (let index = 1; index <= 3; index += 1) {
    add(
      `users/${UIDS.cooldown}/attempts/${ATTEMPT[`cooldown${index}`]}`,
      makeAttempt({
        id: ATTEMPT[`cooldown${index}`],
        uid: UIDS.cooldown,
        quiz: l01,
        questions: questionMap.get(l01.quizId),
        status: "finalized",
        attemptNumber: index,
        startedAt: cooldownStarts[index - 1],
        deadlineAt: cooldownStarts[index - 1] + 15 * M,
        finalizedAt: cooldownFinalized[index - 1],
        gradedAt: cooldownFinalized[index - 1],
        answers: buildAnswers(questionMap.get(l01.quizId), 10, 6),
        correctCount: 6,
        passed: false,
        review: buildReview(
          questionMap.get(l01.quizId),
          buildAnswers(questionMap.get(l01.quizId), 10, 6)
        ),
      })
    );
  }

  add(`users/${UIDS.student}/quizState/quiz-c01-l01`, quizStateDoc(l01, {
    lastAttemptAt: ts(pass1At),
    bestCorrectCount: 9,
    bestScorePercent: 90,
    totalAttempts: 1,
    passedAt: ts(pass1At),
  }));
  add(`users/${UIDS.student}/quizState/quiz-c01-l02`, quizStateDoc(l02, {
    lastAttemptAt: ts(pass2At),
    bestCorrectCount: 8,
    bestScorePercent: 80,
    totalAttempts: 1,
    passedAt: ts(pass2At),
  }));
  add(`users/${UIDS.student}/quizState/quiz-c01-final`, quizStateDoc(final1, {
    lastAttemptAt: ts(final1At),
    bestCorrectCount: 18,
    bestScorePercent: 90,
    totalAttempts: 1,
    passedAt: ts(final1At),
  }));
  add(`users/${UIDS.student}/quizState/quiz-c02-l01`, quizStateDoc(l0201, {
    lastAttemptAt: ts(expiredAt),
    bestCorrectCount: 7,
    bestScorePercent: 70,
    totalAttempts: 1,
    passedAt: ts(expiredAt),
  }));
  add(`users/${UIDS.student}/quizState/quiz-c02-l02`, quizStateDoc(l0202, {
    lastAttemptAt: ts(failAt),
    cycleAttemptsUsed: 1,
    bestCorrectCount: 6,
    bestScorePercent: 60,
    totalAttempts: 1,
  }));
  add(`users/${UIDS.student}/quizState/quiz-c02-final`, quizStateDoc(final2, {
    lastAttemptAt: ts(final2At),
    bestCorrectCount: 16,
    bestScorePercent: 80,
    totalAttempts: 1,
    passedAt: ts(final2At),
  }));
  add(`users/${UIDS.student}/quizState/quiz-c03-l01`, quizStateDoc(l0301, {
    activeAttemptId: ATTEMPT.active,
    activeDeadlineAt: ts(now + 5 * M),
    lastAttemptAt: ts(now - 10 * M),
    cycleAttemptsUsed: 1,
    totalAttempts: 1,
  }));
  add(`users/${UIDS.student}/quizState/quiz-c03-l02`, quizStateDoc(l0302, {
    activeAttemptId: ATTEMPT.stale,
    activeDeadlineAt: ts(now - 45 * M),
    lastAttemptAt: ts(now - 1 * H),
    cycleAttemptsUsed: 1,
    totalAttempts: 1,
  }));
  add(`users/${UIDS.cooldown}/quizState/quiz-c01-l01`, quizStateDoc(l01, {
    lastAttemptAt: ts(now - 10 * M),
    cycleAttemptsUsed: 3,
    cooldownUntil: ts(now + 20 * M),
    cooldownReason: "threeFailures",
    bestCorrectCount: 6,
    bestScorePercent: 60,
    totalAttempts: 3,
  }));

  add(`users/${UIDS.student}/idempotency/${"a".repeat(64)}`, {
    operation: "startQuiz",
    requestHash: "b".repeat(64),
    response: {ok: true, attemptId: ATTEMPT.active},
    createdAt: ts(now - 120000),
    expiresAt: ts(now + 24 * H),
  });

  add(`accountTombstones/${UIDS.deleted}`, {
    uid: UIDS.deleted,
    status: "purged",
    requestedAt: ts(now - 5 * 86400000),
    deletedAt: ts(now - 5 * 86400000 + 60000),
    authDeletedAt: ts(now - 5 * 86400000 + 120000),
    purgedAt: ts(now - 5 * 86400000 + 180000),
    purgeAfter: ts(now - 4 * 86400000),
    reason: "userRequest",
    lastKnownRole: "student",
    requestId: "fixture-deletion-001",
  });

  add(`adminAudit/${AUDIT.publish}`, {
    eventId: AUDIT.publish,
    action: "publishContent",
    actorUid: UIDS.admin,
    actorRole: "admin",
    targetType: "contentVersion",
    targetId: CONTENT_VERSION,
    before: null,
    after: {contentVersion: CONTENT_VERSION},
    requestId: "fixture-publish-001",
    createdAt: ts(now - 1 * H),
  });
  add(`adminAudit/${AUDIT.role}`, {
    eventId: AUDIT.role,
    action: "setRole",
    actorUid: UIDS.admin,
    actorRole: "admin",
    targetType: "user",
    targetId: UIDS.admin,
    before: {role: "student"},
    after: {role: "admin"},
    requestId: "fixture-role-001",
    createdAt: ts(now - 2 * H),
  });

  return {
    entries,
    counts: {
      profiles: 4,
      courseProgress: 7,
      lessonProgress: 5,
      attempts: 12,
      quizStates: 9,
      idempotency: 1,
      tombstones: 1,
      auditEvents: 2,
    },
  };
}

async function safeRecursiveDelete(db, path) {
  try {
    await db.recursiveDelete(db.doc(path));
  } catch (error) {
    if (error.code === 5 || error.code === "not-found") {
      return;
    }
    throw error;
  }
}

async function resetFirestore(db) {
  const paths = [
    POINTER_PATH,
    `contentVersions/${CONTENT_VERSION}`,
    `contentVersions/${STAGING_VERSION}`,
    `accountTombstones/${UIDS.deleted}`,
    `adminAudit/${AUDIT.publish}`,
    `adminAudit/${AUDIT.role}`,
    ...Object.values(UIDS).map((uid) => `users/${uid}`),
  ];

  for (const path of paths) {
    await safeRecursiveDelete(db, path);
  }
}

async function resetAuthUsers(authClient) {
  for (const uid of Object.values(UIDS)) {
    try {
      await authClient.deleteUser(uid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }
  }
}

async function createAuthUsers(authClient) {
  const fixtures = [
    {
      uid: UIDS.student,
      email: "fixture-student-01@example.test",
      displayName: "Fixture Student 01",
      role: "student",
    },
    {
      uid: UIDS.cooldown,
      email: "fixture-student-02@example.test",
      displayName: "Fixture Student 02",
      role: "student",
    },
    {
      uid: UIDS.admin,
      email: "fixture-admin@example.test",
      displayName: "Fixture Admin",
      role: "admin",
    },
    {
      uid: UIDS.disabled,
      email: "fixture-disabled@example.test",
      displayName: "Fixture Disabled",
      role: "student",
      disabled: true,
    },
  ];

  for (const fixture of fixtures) {
    await authClient.createUser({
      uid: fixture.uid,
      email: fixture.email,
      password: "FixturePass123!",
      displayName: fixture.displayName,
    });
    await authClient.setCustomUserClaims(fixture.uid, {role: fixture.role});
    if (fixture.disabled) {
      await authClient.updateUser(fixture.uid, {disabled: true});
    }
  }

  await authClient.createUser({
    uid: UIDS.deleted,
    email: "fixture-deleted@example.test",
    password: "FixturePass123!",
    displayName: "Fixture Deleted",
  });
  await authClient.deleteUser(UIDS.deleted);
}

async function writeEntries(db, entries) {
  const batchSize = 400;

  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = db.batch();
    for (const [path, data] of entries.slice(index, index + batchSize)) {
      batch.set(db.doc(path), data);
    }
    await batch.commit();
  }
}

/**
 * Seeds the fixture namespace. Destructive only for fixture-owned paths:
 * v001/v002 content, the active pointer, fixture Auth users, fixture user
 * documents, the fixture tombstone, and the two fixture audit events.
 *
 * @return {Promise<object>} Seeded document counts.
 */
async function seedFixtures() {
  const {db, auth: authClient} = initialize();
  const now = Date.now();

  await resetFirestore(db);
  await resetAuthUsers(authClient);
  await createAuthUsers(authClient);

  const content = buildContent(now);
  const users = buildUserData(now, content.quizzes, content.questionMap);

  await writeEntries(db, content.entries);
  await writeEntries(db, users.entries);

  return {
    ...content.counts,
    ...users.counts,
    totalDocuments: content.entries.length + users.entries.length,
  };
}

async function getDoc(db, path) {
  const snapshot = await db.doc(path).get();
  return snapshot.exists ? {id: snapshot.id, ...snapshot.data()} : null;
}

async function getDocs(db, path) {
  const snapshot = await db.collection(path).get();
  return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
}

const FORBIDDEN_PUBLIC_KEYS = new Set([
  "correctOptionIds",
  "correctOptionId",
  "explanation",
  "review",
]);

function findForbiddenKey(value, path = "") {
  if (value === null || typeof value !== "object") {
    return null;
  }
  if (value instanceof Timestamp) {
    return null;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], `${path}[${index}]`);
      if (found) {
        return found;
      }
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_PUBLIC_KEYS.has(key)) {
      return `${path}.${key}`;
    }
    const found = findForbiddenKey(child, `${path}.${key}`);
    if (found) {
      return found;
    }
  }
  return null;
}

function isLocalized(value) {
  return Boolean(
    value &&
    typeof value.en === "string" &&
    value.en.length > 0 &&
    typeof value.ar === "string" &&
    value.ar.length > 0
  );
}

/**
 * Reads the seeded fixture set and checks the N2-02 invariants.
 *
 * @return {Promise<object>} Check results.
 */
async function verifyFixtures() {
  const {db, auth: authClient} = initialize();
  const checks = [];
  const check = async (id, fn) => {
    try {
      const detail = await fn();
      checks.push({id, ok: true, detail: detail || ""});
    } catch (error) {
      checks.push({id, ok: false, detail: error.message});
    }
  };

  const pointer = await getDoc(db, POINTER_PATH);
  const v1 = await getDoc(db, `contentVersions/${CONTENT_VERSION}`);
  const v2 = await getDoc(db, `contentVersions/${STAGING_VERSION}`);

  let courses = [];
  const lessonsByCourse = new Map();
  let quizzes = [];
  const questionMap = new Map();

  await check("pointer-active-v001", async () => {
    assert.ok(pointer, "pointer document is missing");
    assert.equal(pointer.contentVersion, CONTENT_VERSION);
    assert.equal(pointer.previousContentVersion, null);
    assert.equal(pointer.status, "published");
    assert.equal(pointer.formatVersion, 1);
    return `active=${pointer.contentVersion}`;
  });

  await check("versions-published-and-staging", async () => {
    assert.ok(v1, "v001 is missing");
    assert.ok(v2, "v002 is missing");
    assert.equal(v1.status, "published");
    assert.equal(v1.courseCount, 6);
    assert.equal(v1.lessonCount, 12);
    assert.equal(v1.validation.ok, true);
    assert.equal(v2.status, "staging");
    assert.notEqual(v2.contentVersion, pointer.contentVersion);
    return "v001 published, v002 staging";
  });

  await check("courses-six-ordered", async () => {
    courses = await getDocs(db, `contentVersions/${CONTENT_VERSION}/courses`);
    assert.equal(courses.length, 6);
    assert.deepEqual(
      courses.map((course) => course.order).sort((a, b) => a - b),
      [1, 2, 3, 4, 5, 6]
    );

    for (const course of courses) {
      assert.equal(course.courseId, course.id);
      assert.match(course.id, /^course-0[1-6]$/);
      assert.ok(isLocalized(course.title), `course title missing language: ${course.id}`);
      assert.equal(course.status, "approved");
    }
    return "6 courses, orders 1..6";
  });

  await check("lessons-twelve-two-per-course", async () => {
    let total = 0;

    for (const course of courses) {
      const lessons = await getDocs(
        db,
        `contentVersions/${CONTENT_VERSION}/courses/${course.id}/lessons`
      );
      lessonsByCourse.set(course.id, lessons);
      assert.ok(lessons.length >= 2, `course ${course.id} has fewer than 2 lessons`);
      assert.deepEqual(
        lessons.map((lesson) => lesson.order).sort((a, b) => a - b),
        Array.from({length: lessons.length}, (_, index) => index + 1)
      );

      for (const lesson of lessons) {
        assert.equal(lesson.lessonId, lesson.id);
        assert.equal(lesson.courseId, course.id);
        assert.match(lesson.id, /^lesson-\d{2}-\d{2}$/);
        assert.ok(
          lesson.id.startsWith(`lesson-${courseNumber(course.id)}-`),
          `lesson prefix mismatch: ${lesson.id}`
        );
        assert.ok(isLocalized(lesson.title), `lesson title missing language: ${lesson.id}`);
        total += 1;
      }
    }

    assert.equal(total, 12);
    return "12 lessons, 2 per course";
  });

  await check("quizzes-eighteen-with-constants", async () => {
    quizzes = await getDocs(db, `contentVersions/${CONTENT_VERSION}/quizzes`);
    assert.equal(quizzes.length, 18);

    for (const course of courses) {
      const forCourse = quizzes.filter((quiz) => quiz.courseId === course.id);
      assert.equal(
        forCourse.filter((quiz) => quiz.type === "lesson").length,
        2,
        `lesson quiz count for ${course.id}`
      );
      assert.equal(
        forCourse.filter((quiz) => quiz.type === "final").length,
        1,
        `final quiz count for ${course.id}`
      );
    }

    for (const quiz of quizzes) {
      assert.equal(quiz.quizId, quiz.id);
      assert.match(quiz.quizId, /^quiz-c0[1-6]-(l\d{2}|final)$/);
      assert.equal(quiz.passingPercent, 70);
      assert.equal(quiz.maxAttemptsPerCycle, 3);
      assert.equal(quiz.cooldownMinutes, 30);
      assert.equal(quiz.status, "approved");
      assert.equal(quiz.contentVersion, CONTENT_VERSION);

      if (quiz.type === "lesson") {
        assert.equal(quiz.lessonId !== null, true);
        assert.equal(quiz.questionCount, 10);
        assert.equal(quiz.timeLimitMinutes, 15);
        assert.equal(quiz.passingScore, 7);
      } else {
        assert.equal(quiz.lessonId, null);
        assert.equal(quiz.questionCount, 20);
        assert.equal(quiz.timeLimitMinutes, 30);
        assert.equal(quiz.passingScore, 14);
      }
    }
    return "18 quizzes, 10/15 and 20/30 constants";
  });

  await check("banks-and-questions-integrity", async () => {
    const banks = await getDocs(db, `contentVersions/${CONTENT_VERSION}/quizBanks`);
    assert.equal(banks.length, quizzes.length);

    for (const bank of banks) {
      const quiz = quizzes.find((item) => item.quizId === bank.quizId);
      assert.ok(quiz, `bank without quiz: ${bank.quizId}`);
      assert.ok(bank.questionCount >= quiz.questionCount);

      const questions = await getDocs(
        db,
        `contentVersions/${CONTENT_VERSION}/quizBanks/${bank.quizId}/questions`
      );
      assert.equal(questions.length, bank.questionCount);
      assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);

      for (const question of questions) {
        assert.equal(question.questionId, question.id);
        assert.match(question.id, /^q\d{3}$/);
        assert.ok(isLocalized(question.prompt));
        assert.ok(isLocalized(question.explanation));
        assert.ok(question.options.length >= 2 && question.options.length <= 4);
        assert.equal(
          new Set(question.options.map((option) => option.optionId)).size,
          question.options.length
        );
        assert.equal(question.correctOptionIds.length, 1);
        assert.ok(
          question.options.some(
            (option) => option.optionId === question.correctOptionIds[0]
          )
        );
      }

      questionMap.set(bank.quizId, questions);
    }

    const totalQuestions = Array.from(questionMap.values())
      .reduce((sum, list) => sum + list.length, 0);
    assert.equal(totalQuestions, 288);
    return "18 banks, 288 questions, single correct option";
  });

  await check("checkpoint-keys-isolated", async () => {
    let keyCount = 0;

    for (const course of courses) {
      for (const lesson of lessonsByCourse.get(course.id)) {
        assert.ok(lesson.checkpoint);
        assert.ok(lesson.checkpoint.options.length >= 2);
        assert.ok(!("correctOptionId" in lesson));

        const key = await getDoc(
          db,
          `contentVersions/${CONTENT_VERSION}/courses/${course.id}/lessons/${lesson.id}/private/checkpointKey`
        );
        assert.ok(key, `missing checkpoint key: ${lesson.id}`);
        assert.equal(key.checkpointId, lesson.checkpoint.checkpointId);
        assert.ok(
          lesson.checkpoint.options.some(
            (option) => option.optionId === key.correctOptionId
          )
        );
        assert.equal(findForbiddenKey(lesson), null);
        keyCount += 1;
      }
    }

    assert.equal(keyCount, 12);
    return "12 private checkpoint keys";
  });

  await check("public-content-has-no-secrets", async () => {
    const publicDocs = [
      pointer,
      v1,
      v2,
      ...courses,
      ...Array.from(lessonsByCourse.values()).flat(),
      ...quizzes,
    ];

    for (const document of publicDocs) {
      if (document) {
        assert.equal(
          findForbiddenKey(document),
          null,
          `forbidden key in ${document.id}`
        );
      }
    }
    return `${publicDocs.filter(Boolean).length} public documents scanned`;
  });

  await check("ai-sections-approved-and-clean", async () => {
    const sections = await getDocs(
      db,
      `contentVersions/${CONTENT_VERSION}/aiSections`
    );
    assert.equal(sections.length, 24);

    for (const section of sections) {
      assert.equal(section.approved, true);
      assert.ok(section.language === "en" || section.language === "ar");
      assert.ok(typeof section.heading === "string" && section.heading.length > 0);
      assert.ok(typeof section.body === "string" && section.body.length > 0);
      assert.equal(findForbiddenKey(section), null);
      assert.doesNotMatch(`${section.heading} ${section.body}`, /quiz-c\d{2}/);
    }
    return "24 approved AI sections, no quiz keys";
  });

  let attempts = [];
  let quizStates = [];

  await check("profiles-and-auth-roles", async () => {
    const profiles = await getDocs(db, "users");
    assert.equal(profiles.length, 4);

    for (const profile of profiles) {
      assert.equal(profile.uid, profile.id);
      assert.ok(profile.role === "student" || profile.role === "admin");
      assert.ok(profile.status === "active" || profile.status === "disabled");

      const authUser = await authClient.getUser(profile.id);
      assert.equal(authUser.customClaims.role, profile.role);
      assert.equal(authUser.disabled, profile.status === "disabled");
    }

    await assert.rejects(
      () => authClient.getUser(UIDS.deleted),
      (error) => error.code === "auth/user-not-found"
    );
    await assert.rejects(
      () => authClient.getUser("fixture-guest"),
      (error) => error.code === "auth/user-not-found"
    );
    return "4 profiles, roles/disabled mirror Auth, deleted and guest absent";
  });

  await check("student-progress-is-consistent", async () => {
    const studentCourses = await getDocs(
      db,
      `users/${UIDS.student}/courseProgress`
    );
    assert.equal(studentCourses.length, 6);
    const ordered = studentCourses.sort((a, b) => a.order - b.order);
    assert.deepEqual(
      ordered.map((course) => course.status),
      ["completed", "completed", "inProgress", "locked", "locked", "locked"]
    );

    for (const course of ordered) {
      if (course.status === "completed") {
        assert.ok(course.finalPassedAt, `completed course missing finalPassedAt: ${course.id}`);
        assert.ok(course.finalBestScore >= 14, `completed course below final pass: ${course.id}`);
      }
      if (course.status === "locked") {
        assert.equal(course.unlockedAt, null);
        assert.equal(course.unlockSource, null);
      }
    }

    const cooldownCourses = await getDocs(
      db,
      `users/${UIDS.cooldown}/courseProgress`
    );
    assert.equal(cooldownCourses.length, 1);
    assert.equal(cooldownCourses[0].status, "inProgress");

    const lessonProgress = await getDocs(
      db,
      `users/${UIDS.student}/lessonProgress`
    );
    assert.equal(lessonProgress.length, 5);
    let completedLessons = 0;
    for (const lesson of lessonProgress) {
      if (lesson.isCompleted) {
        completedLessons += 1;
        assert.equal(lesson.checkpointPassed, true);
        assert.equal(lesson.lessonQuizPassed, true);
        assert.ok(lesson.completedAt);
      }
    }
    assert.equal(completedLessons, 3);
    return "6 course docs, 5 lesson docs, 3 completed lessons";
  });

  await check("attempts-satisfy-draw-and-review-rules", async () => {
    for (const uid of [UIDS.student, UIDS.cooldown]) {
      const list = await getDocs(db, `users/${uid}/attempts`);
      for (const attempt of list) {
        attempts.push({...attempt, pathUid: uid});
      }
    }

    assert.equal(attempts.length, 12);
    assert.equal(new Set(attempts.map((attempt) => attempt.id)).size, 12);

    for (const attempt of attempts) {
      assert.match(attempt.id, /^[0-9A-HJKMNP-TV-Z]{26}$/);
      assert.equal(attempt.attemptId, attempt.id);
      assert.equal(attempt.uid, attempt.pathUid);
      assert.equal(attempt.contentVersion, CONTENT_VERSION);

      const quiz = quizzes.find((item) => item.quizId === attempt.quizId);
      assert.ok(quiz, `attempt without quiz: ${attempt.id}`);
      assert.equal(attempt.type, quiz.type);
      assert.equal(attempt.questionCount, quiz.questionCount);

      const questions = questionMap.get(quiz.quizId);
      assert.ok(questions, `missing questions for ${quiz.quizId}`);
      assert.equal(attempt.draw.questionIds.length, quiz.questionCount);
      assert.equal(
        new Set(attempt.draw.questionIds).size,
        quiz.questionCount
      );

      for (const questionId of attempt.draw.questionIds) {
        const question = questions.find((item) => item.questionId === questionId);
        assert.ok(question, `draw references unknown question: ${questionId}`);
        assert.deepEqual(
          [...attempt.draw.optionOrder[questionId]].sort(),
          question.options.map((option) => option.optionId).sort()
        );
      }

      for (const [questionId, selected] of Object.entries(attempt.answers)) {
        assert.ok(attempt.draw.questionIds.includes(questionId));
        const question = questions.find((item) => item.questionId === questionId);
        assert.ok(question);
        for (const optionId of selected) {
          assert.ok(
            question.options.some((option) => option.optionId === optionId)
          );
        }
      }
      assert.equal(attempt.answeredCount, Object.keys(attempt.answers).length);
      assert.equal(
        attempt.deadlineAt.toMillis(),
        attempt.startedAt.toMillis() + quiz.timeLimitMinutes * 60000
      );

      if (attempt.status === "finalized" || attempt.status === "expired") {
        assert.ok(Array.isArray(attempt.review));
        assert.ok(attempt.correctCount !== null);
        assert.equal(
          attempt.correctCount,
          attempt.review.filter((item) => item.isCorrect).length
        );
        assert.equal(attempt.passed, attempt.correctCount >= quiz.passingScore);
        assert.equal(
          attempt.scorePercent,
          Math.round((attempt.correctCount / quiz.questionCount) * 100)
        );
      } else {
        assert.equal(attempt.review, null);
        assert.equal(attempt.correctCount, null);
        assert.equal(attempt.passed, null);
      }
    }

    const statusCounts = attempts.reduce((counts, attempt) => {
      counts[attempt.status] = (counts[attempt.status] || 0) + 1;
      return counts;
    }, {});
    assert.equal(statusCounts.finalized, 8);
    assert.equal(statusCounts.expired, 1);
    assert.equal(statusCounts.void, 1);
    assert.equal(statusCounts.active, 2);
    return "12 attempts: 8 finalized, 1 expired, 1 void, 2 active";
  });

  await check("active-and-stale-attempt-deadlines", async () => {
    const now = Date.now();
    const active = attempts.find((attempt) => attempt.id === ATTEMPT.active);
    const stale = attempts.find((attempt) => attempt.id === ATTEMPT.stale);
    assert.ok(active);
    assert.ok(stale);
    assert.equal(active.status, "active");
    assert.ok(active.deadlineAt.toMillis() > now);
    assert.equal(stale.status, "active");
    assert.ok(stale.deadlineAt.toMillis() < now);
    return "one future active attempt, one stale attempt";
  });

  await check("quiz-state-active-locks-and-cooldown", async () => {
    for (const uid of [UIDS.student, UIDS.cooldown]) {
      const list = await getDocs(db, `users/${uid}/quizState`);
      for (const state of list) {
        quizStates.push({...state, pathUid: uid});
      }
    }

    assert.equal(quizStates.length, 9);
    const now = Date.now();

    const activeState = quizStates.find(
      (state) => state.pathUid === UIDS.student && state.quizId === "quiz-c03-l01"
    );
    assert.ok(activeState);
    assert.equal(activeState.activeAttemptId, ATTEMPT.active);
    assert.ok(activeState.activeDeadlineAt.toMillis() > now);

    const staleState = quizStates.find(
      (state) => state.pathUid === UIDS.student && state.quizId === "quiz-c03-l02"
    );
    assert.ok(staleState);
    assert.equal(staleState.activeAttemptId, ATTEMPT.stale);
    assert.ok(staleState.activeDeadlineAt.toMillis() < now);

    const cooldownState = quizStates.find(
      (state) => state.pathUid === UIDS.cooldown && state.quizId === "quiz-c01-l01"
    );
    assert.ok(cooldownState);
    assert.equal(cooldownState.cycleAttemptsUsed, 3);
    assert.equal(cooldownState.cooldownReason, "threeFailures");
    assert.ok(cooldownState.cooldownUntil.toMillis() > now);
    return "9 quizState docs, active/stale locks, one active cooldown";
  });

  await check("deleted-account-tombstone-blocks-resurrection", async () => {
    const tombstone = await getDoc(
      db,
      `accountTombstones/${UIDS.deleted}`
    );
    assert.ok(tombstone, "tombstone missing");
    assert.equal(tombstone.uid, UIDS.deleted);
    assert.equal(tombstone.status, "purged");
    assert.equal(tombstone.reason, "userRequest");

    const profile = await getDoc(db, `users/${UIDS.deleted}`);
    assert.equal(profile, null);

    await assert.rejects(
      () => authClient.getUser(UIDS.deleted),
      (error) => error.code === "auth/user-not-found"
    );
    return "tombstone present, profile and Auth user removed";
  });

  await check("idempotency-record-present", async () => {
    const records = await getDocs(
      db,
      `users/${UIDS.student}/idempotency`
    );
    assert.equal(records.length, 1);
    assert.match(records[0].id, /^[a-f0-9]{64}$/);
    assert.equal(records[0].operation, "startQuiz");
    assert.ok(records[0].expiresAt.toMillis() > Date.now());
    return "one 24h idempotency record";
  });

  await check("admin-audit-events-present", async () => {
    const events = await getDocs(db, "adminAudit");
    assert.equal(events.length, 2);
    for (const event of events) {
      assert.equal(event.eventId, event.id);
      assert.equal(event.actorUid, UIDS.admin);
      assert.equal(event.actorRole, "admin");
    }
    assert.deepEqual(
      events.map((event) => event.action).sort(),
      ["publishContent", "setRole"]
    );
    return "2 append-only audit events";
  });

  const failures = checks.filter((item) => !item.ok);
  return {
    checks,
    failures,
    ok: failures.length === 0,
  };
}

module.exports = {
  seedFixtures,
  verifyFixtures,
  UIDS,
  ATTEMPT,
  CONTENT_VERSION,
  STAGING_VERSION,
  POINTER_PATH,
};

