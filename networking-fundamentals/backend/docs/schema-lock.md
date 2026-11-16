# Firestore Schema Lock — N2-02

**Task:** N2-02 — IDs, indexes, timestamps, ordering, unique/versioned identifiers, and field-level ownership
**Owner:** Developer A (backend)
**Depends on:** [`data-model.md`](./data-model.md) (N2-01, decisions D-01…D-08 confirmed 2026-11-15)
**Status:** normative design. **No rules, indexes, functions, or fixtures are changed by N2-02.**
**Consumed by:** N2-03 (fixtures), N2-04 (rules), N2-06 (indexes/migrations)

---

## 1. Purpose

N2-01 fixed the shape of the data. N2-02 fixes the **constraints** that make that shape safe and testable:

- an exact grammar for every document ID;
- uniqueness and referential invariants a fixture set must satisfy;
- one timestamp policy, including quiz deadline and cooldown arithmetic;
- ordering rules that survive versioning;
- field-level ownership predicates for N2-04;
- a staged index plan for N2-06.

If a future change violates a rule here, it must be an explicit decision, not an accident. N2-03 fixtures will be validated against §3; N2-04 rules against §5; N2-06 indexes against §6.

---

## 2. Identifier grammar

All IDs are lowercase, contain no whitespace, and are never derived from an array index. Content IDs are **stable across versions**: `course-01` is the same logical course in `v001` and `v002`; a new version changes the path prefix, not the logical ID.

| Identifier | Applies to | Grammar | Uniqueness | Immutable |
|---|---|---|---|---|
| `contentVersion` | version doc, pointer, attempts, AI requests | `^v\d{3}$`, value ≥ `v001`, monotonic | globally, never reused | yes |
| `courseId` | courses | `^course-0[1-6]$` | exactly 6 per version | yes |
| `lessonId` | lessons | `^lesson-\d{2}-\d{2}$`; first group must equal the course number | globally within a version | yes |
| `quizId` | quizzes, banks, quizState | `^quiz-c0[1-6]-(l\d{2}\|final)$` | one lesson quiz per lesson; exactly one final per course | yes |
| `questionId` | bank questions | `^q\d{3}$` | within its bank | yes |
| `checkpointId` | lesson checkpoint + private key | `^cp-\d{2}$` | exactly one per lesson | yes |
| `sectionId` | lesson `sections[]` | `^sec-\d{2}$` | within its lesson | yes |
| `aiSectionId` | AI sections | `^ai-c\d{2}-(l\d{2}\|course)-\d{3}$` | globally within a version | yes |
| `attemptId` | attempts | ULID: `^[0-9A-HJKMNP-TV-Z]{26}$` | globally | yes |
| `eventId` | admin audit | ULID, same grammar | globally | yes |
| `keyHash` | idempotency doc ID | `^[a-f0-9]{64}$` (SHA-256 hex) | per user | yes |
| client idempotency key | request input only | UUID v4: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` | not stored raw | — |
| `uid` | users, attempts, tombstones | opaque, 1–128 chars, no `/`, not `.` or `..`, no control characters | Firebase Auth | yes |

**Rules**

1. The backend generates `attemptId` and `eventId`. A client-supplied attempt ID is rejected, never trusted.
2. `keyHash = SHA-256(uid + "|" + operation + "|" + clientKey)`. The raw client key is not stored.
3. Firestore document IDs cannot contain `/`; the account-creation path must reject a UID containing one before any write.
4. IDs never encode secrets, emails, display names, or timestamps that can change.
5. Content IDs are not reused after deletion. Removing a lesson means omitting it from a new version, not recycling its ID.
6. Version suffix is zero-padded to 3 digits so lexical order equals publish order.

**Example set**

```
v001
course-01
lesson-01-01
quiz-c01-l01
quiz-c01-final
q007
cp-01
sec-03
ai-c01-l01-001
01J8Z3K4M5N6P7Q8R9S0T1V2W3    (ULID example)
```

---

## 3. Uniqueness and referential invariants

Severity: **P** = publish blocker (content import), **R** = runtime rejection (functions/transactions), **F** = fixture assertion (N2-03).

| ID | Invariant | Severity | Checked by |
|---|---|---|---|
| V-01 | Exactly 6 courses; `order` values are exactly `1..6`, no duplicates | P | importer |
| V-02 | Every course has ≥2 lessons; total lessons ≥12 | P | importer |
| V-03 | `lessonId` course prefix matches `courseId`; `order` is `1..N` contiguous per course | P | importer |
| V-04 | Exactly one `type == "final"` quiz per course; exactly one `type == "lesson"` quiz per lesson | P | importer |
| V-05 | `type == "final"` ⇔ `lessonId == null`; `type == "lesson"` ⇒ `lessonId != null` | P | importer |
| V-06 | Quiz constants: lesson `questionCount=10`, `timeLimitMinutes=15`, `passingScore=7`; final `20`, `30`, `14`; both `passingPercent=70`, `maxAttemptsPerCycle=3`, `cooldownMinutes=30` | P | importer |
| V-07 | `bankSize >= questionCount`; actual question-document count equals `bankSize` | P | importer |
| V-08 | Each question has 2–4 unique options, exactly one `correctOptionIds` entry, and that option exists | P | importer |
| V-09 | Every checkpoint has exactly one private key; `correctOptionId` exists in the public options | P | importer |
| V-10 | No client-readable document contains `correctOptionIds`, `correctOptionId`, `explanation`, or `review` | P | importer + N2-04 tests |
| V-11 | Every AI section has `approved=true`, `language` in `{en, ar}`, and contains no quiz IDs, answers, or explanations | P | importer + export validator |
| V-12 | The pointer's `contentVersion` exists and has `status == "published"` | P | publish transaction |
| V-13 | `course.finalQuizId` resolves to a final quiz; `lesson.quizId` resolves to a lesson quiz in the same course | P | importer |
| V-14 | For every user subcollection document, the path `uid` equals any embedded `uid` | R | functions |
| V-15 | `attempt.uid == path uid`; `attempt.quizId` resolves; `attempt.contentVersion` exists (may be archived) | R | start/finish transaction |
| V-16 | `draw.questionIds` has exactly `questionCount` unique IDs, all present in the pinned bank; `draw.optionOrder[q]` is a permutation of that question's options | R | start transaction |
| V-17 | Every `answers` key is in `draw.questionIds`; every selected option exists; no answer after `deadlineAt` | R | save transaction |
| V-18 | `deadlineAt == startedAt + timeLimitMinutes × 60 × 1000 ms`; `finalizedAt` is set once; `gradedAt >= finalizedAt` | R | start/finish transaction |
| V-19 | `checkpointPassed`, `lessonQuizPassed`, `isCompleted`, `passedAt` never regress; best scores never decrease | R | progress writes |
| V-20 | If `accountTombstones/{uid}` exists, every user-data mutation fails closed | R | functions guard |

**Why V-10 is a publish blocker:** Firestore rules cannot remove a field. A single leaked key in a lesson or quiz-definition document cannot be fixed by rules; it must be rejected before publish.

---

## 4. Timestamp and ordering policy

### 4.1 Timestamps

| Rule | Detail |
|---|---|
| Type | Firestore `Timestamp`; never an ISO string, epoch number, or client `Date` |
| Authority | Functions runtime time (`Date.now()` / `FieldValue.serverTimestamp()`) |
| Client time | Never authoritative; an optional diagnostic `clientSavedAt` is not part of the MVP attempt schema |
| `createdAt` | written once, never updated |
| `updatedAt` | server-written on every mutation; must not decrease relative to the previous value |
| `publishedAt` / `archivedAt` | set by the publish/rollback transaction |
| `startedAt` | captured inside the `startQuiz` transaction that accepts the attempt |
| `deadlineAt` | exactly `startedAt + timeLimitMinutes × 60 × 1000` ms; no pause for disconnect, restart, or background |
| Active window | active while `now < deadlineAt`; at `now >= deadlineAt` the attempt is expired and is graded from acknowledged answers |
| `finalizedAt` | set once; later finish attempts replay the stored result through idempotency |
| `gradedAt` | `>= finalizedAt`; equal is allowed when grading is synchronous |
| `cooldownUntil` | exactly `failureAt + 30 minutes` |
| `expiresAt` (idempotency) | `createdAt + 24 hours`; TTL target |
| API display | backend maps `Timestamp` to ISO-8601 UTC (`...Z`); clients convert to local time for display only |

**Boundary decisions** (must be tested in N4):

- `now == deadlineAt` ⇒ expired.
- A save that arrives exactly at the deadline is accepted only if the transaction's server time is `< deadlineAt`.
- Cooldown ends at `now >= cooldownUntil`; the next start transaction resets the cycle.

### 4.2 Ordering

| Rule | Detail |
|---|---|
| Type | integer `order`, `>= 1` |
| Course order | exactly `1..6`, unique |
| Lesson order | `1..N` contiguous per course, unique |
| Section order | `1..N` contiguous per lesson, unique |
| Final quiz order | `999` (sorts after lesson quizzes) |
| AI section order | unique per `courseId + language`; gaps allowed |
| Ties | queries use `orderBy("order")` plus the implicit `__name__` tie-breaker; IDs are stable |
| Published content | never reordered in place; a reorder is a new `contentVersion` |
| Arrays | `sections[]` order is explicit; array position is not the source of truth |

**Why contiguity for courses/lessons/sections:** the UI shows "lesson 2 of 4" and the defense needs a deterministic sequence. Gaps are allowed only for AI sections, where editorial inserts are expected.

---

## 5. Field-level ownership (normative input for N2-04)

### 5.1 Matrix

| Document | Client create | Client read | Client update | Client delete | Owner proof |
|---|---|---|---|---|---|
| `system/publishedContentVersion` | no | yes | no | no | public pointer |
| `contentVersions/{v}` | no | active only | no | no | version pointer |
| `.../courses/{c}` | no | yes | no | no | active version |
| `.../lessons/{l}` | no | course 1 free; later courses require progress | no | no | `get(courseProgress)` |
| `.../lessons/{l}/private/*` | no | no | no | no | server-only |
| `.../quizzes/{q}` | no | same as lesson | no | no | `get(courseProgress)` |
| `.../quizBanks/**` | no | no | no | no | server-only |
| `.../aiSections/{s}` | no | no | no | no | server-only |
| `users/{uid}` | no (backend creates) | own only | `displayName`, `preferredLanguage` only | no | `request.auth.uid == uid` |
| `users/{uid}/courseProgress/{c}` | no | own only | no | no | path UID |
| `users/{uid}/lessonProgress/{l}` | no | own only | no | no | path UID |
| `users/{uid}/attempts/{a}` | no | no | no | no | API only (D-01) |
| `users/{uid}/quizState/{q}` | no | no | no | no | API only |
| `users/{uid}/idempotency/{k}` | no | no | no | no | API only |
| `accountTombstones/{uid}` | no | no | no | no | server-only |
| `adminAudit/{e}` | no | no | no | no | server-only |

### 5.2 Profile update predicate

N2-04 should implement the owner-write as close to this as the rules language allows:

```js
match /users/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow create, delete: if false;

  allow update: if request.auth != null
    && request.auth.uid == uid
    && resource.data.status == "active"
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(["displayName", "preferredLanguage"])
    && (!("displayName" in request.resource.data)
        || (request.resource.data.displayName is string
            && request.resource.data.displayName.size() <= 80))
    && (request.resource.data.preferredLanguage == "en"
        || request.resource.data.preferredLanguage == "ar");
}
```

Notes:

- `hasOnly` blocks `role`, `status`, `email`, `uid`, timestamps, and deletion fields even if the client sends them with unchanged values.
- `updatedAt` is deliberately **not** client-writable. A backend trigger/callable updates it, or it stays at the last server write. This avoids trusting a client clock.
- If field-level rules prove unreliable during N2-04, fall back to making the whole profile server-written and moving the two editable fields to `users/{uid}/preferences/settings`. That fallback is a rule-layer change, not a schema change.
- `users.role` is a mirror (D-05). No rule may grant access from it; use `request.auth.token.role` only if a future admin-client feature is approved.

### 5.3 Backend-only state

Every document below is written exclusively with the Admin SDK inside a transaction or idempotent function:

- all course/lesson progress flags, scores, and timestamps;
- all attempt fields, including the draw and acknowledged answers;
- `quizState` active pointer, cycle counters, cooldown, and best scores;
- unlock documents;
- tombstones and audit events.

The client can only **request** an operation through the API. Direct client writes are denied, not merely ignored.

---

## 6. Index plan for N2-06

Index definitions are listed in `data-model.md` §10 (I-01…I-12). N2-02 does not edit `firestore.indexes.json`; N2-06 owns the file. Deploy in stages so unused indexes do not add write cost.

| Stage | When | Indexes | Reason |
|---|---|---|---|
| 0 | N2-06 start | none; empty `indexes: []` is valid | direct document reads need no composite index |
| 1 | content fixtures | I-01, I-02, I-08 | course quiz list, lesson list, AI export |
| 2 | progress fixtures | I-06 | course progress screen |
| 3 | attempts/quiz | I-03, I-04, I-05, I-12 | history, concurrency audit, expiry/cooldown sweeps |
| 4 | admin/audit | I-07, I-09, I-10, I-11 | admin listing, audit queries, purge sweep |

**Emulator limitation:** the Firestore emulator does not enforce composite-index requirements, so emulator tests can pass a query that would fail on a deployed project. N2-06 must verify query shapes against the deployed index set (or a static comparison) and record that check as evidence.

**Do not** add an index until its query exists. An index that no query uses is a write-amplification cost with no benefit.

---

## 7. What N2-03 must prove with fixtures

Fixture data must satisfy §3 and cover these cases. This list is the input to N2-03; it is not implemented here.

| Fixture | Must demonstrate |
|---|---|
| Guest (no Auth) | can read the catalog and course-1 lessons; cannot read later lessons, banks, attempts, or AI sections |
| Student (active) | own profile/progress readable; direct writes denied; role mirror does not grant anything |
| Student (disabled) | read/write denied; API returns `INVALID_TOKEN` (existing N1 behavior) |
| Admin | server-side operations only; no client admin reads |
| Content `v001` | 6 courses, 12 lessons, 10-question lesson banks, 20-question final banks, valid pointer |
| Content `v002` (staging) | invisible to clients; active pointer still `v001` |
| Progress | course-01 free; course-01/course-02 completed; course-03 inProgress; course-04...course-06 locked (the rules suite also covers an unlocked later course synthetically) |
| Attempts | one active, one finalized pass, one finalized fail, one expired, one void; stable draw recorded |
| Cooldown | a student at the third failure with `cooldownUntil` in the future; a second student after expiry |
| Tombstone | deleted UID with profile/private data purged and tombstone present |
| Leak probes | no client-readable document contains a key, explanation, review, or bank question |

---

## 8. Acceptance criteria (N2-02)

| Criterion | Where satisfied | Result |
|---|---|---|
| Exact ID grammar and lifecycle | §2 | PASS (design) |
| Unique/versioned identifiers, no reuse | §2 rules, §3 V-01…V-20 | PASS (design) |
| Timestamp authority and arithmetic | §4.1 | PASS (design) |
| Ordering survives versioning | §4.2 | PASS (design) |
| Field-level ownership vs backend-only state | §5.1–§5.3 | PASS (design) |
| Index staging for N2-06 | §6 | PASS (design) |
| Fixture requirements for N2-03 | §7 | PASS (design) |
| No code, rules, indexes, or fixtures changed | §9 | PASS (verified hashes) |

---

## 9. Verification of N2-02 (documentation-only change)

Files changed by N2-02:

- **new:** `backend\docs\schema-lock.md` (this file);
- **modified:** `backend\docs\data-model.md` — D-01…D-08 marked confirmed and cross-linked; no schema change.

No source, rules, index, or test file is modified. Evidence:

- SHA-256 fingerprints of `index.ts`, `auth.ts`, `authorization.ts`, `firestore.rules`, `firestore.indexes.json`, and all six existing test files are compared before/after; expected **11/11 identical**.
- `npm run build` prints only `> tsc`.
- `npm run lint` prints only its header.
- The coordinated six-file test command prints **tests 43 / pass 43 / fail 0**.

N2-02 does not seed the emulator and does not deploy indexes. Those are N2-03 and N2-06.
