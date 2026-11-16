# Firestore Data Model — MVP v1

**Task:** N2-01 — formal Firestore collection schema
**Owner:** Developer A (backend)
**Audience:** Developer A (N2-02..N2-07), Developer B (Flutter reads), defense review
**Status:** design document only. **No rules, indexes, functions, or fixtures are changed by N2-01.**
**Companion contracts:** [`api-contract.md`](./api-contract.md), [`openapi.yaml`](./openapi.yaml), [`security-review-n1.md`](./security-review-n1.md)

---

## 1. Purpose and scope

This document defines the Firestore-native data model for the reduced MVP described in the N1–N7 roadmap:

- 6 sequential bilingual (Arabic/English) courses, at least 12 complete lessons;
- one mid-lesson checkpoint per lesson, unlimited retries, no attempt consumption;
- backend-authoritative timed quizzes (lesson: 10 questions / 15 minutes; final: 20 / 30 minutes; 70% pass);
- 3 unsuccessful formal attempts → 30-minute cooldown;
- sequential unlocking: course 1 by default, each later course only after passing the previous final;
- an AI tutor grounded in approved content and a published `contentVersion`, with **no access to answer keys**;
- account deletion with durable tombstones.

**In scope:** collections, document IDs, fields and types, required/optional, timestamps, ordering, ownership, server-only fields, read/write trust matrix, indexes needed by N2-02/N2-06, and the `contentVersion` atomic-commit and rollback model.

**Out of scope (N2-01):** security-rule syntax, index deployment, fixtures, endpoint implementations, Flutter models, retention automation. Those are N2-02…N2-07.

---

## 2. Firestore-native principles

These constrain every decision below.

1. **No relational ERD assumptions.** There are no joins, foreign keys, or cascading deletes. Related data is nested (subcollections) or referenced by an ID that the reader resolves in a second read. Denormalized copies are intentional.
2. **A document is the unit of trust.** Firestore rules grant or deny a whole document; they cannot redact one field. Therefore **any document containing a secret is not client-readable at all**. Public projections and private records are separate documents, sometimes in separate collections.
3. **Server-only means Firebase Admin SDK only.** Cloud Functions use the Admin SDK, which bypasses rules. The Flutter client uses the Firebase client SDK and is always subject to rules. Every "server-only" marker below means "no client read and no client write".
4. **One document ≤ 1 MiB.** Lesson prose is stored in the lesson document with a hard cap; question banks and AI sections are split per document to stay far below the limit.
5. **Queries are pre-planned.** Firestore cannot query arbitrary field combinations. Every list screen has an index listed in §10.
6. **Official state is written only by the backend.** Progress, grades, cooldowns, unlocks, and attempts are never client-authored. Flutter may request an operation; the backend decides and persists.
7. **Content is immutable once published.** A correction creates a new `contentVersion`; published subtree documents are never edited in place. Rollback moves a pointer, it does not rewrite content.
8. **Server time is authoritative.** All authoritative timestamps are Firestore `Timestamp` values written by the backend. Client clocks are used only for display and diagnostics.

---

## 3. Conventions

| Convention | Rule |
|---|---|
| Field names | `lowerCamelCase`, no abbreviations except `Id`, `Uid` |
| IDs | lower-kebab-case strings, stable forever, never reused |
| Localized text | `map { en: string, ar: string }`; both keys required for user-facing text; client renders `ar` RTL |
| Timestamps | Firestore `Timestamp`; names end in `At`; server-written only |
| Counts | integer, names end in `Count`; never negative |
| Booleans | `true`/`false`; names read as assertions (`isCompleted`, `checkpointPassed`) |
| Optional fields | omitted entirely when absent; never stored as `null` unless this document explicitly allows `null` (e.g. `cooldownUntil: null` is meaningful) |
| Content version | string `v001`, `v002`, … monotonic, sortable, never reused |
| Schema format | integer `formatVersion` (currently `1`); unrelated to the API `v1` contract |
| Official clock | `Timestamp` from the Functions runtime (`Date.now()` / `FieldValue.serverTimestamp()`), never the client |
| Document size | target ≤ 700 KiB per document to leave headroom under the 1 MiB limit |

**Do not confuse two versions:**

- `contentVersion` (`v001`) identifies a **published content snapshot**.
- `formatVersion` (`1`) identifies the **shape of the data model**.
- The HTTP API version is `v1`, documented in `api-contract.md`; it never appears inside Firestore documents.

---

## 4. Collection tree

```
system/
  publishedContentVersion                  ← singleton active-version pointer (public read)

contentVersions/{versionId}                ← publish metadata (client reads active only)
  courses/{courseId}
    lessons/{lessonId}
      private/checkpointKey                ← correct checkpoint answer (never client-readable)
  quizzes/{quizId}                         ← public quiz metadata (no questions, no keys)
  quizBanks/{quizId}                       ← private bank metadata (never client-readable)
    questions/{questionId}                 ← prompt, options, correct answer, explanation
  aiSections/{sectionId}                   ← approved AI source text (never client-readable)

users/{uid}                                ← profile (owner-readable)
  courseProgress/{courseId}                ← unlock/completion state (owner-readable, server-written)
  lessonProgress/{lessonId}                ← checkpoint/lesson state (owner-readable, server-written)
  attempts/{attemptId}                     ← official attempt + draw + answers (server-only)
  quizState/{quizId}                       ← active attempt pointer, cooldown, best score (server-only)
  idempotency/{keyHash}                    ← retry protection for mutations (server-only)

accountTombstones/{uid}                    ← deletion record (server-only, permanent)

adminAudit/{eventId}                       ← publish/rollback/delete/role audit (server-only, append-only)
```

Counts: **5 top-level collections** (`system`, `contentVersions`, `users`, `accountTombstones`, `adminAudit`), **5 user subcollections**, **4 version subcollections** (`courses`, `quizzes`, `quizBanks`, `aiSections`), plus the nested `lessons` and `private`/`questions` levels shown above. A student's private state never lives in a content document, and a content document never contains a key.

### 4.1 Roadmap term → concrete Firestore path

| Term used by N1–N7 | Concrete path in this model |
|---|---|
| `courses` | `contentVersions/{v}/courses/{courseId}` |
| `lessons` | `contentVersions/{v}/courses/{courseId}/lessons/{lessonId}` |
| `publishedContentVersion` (active pointer) | `system/publishedContentVersion` |
| `quizDefinition` | `contentVersions/{v}/quizzes/{quizId}` (metadata only) |
| private question bank | `contentVersions/{v}/quizBanks/{quizId}/questions/{questionId}` |
| `users` profile | `users/{uid}` |
| `progress` | `users/{uid}/courseProgress/{courseId}` + `users/{uid}/lessonProgress/{lessonId}` |
| `attempts` | `users/{uid}/attempts/{attemptId}` |
| `cooldown` | `users/{uid}/quizState/{quizId}` (`cooldownUntil`, `cooldownReason`, `cycleAttemptsUsed`) |
| AI source sections | `contentVersions/{v}/aiSections/{sectionId}` |
| deletion tombstones | `accountTombstones/{uid}` |

---

## 5. Content collections (versioned, read-only for clients)

### 5.1 `system/publishedContentVersion` — active pointer

Singleton document. Path: `system/publishedContentVersion`.

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `contentVersion` | string | yes | yes | e.g. `v003`; the only version clients may read |
| `previousContentVersion` | string \| null | yes | yes | rollback target; `null` before first publish |
| `formatVersion` | int | yes | yes | `1` |
| `checksum` | string | yes | yes | SHA-256 over the manifest |
| `publishedAt` | timestamp | yes | yes | server time |
| `publishedBy` | string | yes | yes | admin UID |
| `status` | string | yes | yes | `"published"` |

**Why a singleton:** publishing becomes one atomic pointer write. Rollback is the same write in reverse. Clients resolve this document once per session and then read inside `contentVersions/{thatVersion}`.

**No client writes.** There is exactly one document and no client path to add or remove it.

### 5.2 `contentVersions/{versionId}` — publish metadata

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `contentVersion` | string | yes | yes | must equal `versionId` |
| `formatVersion` | int | yes | yes | `1` |
| `status` | string | yes | yes | `"staging"` \| `"published"` \| `"archived"` \| `"rolledBack"` |
| `courseCount` | int | yes | yes | must be `6` before publish |
| `lessonCount` | int | yes | yes | must be `>= 12` before publish |
| `checksum` | string | yes | yes | SHA-256 of the manifest |
| `createdAt` | timestamp | yes | yes | import start |
| `createdBy` | string | yes | yes | admin UID |
| `publishedAt` | timestamp \| null | yes | yes | `null` while staging |
| `publishedBy` | string \| null | yes | yes | admin UID |
| `archivedAt` | timestamp \| null | yes | yes | set when superseded or rolled back |
| `rollbackOf` | string \| null | yes | yes | version this one restored, if any |
| `validation` | map | yes | yes | `{ ok: bool, errors: array<string>, validatedAt: timestamp }` |
| `notes` | string | no | yes | operator note |

**Client read:** only when `versionId == system/publishedContentVersion.contentVersion`. Staging and archived versions are invisible to clients, but remain readable to the backend so pinned attempts can still be graded after a rollback.

### 5.3 `contentVersions/{versionId}/courses/{courseId}`

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `courseId` | string | yes | no (safe) | must equal `courseId`; e.g. `course-01` |
| `order` | int | yes | no | `1`..`6`, unique within the version |
| `title` | map `{en, ar}` | yes | no | |
| `description` | map `{en, ar}` | yes | no | |
| `estimatedMinutes` | int | yes | no | display only |
| `lessonCount` | int | yes | no | denormalized for the catalog |
| `finalQuizId` | string | yes | no | resolves under `quizzes/` |
| `status` | string | yes | no | `"approved"` for publishable content |
| `contentVersion` | string | yes | no | denormalized copy for cache debugging |
| `createdAt` | timestamp | yes | yes | |
| `updatedAt` | timestamp | yes | yes | |

**ID strategy:** `course-01` … `course-06`. The ID is permanent; `order` may change only in a new version. Course metadata (title/order) is public even when lessons are locked, so guests can see the catalog.

### 5.4 `contentVersions/{versionId}/courses/{courseId}/lessons/{lessonId}`

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `lessonId` | string | yes | no | e.g. `lesson-01-01`; equals doc ID |
| `courseId` | string | yes | no | denormalized for collection-group queries |
| `order` | int | yes | no | lesson position inside the course |
| `title` | map `{en, ar}` | yes | no | |
| `summary` | map `{en, ar}` | yes | no | |
| `estimatedMinutes` | int | yes | no | |
| `sections` | array<map> | yes | no | ordered content blocks, see below |
| `checkpoint` | map | yes | no | **question only**, never the answer |
| `quizId` | string | yes | no | `quiz-c01-l01` |
| `status` | string | yes | no | `"approved"` |
| `contentVersion` | string | yes | no | denormalized copy |
| `updatedAt` | timestamp | yes | yes | |

**`sections[]` element**

| Key | Type | Required | Notes |
|---|---|---|---|
| `sectionId` | string | yes | `sec-01`, unique within the lesson |
| `order` | int | yes | 1-based |
| `type` | string | yes | `"text"` \| `"image"` \| `"video"` \| `"example"` |
| `text` | map `{en, ar}` | for text/example | |
| `imageUrl` | string | for image | HTTPS URL; no image bytes in Firestore |
| `alt` | map `{en, ar}` | for image | accessibility |
| `videoUrl` | string | for video | unlisted YouTube or optional fallback URL |
| `caption` | map `{en, ar}` | no | |

**`checkpoint` map (public projection)**

| Key | Type | Required | Notes |
|---|---|---|---|
| `checkpointId` | string | yes | `cp-01` |
| `afterSectionId` | string | yes | midpoint anchor |
| `question` | map `{en, ar}` | yes | |
| `options` | array<map> | yes | `{ optionId, text: {en, ar} }`, 2–6 options |
| `maxRetries` | int \| null | yes | `null` means unlimited |

**The correct option is not here.** It lives in `lessons/{lessonId}/private/checkpointKey` (§5.5). Firestore rules cannot hide a field, so putting `correctOptionId` in this document would leak it.

**Size cap:** `sections` ≤ 100 blocks and the whole lesson document ≤ 700 KiB. If a lesson ever exceeds this, a later content version may split blocks into a `blocks` subcollection; the MVP does not need it.

### 5.5 `contentVersions/{versionId}/courses/{courseId}/lessons/{lessonId}/private/checkpointKey`

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `checkpointId` | string | yes | **yes (read + write)** | matches the public checkpoint |
| `correctOptionId` | string | yes | yes | exactly one correct option |
| `explanation` | map `{en, ar}` | yes | yes | released by the backend after a correct submission; never before |
| `updatedAt` | timestamp | yes | yes | |

**No client read, no client write.** This is the only place a checkpoint answer exists.

### 5.6 `contentVersions/{versionId}/quizzes/{quizId}` — public definition (`quizDefinition`)

This document is the `quizDefinition` named in the N1–N7 roadmap. It describes the quiz but contains no questions and no keys.

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `quizId` | string | yes | no | `quiz-c01-l01` or `quiz-c01-final` |
| `type` | string | yes | no | `"lesson"` \| `"final"` |
| `courseId` | string | yes | no | |
| `lessonId` | string \| null | yes | no | `null` for finals |
| `order` | int | yes | no | lesson order; `999` for a final |
| `title` | map `{en, ar}` | yes | no | |
| `timeLimitMinutes` | int | yes | no | `15` (lesson) or `30` (final) |
| `questionCount` | int | yes | no | `10` or `20` |
| `passingScore` | int | yes | no | `7` or `14` |
| `passingPercent` | int | yes | no | `70` |
| `maxAttemptsPerCycle` | int | yes | no | `3` |
| `cooldownMinutes` | int | yes | no | `30` |
| `bankSize` | int | yes | no | must be `>= questionCount` |
| `status` | string | yes | no | `"approved"` |
| `contentVersion` | string | yes | no | denormalized copy |

**No question text, no question IDs, no answers.** Official quizzes are online-only; the backend releases one question at a time from the private bank. This prevents downloading the bank before an attempt.

**Client read:** same unlock gate as the lesson (course 1 is free; later courses require `courseProgress.status != "locked"`). A guest sees the course-1 quiz metadata but still cannot start an attempt.

### 5.7 `contentVersions/{versionId}/quizBanks/{quizId}` — private bank metadata

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `quizId` | string | yes | **yes** | matches the public definition |
| `type` | string | yes | yes | `"lesson"` \| `"final"` |
| `courseId` | string | yes | yes | |
| `lessonId` | string \| null | yes | yes | |
| `questionCount` | int | yes | yes | must equal the real bank size |
| `checksum` | string | yes | yes | integrity check |
| `updatedAt` | timestamp | yes | yes | |

**No client read/write.** A student who can read the bank could pre-compute answers, so the entire collection is server-only even though metadata alone looks harmless.

### 5.8 `contentVersions/{versionId}/quizBanks/{quizId}/questions/{questionId}`

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `questionId` | string | yes | **yes** | `q001`..`qNNN`, unique within the bank |
| `type` | string | yes | yes | `"mcq"` \| `"true_false"` |
| `prompt` | map `{en, ar}` | yes | yes | |
| `options` | array<map> | yes | yes | `{ optionId, text: {en, ar} }`; 2–4 options |
| `correctOptionIds` | array<string> | yes | yes | exactly 1 for MVP |
| `explanation` | map `{en, ar}` | yes | yes | released only after finalization |
| `difficulty` | string | no | yes | `"easy"` \| `"medium"` \| `"hard"` |
| `tags` | array<string> | no | yes | import/diagnostic only |
| `sourceRef` | string | no | yes | traceability for content review |

**Leak controls**

- The client never reads this path. Questions are returned by `startQuiz` / `getQuizStatus` **without** `correctOptionIds` and without `explanation`.
- `finishQuiz` may return the review (correct answer + explanation) only **after** the attempt is `finalized`, and only for questions in that attempt.
- AI export (§5.9) is built from `aiSections`, never from this collection, and the export validator rejects any document containing `correctOptionIds`.
- The API must never include a bank document wholesale in a response; it maps explicit fields.

### 5.9 `contentVersions/{versionId}/aiSections/{sectionId}` — approved AI source

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `sectionId` | string | yes | **yes** | `ai-c01-l01-001` |
| `courseId` | string | yes | yes | |
| `lessonId` | string \| null | yes | yes | `null` for a course-level overview |
| `language` | string | yes | yes | `"en"` \| `"ar"` |
| `heading` | string | yes | yes | |
| `body` | string | yes | yes | approved plain text |
| `keywords` | array<string> | yes | yes | retrieval hints |
| `sourceRef` | string | yes | yes | lesson/section citation |
| `order` | int | yes | yes | stable export order |
| `approved` | bool | yes | yes | must be `true` to export |
| `checksum` | string | yes | yes | integrity check |

**No quiz IDs, no answer keys, no explanations, no unpublished drafts.** The Python AI service never receives Firestore credentials; the backend exports approved sections at a pinned `contentVersion`. Guests and active-quiz students are blocked before retrieval (N5-05).

---

## 6. User collections

Users are identified by the Firebase Auth UID. There is **no separate internal user ID**: the Auth UID is the document ID everywhere. Guests have no `users/{uid}` document and no progress; they may read only approved public content.

### 6.1 `users/{uid}` — profile

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `uid` | string | yes | no | must equal doc ID |
| `email` | string \| null | yes | yes | mirror only; Auth is authoritative |
| `displayName` | string \| null | no | **no (owner-writable)** | trimmed, 1–80 chars |
| `preferredLanguage` | string | yes | **no (owner-writable)** | `"en"` \| `"ar"` |
| `role` | string | yes | yes | `"student"` \| `"admin"`; **mirror only** |
| `status` | string | yes | yes | `"active"` \| `"disabled"` \| `"deleted"` |
| `createdAt` | timestamp | yes | yes | |
| `updatedAt` | timestamp | yes | yes | |
| `lastLoginAt` | timestamp \| null | no | yes | |
| `deletedAt` | timestamp \| null | no | yes | set during deletion |
| `purgeAfter` | timestamp \| null | no | yes | deletion grace period |

**Role authority:** `authorize()` reads the role from **Firebase Auth custom claims** and compares it with the live Auth user record (N1-12). `users.role` is a denormalized mirror for admin listing and support only. Firestore rules must never treat `users.role` as more authoritative than `request.auth.token.role`, and a mismatch is a bug, not a grant.

**Client write allowlist (N2-04):** the owner may update only `displayName` and `preferredLanguage`, only while `status == "active"`, and never `role`, `status`, `email`, `uid`, timestamps, or deletion fields. The `users.role` field is a confirmed mirror only (D-05); Auth claims remain authoritative, so no rule may use it as a grant. Exact predicate: [`schema-lock.md`](./schema-lock.md) §5.

### 6.2 `users/{uid}/courseProgress/{courseId}` — unlock + completion

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `courseId` | string | yes | no | equals doc ID |
| `order` | int | yes | no | copied from content for sorting |
| `status` | string | yes | yes | `"locked"` \| `"unlocked"` \| `"inProgress"` \| `"completed"` |
| `unlockedAt` | timestamp \| null | yes | yes | |
| `unlockSource` | string \| null | yes | yes | `"default"` \| `"finalPass"` \| `"admin"` |
| `unlockedByAttemptId` | string \| null | yes | yes | audit trail |
| `completedAt` | timestamp \| null | yes | yes | set on final pass |
| `finalPassedAt` | timestamp \| null | yes | yes | |
| `finalBestScore` | int \| null | yes | yes | correct answers, best final attempt |
| `finalBestTotal` | int | yes | yes | `20` |
| `contentVersion` | string | yes | yes | version of the content that granted the state |
| `updatedAt` | timestamp | yes | yes | |

**Ownership:** implicit from the `/users/{uid}/` path; every document also carries `courseId` but no separate owner field is needed. Rules use the path UID.

**Monotonicity:** official transitions only move forward:

```
locked → unlocked → inProgress → completed
```

A failed attempt never re-locks a course. Content rollback does **not** revoke unlocks (the student already earned them). Only an explicit admin reset may move backwards, and it must write an `adminAudit` event.

**Course 1 default:** `course-01` is unlocked without a progress document. The backend creates the document lazily on first official action, and rules treat `courseId == "course-01"` as free. Later courses require a progress document with `status != "locked"`. Confirmed D-02 uses the rules `get(courseProgress)` approach; no `entitlements` collection exists.

### 6.3 `users/{uid}/lessonProgress/{lessonId}` — checkpoint + lesson completion

| Field | Type | Required | Server-only | Notes |
|---|---|---|---|---|
| `lessonId` | string | yes | no | equals doc ID |
| `courseId` | string | yes | no | denormalized for course progress queries |
| `lessonOrder` | int | yes | no | copied from content |
| `checkpointPassed` | bool | yes | yes | unlimited retries; never consumes an attempt |
| `checkpointPassedAt` | timestamp \| null | yes | yes | |
| `checkpointAnswerCount` | int | yes | yes | analytics only; not a limit |
| `isCompleted` | bool | yes | yes | see definition below |
| `completedAt` | timestamp \| null | yes | yes | |
| `lessonQuizPassed` | bool | yes | yes | |
| `lessonQuizBestScore` | int \| null | yes | yes | correct answers |
| `lastAttemptId` | string \| null | yes | yes | most recent lesson-quiz attempt |
| `contentVersion` | string | yes | yes | |
| `updatedAt` | timestamp | yes | yes | |

**Completion definition (confirmed D-07):** `isCompleted = checkpointPassed && lessonQuizPassed`. Course completion is separate and requires the **course final** pass (§6.2). Both are backend-computed; the client cannot set them.

**Monotonicity:** `checkpointPassed`, `isCompleted`, and `lessonQuizPassed` never return to `false`; scores only increase (`best` semantics). A lower later score does not overwrite a higher best.

### 6.4 `users/{uid}/attempts/{attemptId}` — official attempt

**Server-only: no client read, no client write.** Flutter reads attempt state through `getQuizStatus`; it never reads this collection directly. This keeps the draw, answers, and review away from a tampered client and gives the backend one authoritative record.

| Field | Type | Required | Notes |
|---|---|---|---|
| `attemptId` | string | yes | ULID generated by the backend; equals doc ID |
| `uid` | string | yes | duplicated for collection-group queries; must equal path UID |
| `quizId` | string | yes | |
| `type` | string | yes | `"lesson"` \| `"final"` |
| `courseId` | string | yes | |
| `lessonId` | string \| null | yes | |
| `contentVersion` | string | yes | pinned at start; grading uses this version |
| `attemptNumberInCycle` | int | yes | `1`..`3` |
| `status` | string | yes | `"active"` \| `"finalized"` \| `"expired"` \| `"void"` |
| `startedAt` | timestamp | yes | server time at acceptance |
| `deadlineAt` | timestamp | yes | `startedAt + timeLimitMinutes`; server-authoritative |
| `timeLimitMinutes` | int | yes | `15` or `30` |
| `questionCount` | int | yes | `10` or `20` |
| `passingScore` | int | yes | `7` or `14` |
| `draw` | map | yes | `{ questionIds: array<string>, optionOrder: map<questionId, array<optionId>> }` |
| `answers` | map<questionId, array<optionId>> | yes | acknowledged answers only; starts `{}` |
| `answeredCount` | int | yes | derived from `answers` |
| `finalizedAt` | timestamp \| null | yes | set once |
| `gradedAt` | timestamp \| null | yes | may equal `finalizedAt` |
| `gradingVersion` | string \| null | yes | grading algorithm version, e.g. `"g1"` |
| `correctCount` | int \| null | yes | released only after finalization |
| `scorePercent` | int \| null | yes | integer 0–100 |
| `passed` | bool \| null | yes | |
| `review` | array<map> \| null | yes | `{ questionId, selectedOptionIds, correctOptionIds, isCorrect, explanation }`; only after finalization |
| `startIdempotencyKey` | string | yes | client UUID; stored for audit |
| `lastSaveIdempotencyKey` | string \| null | yes | most recent accepted save |
| `finalizeIdempotencyKey` | string \| null | yes | |
| `saveCount` | int | yes | accepted saves |
| `lastSavedAt` | timestamp \| null | yes | |
| `voidReason` | string \| null | no | admin only |
| `updatedAt` | timestamp | yes | |

**Stable draw:** `draw.questionIds` is selected once, without replacement, from the pinned bank. `draw.optionOrder` stores the shuffled option order per question. Resuming or retrying a request returns the same draw; a new attempt draws again.

**Expiry:** a `status == "active"` attempt past `deadlineAt` is graded from acknowledged answers (unanswered = incorrect) and becomes `"expired"`. The deadline never pauses for network loss, app restart, or backgrounding.

**Attempt count:** `attemptNumberInCycle` is `1..3`. A fourth start is rejected until `cooldownUntil` passes. This field is copied into the attempt for audit even after the cycle resets.

### 6.5 `users/{uid}/quizState/{quizId}` — active lock, attempts, cooldown

**Server-only.** One document per user per quiz. It is the transaction anchor that makes `startQuiz` idempotent and prevents double-charging attempts.

| Field | Type | Required | Notes |
|---|---|---|---|
| `quizId` | string | yes | equals doc ID |
| `courseId` | string | yes | |
| `lessonId` | string \| null | yes | |
| `type` | string | yes | `"lesson"` \| `"final"` |
| `activeAttemptId` | string \| null | yes | `null` when no attempt is running |
| `activeDeadlineAt` | timestamp \| null | yes | mirror of the active attempt's deadline |
| `lastAttemptAt` | timestamp \| null | yes | |
| `cycleAttemptsUsed` | int | yes | `0`..`3`; resets after a pass or cooldown expiry |
| `cooldownUntil` | timestamp \| null | yes | `null` when eligible; **this is the cooldown record** |
| `cooldownReason` | string \| null | yes | `"threeFailures"` or `null` |
| `bestCorrectCount` | int \| null | yes | best across attempts |
| `bestScorePercent` | int \| null | yes | |
| `totalAttempts` | int | yes | lifetime, for support only |
| `passedAt` | timestamp \| null | yes | set on first pass; never cleared |
| `updatedAt` | timestamp | yes | |

**Cooldown rule:** after the third unsuccessful **formal** attempt in the current cycle, the backend sets `cooldownUntil = now + 30 minutes` and `cooldownReason = "threeFailures"`. A lesson checkpoint never touches this document. When a new start arrives after `cooldownUntil`, the transaction clears `cooldownUntil`, sets `cycleAttemptsUsed = 0`, and proceeds. A pass clears the cooldown and sets `passedAt`; later attempts are allowed but no longer affect unlocking.

**Cooldown scope (confirmed D-08):** per quiz. A lesson quiz cooldown does not block the course final, and vice versa. The grouping key is `quizId`, which is the document ID.

### 6.6 `users/{uid}/idempotency/{keyHash}` — mutation retry guard

**Server-only.** Prevents duplicate grading, double attempt charging, and duplicate lesson completion when the client retries after a timeout.

| Field | Type | Required | Notes |
|---|---|---|---|
| `operation` | string | yes | `"startQuiz"` \| `"saveQuizAnswer"` \| `"finishQuiz"` \| `"completeLesson"` \| `"checkpoint"` |
| `requestHash` | string | yes | SHA-256 of the canonical request body |
| `response` | map | yes | the exact response payload to replay |
| `createdAt` | timestamp | yes | |
| `expiresAt` | timestamp | yes | TTL target, 24 hours |

**Doc ID:** SHA-256 of `uid|operation|clientKey`. Client keys are UUIDs; hashing keeps IDs filesystem-safe and bounded. A retry with the same key and same `requestHash` replays the stored response; the same key with a different hash is rejected as a conflict.

---

## 7. Deletion tombstones

### 7.1 `accountTombstones/{uid}`

**Server-only, permanent, append-only.** Written in the same transaction that marks the profile deleted, before any purge.

| Field | Type | Required | Notes |
|---|---|---|---|
| `uid` | string | yes | equals doc ID |
| `status` | string | yes | `"deleted"` \| `"purged"` |
| `requestedAt` | timestamp | yes | when the user requested deletion |
| `deletedAt` | timestamp | yes | when the backend accepted it |
| `authDeletedAt` | timestamp \| null | yes | when the Auth account was deleted/disabled |
| `purgedAt` | timestamp \| null | yes | when private subcollections were removed |
| `purgeAfter` | timestamp | yes | grace period end |
| `reason` | string | yes | `"userRequest"` \| `"admin"` |
| `lastKnownRole` | string | no | support evidence |
| `requestId` | string | yes | correlates with `adminAudit` |

**Why it matters:** deleting the Auth account makes existing tokens fail, but it does not stop a queued client write from arriving with a still-valid token, and it does not leave an audit trail. The tombstone is checked by every mutation before it touches user data; its presence means **fail closed**. UIDs are not reused, so the tombstone also blocks resurrection of the same logical account.

**Content deletion is different:** published course/lesson content is never hard-deleted in place. A new `contentVersion` omits it, the pointer moves, and the old version is archived (§9). This preserves grading of pinned attempts and makes rollback possible.

**Purge order:** tombstone → profile `status = "deleted"` → Auth deletion → recursive delete of `courseProgress`, `lessonProgress`, `attempts`, `quizState`, `idempotency` → profile document → `status = "purged"`. The tombstone itself is never deleted.

---

## 8. Supporting collection

### 8.1 `adminAudit/{eventId}` — optional, recommended

**Server-only, append-only.** Not required for a student-facing demo, but publish, rollback, role change, and account deletion are exactly the operations a defense reviewer will ask about.

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventId` | string | yes | ULID; equals doc ID |
| `action` | string | yes | `"publishContent"` \| `"rollbackContent"` \| `"deleteAccount"` \| `"setRole"` \| `"resetProgress"` |
| `actorUid` | string | yes | admin UID from the verified token |
| `actorRole` | string | yes | must be `"admin"` |
| `targetType` | string | yes | `"contentVersion"` \| `"user"` \| `"courseProgress"` |
| `targetId` | string | yes | |
| `before` | map \| null | no | minimal diff, no secrets |
| `after` | map \| null | no | minimal diff, no secrets |
| `requestId` | string | yes | |
| `createdAt` | timestamp | yes | |

**Confirmed decision D-06:** `adminAudit` is included in the MVP. It will be seeded in N2-03 and protected in N2-04 with server-only access.

---

## 9. `contentVersion` atomic publish and rollback

### 9.1 Publish sequence

1. **Import into staging.** Create `contentVersions/{vNew}` with `status: "staging"`, then write courses, lessons, checkpoints, quizzes, banks, and AI sections. No client can see them because the active pointer still names the old version.
2. **Validate.** The importer must reject the version unless all of these hold:
   - exactly 6 courses with `order` 1..6, each `status == "approved"`;
   - at least 12 lessons total and at least 2 per course;
   - every `finalQuizId` and `quizId` resolves;
   - every bank has `bankSize >= questionCount` (≥10 lesson, ≥20 final);
   - every question has exactly one `correctOptionIds` entry and both languages;
   - every lesson checkpoint has a matching private key;
   - no `correctOptionIds`, `explanation`, or `review` appears in any client-readable document;
   - AI sections contain no quiz IDs, answers, or explanations;
   - IDs are unique, references resolve, and the manifest checksum matches.
3. **Publish atomically.** One Firestore transaction updates exactly two documents:
   - `contentVersions/{vNew}`: `status = "published"`, `publishedAt`, `publishedBy`;
   - `system/publishedContentVersion`: `contentVersion = vNew`, `previousContentVersion = old`, `publishedAt`, `publishedBy`, `checksum`.
   Content documents are not rewritten. The pointer flip is the commit.
4. **Archive the old version.** Set the previous `contentVersions/{old}.status = "archived"` and `archivedAt` (same transaction or an immediate follow-up; readers follow the pointer, so a brief overlap is harmless).
5. **Post-publish check.** Read the pointer and one course/lesson/quiz through the client SDK as a guest; any failure triggers an immediate rollback.

### 9.2 Rollback sequence

1. One transaction sets the pointer back to `previousContentVersion` and marks the bad version `status = "rolledBack"`.
2. The restored version returns to `status = "published"`; its content was never modified.
3. Attempts already started keep their pinned `contentVersion`; grading reads that archived version with the Admin SDK. AI requests pin the version at request start and fail closed if it disappears.
4. No student progress is reverted. A student who passed under the bad version keeps the unlock; content corrections are a separate editorial action.

### 9.3 Version retention

- Keep the active version plus at least the two most recent predecessors.
- Never purge a version referenced by an `active` attempt or an open AI request.
- Purge is a manual/admin job in the MVP; it writes an `adminAudit` event.
- Retention follows confirmed **D-04**: attempts are kept for the MVP; the last three content versions are retained.

### 9.4 Why this is Firestore-native, not relational

There is no `content_versions` join table and no foreign-key constraint. The pointer is a single document read; the version is a path prefix. Publishing cannot partially expose content because only one pointer controls visibility. Rollback cannot corrupt content because published documents are immutable.

---

## 10. Indexes for N2-02 / N2-06

Single-field indexes are automatic. The following **composite** indexes must be added to `firestore.indexes.json` when the corresponding queries are implemented. They are listed now so the schema does not force a redesign later.

| # | Collection group | Scope | Fields (in order) | Query served |
|---|---|---|---|---|
| I-01 | `quizzes` | COLLECTION | `courseId ASC`, `type ASC`, `order ASC` | course quiz list (lesson quizzes then final) |
| I-02 | `lessons` | COLLECTION | `courseId ASC`, `order ASC` | lesson list for a course |
| I-03 | `attempts` | COLLECTION | `uid ASC`, `startedAt DESC` | a student's attempt history (server support) |
| I-04 | `attempts` | COLLECTION | `quizId ASC`, `status ASC`, `startedAt ASC` | active/expired attempt audit, concurrency checks |
| I-05 | `attempts` | COLLECTION | `status ASC`, `deadlineAt ASC` | expiry sweep (scheduled job) |
| I-06 | `lessonProgress` | COLLECTION | `courseId ASC`, `lessonOrder ASC` | course progress screen |
| I-07 | `users` | COLLECTION | `role ASC`, `status ASC`, `createdAt ASC` | admin/student listing (server) |
| I-08 | `aiSections` | COLLECTION | `courseId ASC`, `language ASC`, `order ASC` | AI export in a stable order |
| I-09 | `adminAudit` | COLLECTION | `actorUid ASC`, `createdAt DESC` | actions by one admin |
| I-10 | `adminAudit` | COLLECTION | `action ASC`, `createdAt DESC` | one action type over time |
| I-11 | `accountTombstones` | COLLECTION | `status ASC`, `deletedAt ASC` | purge sweep |
| I-12 | `quizState` | COLLECTION | `cooldownUntil ASC` | cooldown sweep (single-field; verify emulator behavior) |

**I-12 is single-field**, so Firestore's automatic index should cover it; it is intentionally absent from the composite JSON block below and must be verified in the emulator during N2-06.

**Index JSON skeleton (do not deploy in N2-01):**

```json
{
  "indexes": [
    { "collectionGroup": "quizzes", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "courseId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ] },
    { "collectionGroup": "lessons", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "courseId", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ] },
    { "collectionGroup": "attempts", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ] },
    { "collectionGroup": "attempts", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "quizId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "ASCENDING" }
      ] },
    { "collectionGroup": "attempts", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "deadlineAt", "order": "ASCENDING" }
      ] },
    { "collectionGroup": "lessonProgress", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "courseId", "order": "ASCENDING" },
        { "fieldPath": "lessonOrder", "order": "ASCENDING" }
      ] },
    { "collectionGroup": "users", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ] },
    { "collectionGroup": "aiSections", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "courseId", "order": "ASCENDING" },
        { "fieldPath": "language", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ] },
    { "collectionGroup": "adminAudit", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actorUid", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ] },
    { "collectionGroup": "adminAudit", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "action", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ] },
    { "collectionGroup": "accountTombstones", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "deletedAt", "order": "ASCENDING" }
      ] }
  ],
  "fieldOverrides": []
}
```

**TTL policies (N2-06):**

| Path | Field | Retention |
|---|---|---|
| `users/{uid}/idempotency/{keyHash}` | `expiresAt` | 24 hours |
| `users/{uid}/attempts/{attemptId}` | — | no TTL in MVP; retained for history/support (D-04) |
| `accountTombstones/{uid}` | — | permanent |
| `adminAudit/{eventId}` | — | no TTL in MVP |

---

## 11. Trust matrix (input for N2-04 rules)

`get()` below means the rule resolves `users/{uid}/courseProgress/{courseId}`. A missing document denies, which is the desired fail-closed behavior for locked courses. Guest reads apply only to the **active** version.

| Path | Guest read | Student read | Student write | Backend write | Notes |
|---|---|---|---|---|---|
| `system/publishedContentVersion` | yes | yes | no | yes | public pointer |
| `contentVersions/{v}` | active only | active only | no | yes | staging/archived hidden |
| `.../courses/{c}` | yes | yes | no | yes | catalog is public |
| `.../lessons/{l}` | `c == "course-01"` | unlocked courses | no | yes | unlock gate |
| `.../lessons/{l}/private/*` | no | no | no | yes | checkpoint answer |
| `.../quizzes/{q}` | `c == "course-01"` | unlocked courses | no | yes | metadata only |
| `.../quizBanks/**` | no | no | no | yes | question bank + keys |
| `.../aiSections/{s}` | no | no | no | yes | AI source |
| `users/{uid}` | no | own | `displayName`, `preferredLanguage` only | yes | role/status server-only |
| `users/{uid}/courseProgress/{c}` | no | own | no | yes | unlock authority |
| `users/{uid}/lessonProgress/{l}` | no | own | no | yes | completion authority |
| `users/{uid}/attempts/{a}` | no | no | no | yes | API only |
| `users/{uid}/quizState/{q}` | no | no | no | yes | cooldown authority |
| `users/{uid}/idempotency/{k}` | no | no | no | yes | replay cache |
| `accountTombstones/{uid}` | no | no | no | yes | deletion evidence |
| `adminAudit/{e}` | no | no | no | yes | append-only |

**Illustrative rule shape (not deployed in N2-01):**

```js
function activeVersion() {
  return get(/databases/$(database)/documents/system/publishedContentVersion)
    .data.contentVersion;
}

function courseUnlocked(courseId) {
  return courseId == "course-01" ||
    (request.auth != null &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)/courseProgress/$(courseId))
       .data.status != "locked");
}

match /contentVersions/{v}/courses/{c}/lessons/{l} {
  allow read: if v == activeVersion() && courseUnlocked(c);
  allow write: if false;
}

match /contentVersions/{v}/courses/{c}/lessons/{l}/private/{doc} {
  allow read, write: if false;
}
```

**Rule-cost note:** `get()` runs once per evaluated document. A catalog of 6 courses costs 6 pointer reads. That is acceptable at MVP scale. Denormalizing the entitlement to `users/{uid}/entitlements/{courseId}` would require a new decision superseding confirmed D-02.

---

## 12. Quiz lifecycle mapped to fields

All steps run in Firestore transactions on `users/{uid}/quizState/{quizId}` and `users/{uid}/attempts/{attemptId}`. No client write is involved.

| Step | Reads | Writes | Invariant enforced |
|---|---|---|---|
| `startQuiz` | quiz definition (pinned version), `quizState`, idempotency | new attempt (`active`), `quizState.activeAttemptId`, `lastAttemptAt`, `cycleAttemptsUsed + 1`, idempotency | at most one active attempt; cooldown respected; draw is unique and stable |
| `saveQuizAnswer` | attempt, quizState | `answers[qid]`, `answeredCount`, `lastSavedAt`, `saveCount`, idempotency | rejects if not active, past deadline, wrong owner, question not in draw, or unknown option |
| `finishQuiz` | attempt, bank at pinned version, quizState | attempt `finalized`, `correctCount`, `scorePercent`, `passed`, `review`, `finalizedAt`; `quizState` best/cooldown/passed; `lessonProgress` or `courseProgress`; next course unlock; idempotency | grading uses the pinned draw and bank; pass threshold 70%; final pass unlocks exactly the next course |
| timeout / lazy expiry | attempt, bank | attempt `expired`, grade from acknowledged answers; `quizState` cooldown/counters | unacknowledged answers are wrong; no pause for disconnect |
| cooldown start | `quizState` | `cooldownUntil`, `cooldownReason`, `cycleAttemptsUsed` | third failure starts a 30-minute cooldown |
| cooldown end | `quizState` | clear `cooldownUntil`, reset `cycleAttemptsUsed` | attempts replenish only after server time passes |
| pass | attempt, `quizState` | `quizState.passedAt`, reset cooldown; progress/unlock | passing is permanent; no re-lock |

**Unlock write:** a final pass writes, in the same transaction:

- `courseProgress/{current}`: `status = "completed"`, `completedAt`, `finalPassedAt`, `finalBestScore`;
- `courseProgress/{next}`: `status = "unlocked"`, `unlockedAt`, `unlockSource = "finalPass"`, `unlockedByAttemptId`.

There are only 6 courses, so the next course is a direct document write, not a query. Course 6 has no next course.

---

## 13. Ownership summary

| Data | Owner | How rules prove it |
|---|---|---|
| `users/{uid}` and all subcollections | the Auth user | `request.auth.uid == uid` from the verified token |
| `attempts`, `quizState`, `idempotency` | the Auth user, backend-managed | path UID + no client read/write; the backend checks `attempt.uid == request.auth.uid` |
| content, banks, AI sections | the project/admin | no client writes; publish via trusted backend |
| tombstones, audit | the project | server-only |

No endpoint may accept `uid`, `role`, or ownership from a request body, query, or custom header. The N1-12 probes already established that the API ignores these. The same rule applies to N4 mutation payloads.

---

## 14. Confirmed decisions (normative)

**The eight N2 defaults were confirmed by the project owner on 2026-11-15.** They are binding for N2-02 through N2-07; changing one requires a documented decision and updated tests. D-09 and D-10 were recorded at N3-01 on 2026-11-16.

| ID | Decision | Adopted value | Consequence |
|---|---|---|---|
| D-01 | May a student read their own `attempts` documents? | **No**; API only | `attempts`, `quizState`, `idempotency` stay fully server-only |
| D-02 | Unlock check via `get(courseProgress)` or denormalized `entitlements`? | **`get(courseProgress)`**; no `entitlements` collection | Rules resolve progress per course; revisit only if rule cost/latency becomes a measured problem |
| D-03 | Checkpoint explanation timing | **Only after a correct submission** | The private key doc is never returned on a wrong answer |
| D-04 | Attempt/version retention | Attempts kept for the MVP; last 3 content versions retained | No attempt TTL; version purge is an admin job |
| D-05 | Is `users.role` a mirror or absent? | **Mirror**, Auth claims authoritative | `role` is readable by the owner but writable only by the backend |
| D-06 | Include `adminAudit` in MVP? | **Yes**, server-only, append-only | Publish/rollback/delete/role events are recorded |
| D-07 | Lesson completion definition | `checkpointPassed && lessonQuizPassed` | Course completion still requires the course final |
| D-08 | Cooldown scope | **Per quiz** | Each `quizState/{quizId}` owns its own 30-minute cooldown |
| D-09 | How does the client read approved content? | **Direct Firestore SDK reads** under the N2-04 rules; no Functions read endpoints in N3 | Guests read the catalog and `course-01`; signed-in students read unlocked courses; banks/AI/private stay server-only |
| D-10 | Are course names/order locked? | **Yes** - `course-01`..`course-06`, FR-05 endpoints, 12 bilingual lesson contracts in `scripts/catalog.cjs` | Title/description changes are content edits; reordering/renaming IDs requires a new `contentVersion` |

D-01...D-08 are isolated to fields/collections that already exist; none changes the tree in §4. D-09 adds no endpoint and D-10 changes no field, only the locked display text. The enforceable identifier, timestamp, ownership, and index constraints that follow from these decisions are specified in [`schema-lock.md`](./schema-lock.md).

---

## 15. Acceptance checklist (N2-01)

| Criterion | Where satisfied | Status |
|---|---|---|
| Firestore-native (collections/docs/subcollections, no relational ERD) | §2, §4, §9.4 | PASS (design) |
| `courses`, `lessons`, `publishedContentVersion` | §5.1, §5.3, §5.4 | PASS (design) |
| `quizDefinition` + private question banks | §5.6, §5.7, §5.8 | PASS (design) |
| `users` profile, `progress`, `attempts`, `cooldown` | §6.1–§6.5 | PASS (design) |
| AI source sections, approved only, no answer keys | §5.9 | PASS (design) |
| Deletion tombstones | §7 | PASS (design) |
| Per-collection ID strategy, fields/types, required/optional, timestamps, ordering, ownership, server-only | §3, §5, §6, §13 | PASS (design) |
| Indexes for N2-02/N2-06 | §10 | PASS (design) |
| `contentVersion` atomic commit | §9 | PASS (design) |
| No code or rules changes in N2-01 | §16 evidence | PASS |

---

## 16. Verification of N2-01 (documentation-only change)

N2-01 changes exactly one file: `backend\docs\data-model.md`. No source, rules, index, or test file is modified. Evidence for this claim:

- SHA-256 fingerprints of `index.ts`, `auth.ts`, `authorization.ts`, `firestore.rules`, `firestore.indexes.json`, and all six existing test files were taken before this document was written and are compared after.
- `npm run build` and `npm run lint` are rerun (unchanged source).
- The coordinated six-file test command is rerun: expected `tests 43 / pass 43 / fail 0`.

The document is not linted or type-checked; it is reviewed for consistency with `api-contract.md` and the N1–N7 roadmap. No Firestore emulator data is written, because N2-01 does not seed fixtures (that is N2-03).
