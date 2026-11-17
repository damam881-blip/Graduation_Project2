# HANDOFF.md

**Project:** Networking Fundamentals Learning Mobile Application - graduation MVP
**Handoff date:** 2026-11-18 (Revision 10)
**Revision:** 10 - Step 5 (N3): N3-06 Flutter content read (catalog + course detail + lesson reader) is complete and verified on a physical device; N3-04 is next.
**Last completed task:** N3-06 - Flutter reads the published content version end to end - VERIFIED on a physical device, including Arabic/RTL and offline reads
**Current phase:** Step 5 = **N3 Approved content and catalog** - IN PROGRESS (N3-01, N3-02, N3-03, N3-06 done; N3-04 next)

---

## 1. PROJECT & GOAL

**What it is:** Android learning app (graduation project, 2 developers) teaching networking fundamentals through **6 sequential bilingual (Arabic/English) courses**, with checkpoints, backend-authoritative timed quizzes, sequential course unlocking, a **fully local** AI tutor (no external AI provider), and an offline IPv4/VLSM subnet calculator.

**Stack:**
- Flutter + Riverpod (Android, API 26+) - Developer B
- Firebase Auth / Firestore / Functions **Emulators** -> TypeScript backend - Developer A (the user)
- Local Python/FastAPI AI service (zero-cost, CPU-only, localhost)
- Windows 10 laptop; demo over laptop-hosted LAN; no paid services

**Roadmap:** **N1-N7 is the active plan.** P0-P9 is archive only; N0 is closed.

**Progress:**
- **Step 3 = N1 Standardized API Contracts - COMPLETE** (N1-06...N1-12; N1-10 rules-level ownership closed by N2-04/N2-05, runtime ownership remains N4/N5).
- **Step 4 = N2 Data model & security rules - COMPLETE**
  - N2-01 Firestore schema - complete (docs only)
  - N2-02 IDs / invariants / ownership / index plan - complete (docs only)
  - N2-03 emulator fixtures - complete and verified
  - N2-04 least-privilege `firestore.rules` - complete and verified
  - N2-05 positive/negative/ownership-attack rule suite - complete and verified
  - N2-06 indexes/migrations - complete and verified (11 composite indexes)
  - N2-07 deletion & content-version lifecycle checks - complete and verified
- **Step 5 = N3 Approved content and catalog - IN PROGRESS**
  - N3-01 locked course catalog (6 courses, 12 bilingual lesson contracts) - complete and verified
  - N3-02 approved-content read path (D-09 direct SDK reads) - complete and verified; contract in `content-read-n3.md`
  - N3-03 Git-managed bilingual content (22-file tree + 19-test validator) - complete and verified; contract in `content-n3.md`
  - N3 addendum (not in the original N1-N7 list): `POST /profile` provisioning - complete and verified end to end; contract in `api-contract.md` 5.5. The backend creates `users/{uid}` with the Admin SDK (N2-04 keeps `allow create: false`), idempotently, and the Flutter client calls it after registration.
  - Windows reproducibility: `.gitattributes` pins LF for `backend/**`, because `content.n3` (byte checks) and `eslint-config-google` (`linebreak-style`) both reject CRLF on a default `core.autocrlf=true` clone. Verified green: content.n3 19/19, catalog 11/11, lint clean.
  - N3-06 Flutter catalog + course detail + lesson reader - complete and verified on the physical device (commits `62572fc`, `1cdcf6c`):
    - new `mobile/lib/features/content/`: D-09 read models and `ContentRepository` (pointer -> published version doc -> ordered children; `formatVersion == 1`, stale-item guard, six-course cap, fail-closed locks, `CONTENT_LOCKED`/`CONTENT_OFFLINE`/`CONTENT_UNAVAILABLE`, per-version in-memory cache)
    - catalog keeps its visual design but shows real titles and Open/Locked from `users/{uid}/courseProgress`; loading, retry and empty states added
    - course detail lists real lessons; lesson reader renders ordered text/image/video sections, checkpoint question/options (answer key stays server-side), Arabic/RTL through the existing `MyApp.changeLanguage`, and a cached offline read
    - known gaps left untouched: `login_screen.dart` is still a mock (no `FirebaseAuth` call), so the signed-in demo uses the previously registered session; the mock `LearningPathScreen` now opens the real catalog; the guest buttons in Welcome and the catalog promo card are still no-ops
  - N3-04 validated importer/publish/rollback - next
  - N3-05 AI knowledge exporter - still queued
- **Confirmed N3 queue (from the N1-N7 roadmap):** N3-01 catalog (done) -> N3-02 content read path (done) -> N3-03 Git-managed bilingual content (done) -> N3-04 validated importer/publish/rollback -> N3-05 AI knowledge exporter -> N3-06 Flutter catalog/lesson reader -> N3-07 content review and first course end-to-end.

---

## 2. WORKING ENVIRONMENT

**Paths (authoritative):**
- GitHub clone under active work: `E:\Graduation_Project2_GitHub` (branch `main`, remote `damam881-blip/Graduation_Project2`)
- Legacy local copy (do not edit): `E:\Graduation_Project2` - **no `.git` anywhere**
- Repo: `E:\Graduation_Project2_GitHub\networking-fundamentals`
  - Firebase root: `...\backend`
  - Functions package (build/lint run here): `...\backend\functions`
  - Backend tests: `...\backend\tests`; Functions tests: `...\backend\functions\tests`
  - Docs: `...\backend\docs`
  - Fixture scripts: `...\backend\functions\scripts`
  - Flutter: `...\mobile`; AI service: `...\ai_service` (+ `.venv\Scripts\python.exe`)
- Do not touch: `E:\Graduation_Project2\flutter_device_test`
- Source docs: `E:\Network Project\Keep Up` (MVP handoff MD/DOCX, Phase 1 Signoff DOCX), previous handoff MD
- Scratch/evidence (outside repo): `C:\Users\HP\AppData\Local\Temp\opencode\`

**Toolchain:** Windows 10 x64, PowerShell; Node **24.15.0**, npm **11.12.1**, Firebase CLI **15.34.2**. Historical, not re-verified: Flutter 3.47.9 / Dart 3.13.7, Python 3.12.10.

**Emulators:** project **`demo-networking-p1`** - Auth **9099**, Firestore **8080**, Functions **5001** (base `http://127.0.0.1:5001/demo-networking-p1/us-central1`). They may not survive a session restart; emulator data is lost on restart and must be reseeded.

`backend/firebase.json` binds auth/firestore/functions to `0.0.0.0` so a physical device can reach them over Wi-Fi, and `backend/.firebaserc` pins the project (an empty one starts `demo-no-project` and breaks Auth). `emulators:start --host` no longer exists in CLI 15; details and verification commands in `backend/docs/emulator-local.md`.

Three test suites use **separate** Firestore namespaces and never touch the seeded fixtures: `demo-networking-rules` (N2-05 rules), `demo-networking-indexes` (N2-06 index query shapes), and `demo-networking-lifecycle` (N2-07 publish/rollback + account purge). Each clears only its own namespace.

```powershell
Get-NetTCPConnection -LocalPort 9099,8080,5001 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort
cd E:\Graduation_Project2\networking-fundamentals\backend
firebase emulators:start --only auth,firestore,functions --project demo-networking-p1
```
Expected: `All emulators ready!` and `Loaded functions definitions from source: health, me, profile, studentAccess, adminAccess`.

---

## 3. WHAT HAS BEEN DONE SO FAR

### 3.1 Gate + N1 (previous session, condensed)

| Task | Deliverable |
|---|---|
| Gate | Tree matches RAR snapshot; 31/31 tests; disabled Admin -> 401 `INVALID_TOKEN` |
| N1-06 | `backend\functions\src\api-response.ts` - v1 envelope helpers |
| N1-07 | `backend\functions\src\api-errors.ts` - error catalog (5 codes at N1; 7 after the N3 profile addendum: `+ METHOD_NOT_SUPPORTED`, `PROFILE_UNAVAILABLE`), byte-identical messages |
| N1-08 | `backend\functions\src\index.ts` - all 4 endpoints use helpers; 17 observations byte-identical |
| N1-09 | `backend\functions\tests\api-contract.test.cjs`, `backend\tests\api-contract.http.test.mjs` - 7 + 5 tests |
| N1-11 | `backend\docs\api-contract.md`, `backend\docs\openapi.yaml` (validates: 4 paths, 5 codes) |
| N1-12 | `backend\docs\security-review-n1.md` - F-01...F-09 findings |

### 3.2 N2-01 - Firestore schema (documentation only)

- **Created:** `backend\docs\data-model.md` (~796 lines, 16 sections, 28 tables).
- Covers: Firestore-native principles, collection tree, versioned content (`contentVersions/{v}` pointer at `system/publishedContentVersion`), user collections (`courseProgress`, `lessonProgress`, `attempts`, `quizState`, `idempotency`), tombstones, `adminAudit`, atomic publish/rollback, index plan, trust matrix, ownership summary.
- section 14 records the eight confirmed decisions (D-01...D-08).
- No code, rules, or index changes.

### 3.3 N2-02 - IDs, invariants, ownership, index plan (documentation only)

- **Created:** `backend\docs\schema-lock.md` (~281 lines, 9 sections).
- 12 ID grammars, invariants **V-01...V-20**, timestamp/ordering policy, per-collection ownership predicates (**section 5** -> N2-04), staged index plan (**section 6** -> N2-06), fixture matrix (**section 7** -> N2-03).
- No code, rules, or index changes.

### 3.4 N2-03 - Emulator fixtures (verified)

- **Created:**
  - `backend\functions\scripts\fixtures.cjs` - model builder + seed + verify (~1,870 lines)
  - `backend\functions\scripts\seed-emulator.cjs`, `verify-fixtures.cjs` - runners
  - `backend\functions\tests\fixtures.test.cjs` - 19-test node:test suite
  - `backend\docs\fixtures-n2.md` - runbook (accounts, reset scope, time sensitivity)
- **Modified:** `backend\functions\package.json` (`fixtures:seed`, `fixtures:verify`, `fixtures:test`); `backend\firebase.json` (exclude `functions\scripts` from deploy packaging).
- Seeds **424 documents** + 5 Auth records (4 live, 1 deleted). Fixture-owned reset only.
- Uses the Admin SDK (bypasses rules); `firebase-admin` v14 subpath imports (`/app`, `/firestore`, `/auth`); sets `NO_GCE_CHECK=true` to silence emulator metadata warnings.

**Seeded counts:** 383 content docs (6 courses, 12 lessons, 18 quizzes, 18 banks, 288 questions, 24 AI sections, 12 private checkpoint keys), 4 profiles, 7 courseProgress, 5 lessonProgress, 12 attempts (8 finalized / 1 expired / 1 void / 2 active), 9 quizState, 1 idempotency, 1 tombstone, 2 audit events.

**Fixture accounts (emulator-only password `FixturePass123!`):**

| UID | Role | State | Purpose |
|---|---|---|---|
| `fixture-student-01` | student | active | 01-02 completed, 03 in progress, 04-06 locked |
| `fixture-student-02` | student | active | 3 failures -> active 30-min cooldown |
| `fixture-admin` | admin | active | audit actor |
| `fixture-disabled` | student | disabled | disabled account |
| `fixture-deleted` | - | deleted | tombstone only |
| guest | - | no account | unauthenticated |

**Commands run and results:**

```
cd ...\backend\functions
npm run fixtures:seed     -> totalDocuments 424
npm run fixtures:verify   -> checks 17, pass 17, fail 0
npm run fixtures:test     -> tests 19, pass 19, fail 0
npm run build             -> tsc clean
npm run lint              -> eslint clean
cd .. && node --test <six files>  -> tests 43, pass 43, fail 0
```

### 3.5 N2-04 - Least-privilege Firestore rules (verified)

- **Modified:** `backend\firestore.rules` - 9-line deny-all -> **140 lines / 17 match blocks**.
- **Created:** `backend\docs\rules-n2.md` - policy map, design notes, evidence, limitations.
- **Policy implemented:**
  - `system/publishedContentVersion`: public read, no write.
  - `contentVersions/{v}` and course metadata: read only when `v` is the active pointer (staging/archived hidden).
  - Lessons/quizzes: `course-01` free, later courses require own `courseProgress` with `status != "locked"`; missing progress denies.
  - `private/**` (checkpoint keys), `quizBanks/**`, `aiSections/**`: server-only.
  - `users/{uid}`: own read; update only `displayName` / `preferredLanguage`, only while `status == "active"`; role/status/email/uid/timestamps immutable.
  - `courseProgress` / `lessonProgress`: own read only.
  - `attempts`, `quizState`, `idempotency`, `accountTombstones`, `adminAudit`: server-only.
  - Default deny for everything else. Functions use the Admin SDK and bypass rules.
- **Evidence:** temporary 50-assertion probe (deleted) -> **50/50**; fixtures 19/19; legacy 43/43; verify 17/17. Only `firestore.rules` differs from the N2-03 baseline (10/11 protected files unchanged).
- **Confirmed behavior:** quiz **lists** must filter by `courseId` (`where("courseId","==",...)`); unconstrained quiz lists cannot evaluate `resource.data.courseId` and fail closed. Index I-01 covers the query shape.

### 3.6 N2-05 - Durable rules suite (verified)

- **Created:** `backend\tests\firestore.rules.n2.test.mjs` - 954 lines, **91 tests**.
- **Updated:** `backend\docs\rules-n2.md` - suite evidence + list-query limitation.
- Runs in `demo-networking-rules` and calls `clearFirestore()` there, so fixtures are untouched.
- Covers: guest active-content surface; staging/archived denial; locked courses; checkpoint keys, banks, questions, AI sections; guest writes; owner profile read/update; role/status/email/uid/timestamp/field/length/language escalation; cross-user profile and progress; attempts/quizState/idempotency; disabled owner; admin client denials; content read-only; collection-group and default-deny attacks.
- **Isolation evidence:** `fixtures:verify` 17/17 -> rules suite 91/91 -> `fixtures:verify` 17/17.
- No rules, source, or existing-test changes.

### 3.7 N2-06 - Indexes and migration policy (verified)

- **Modified:** `backend\firestore.indexes.json` - empty scaffold -> **11 composite indexes** (I-01...I-11) in staged order: content (I-01, I-02, I-08) -> progress (I-06) -> attempts/quiz (I-03, I-04, I-05) -> admin/audit (I-07, I-09, I-10, I-11). Strict JSON, empty `fieldOverrides`.
- **Created:** `backend\tests\indexes.n2.test.mjs` - 554 lines, **20 tests**; `backend\docs\indexes-n2.md` - index->query map, TTL policy, migration policy, risks.
- **I-12** (`quizState.cooldownUntil`) is single-field: the automatic index covers it, so no composite entry is added; the suite asserts its absence and exercises the cooldown sweep.
- **I-01 clarification:** the list query is lesson quizzes only (`type == "lesson"`); the final quiz is a direct read via `courses/{c}.finalQuizId`, which is why `type` is an equality field.
- **Verification model:** the emulator does not enforce composite indexes, so the suite has two layers - (a) static: the file must match the canonical plan exactly, in order, with no extras/duplicates; (b) live: every documented query runs against seeded data in `demo-networking-indexes` and asserts the exact ordered result set.
- **Mutation check:** flipping `deletedAt` to DESCENDING made the suite fail (exit 1, exact diff); the file was restored byte-for-byte and returned to 20/20.
- **Evidence:** index suite 20/20; combined 8-file **154/154** at the N2-06 gate (177/177 after N2-07); fixtures 17/17 before and after the suite; build/lint clean.
- **Not done by design:** no deploy (no live project); TTL is documented only; no schema migration script is needed (Firestore is schemaless; versioned content is the migration path).

### 3.8 N2-07 - Deletion and content-version lifecycle (verified)

- **Created:** `backend\tests\lifecycle.n2.test.mjs` - **23 tests**; `backend\docs\lifecycle-n2.md` - sequences, scope limits, evidence, risks.
- **No production file changed:** rules, Functions source, indexes, and existing tests are untouched.
- **Account sequence verified in order:** tombstone (`status = "deleted"`) -> profile `status = "deleted"` -> Auth deletion -> five private subcollections purged -> profile removed -> tombstone `status = "purged"` and retained. Intermediate states are asserted, so the order cannot silently change.
- **Deletion evidence:** A real Auth emulator user is created and deleted; sign-in fails afterwards. The owner can read its own deleted profile but cannot update it. Guests, students, and an `admin`-claim client cannot read, list, create, update, or delete tombstones. Clients cannot recreate the profile or progress for the purged UID. A live account is untouched.
- **Content sequence verified:** staging, archived, and rolledBack versions are invisible to clients; active content is readable. Publish flips pointer + version statuses in one transaction; a failed transaction leaves the pointer unchanged; rollback restores the previous version and hides the bad one while the Admin path can still read it for pinned attempts.
- **Retention:** executable reference policy (active + two most recent historical versions + versions pinned by active attempts; staging is purgeable). Pins are derived from a real collection-group query over active attempts.
- **Mutation check:** widening the version read rule to `if true` produced 3 failures (staging, archived/rolledBack, post-publish visibility); rules were restored by hash and the suite returned to 23/23.
- **Evidence:** lifecycle suite 23/23; combined 9-file **177/177**; fixtures 17/17 before and after; build/lint clean.
- **Deferred, not claimed:** V-20 tombstone guard inside mutation transactions (no mutation endpoints yet, N4/N5), automated retention/purge job, TTL, deployment.

### 3.9 N3-01 - Locked course catalog (verified)

- **Created:** `backend\functions\scripts\catalog.cjs` - single source for 6 course IDs/order/titles/descriptions and 12 lesson contracts (title + summary, EN/AR).
- **Created:** `backend\functions\tests\catalog.test.cjs` - **11 tests** (IDs/order, FR-05 endpoints, bilingual fields, >=12 lessons, no quiz data, UTF-8 no BOM).
- **Created:** `backend\docs\catalog-n3.md` - before/after, course and lesson tables, contract rules, acceptance criteria.
- **Modified:** `backend\functions\scripts\fixtures.cjs` - imports the catalog (inline arrays removed); course descriptions and `estimatedMinutes` now come from it.
- **Modified:** `backend\functions\package.json` - adds `catalog:test`.
- **Decisions recorded:** D-09 content reads use the direct Firestore SDK (no Functions read endpoints in N3); D-10 catalog IDs/order/names locked.
- **Names:** `course-01` "Networking Fundamentals" ... `course-06` "Network Security Basics" (FR-05 endpoints). Arabic names live in the catalog and `catalog-n3.md`.
- **Unchanged:** 6 courses / 12 lessons / 424 documents; rules, indexes, Functions source, existing tests.
- **Evidence:** catalog 11/11; fixtures 19/19; seed 424; verify 17/17; full regression 177/177; build/lint clean.
- **Not content-complete:** lesson bodies and media remain fixtures until N3-03/N3-07.

### 3.10 N3-02 - Approved-content read path (verified)

- **Created:** `backend\tests\content-read.n3.test.mjs` - **34 tests** in `demo-networking-contentread`, using the real `firestore.rules`.
- **Created:** `backend\docs\content-read-n3.md` - read sequence, query/index map, versioned result contract, guest/locked matrix, error handling, acceptance criteria.
- **Modified:** `backend\docs\api-contract.md` section 8 - links the exact read contract and clarifies path-scoped lesson lists.
- **Design (D-09):** direct Firestore SDK reads; no Functions `getCourses`/`getLessons` endpoints. The roadmap's "confirmed alternative" is recorded explicitly.
- **Proven:** pointer/version resolution; six-course catalog; course-01 lessons/quizzes; final quiz via `finalQuizId`; guest and no-progress denial for course-02; unlocked course-02 success; locked course-03 denial; banks/AI/private/write denial; unconstrained quiz lists and collection-group lesson queries fail closed; missing pointer denies all content; non-active version paths denied.
- **Nuance recorded:** lesson lists are path-scoped (no `courseId` filter needed); quiz lists are top-level and **must** filter by `courseId`.
- **Unchanged:** schema, `firestore.rules`, `firestore.indexes.json`, Functions source, existing tests.
- **Evidence:** content-read 34/34; fixtures 17/17 before and after; full regression **211/211**; build/lint clean.

### 3.11 N3-03 - Git-managed bilingual content (verified)

- **Created:** `backend\content\` - **22 files**: `manifest.json`, `catalog.json`, 6 course files, 12 lesson files, 2 SVGs, `README.md`.
- **Created:** `backend\tests\content.n3.test.mjs` - **19 tests** (no emulator): manifest/version, no orphans, UTF-8/no-BOM/LF, course/lesson schema, section IDs/types/order, text and one-media rule, image existence and SVG shape, video ID/fallback, public-only checkpoint, protected-token scan, catalog agreement, ID uniqueness/grammar, bilingual completeness, size caps, `catalog.cjs` loader.
- **Created:** `backend\docs\content-n3.md` - before/after, tiers, schema, media policy, source-to-Firestore mapping, versioning, evidence, acceptance, risks.
- **Created:** `backend\content\README.md` - layout, content tiers, authoring rules, mapping, validation, versioning.
- **Modified:** `backend\functions\scripts\catalog.cjs` - now loads `../../content/catalog.json` and maps `{en,ar}` to `[en,ar]`; remains the single catalog source used by fixtures and `catalog:test`.
- **Content:** `v003`, `formatVersion: 1`, EN/AR on every user-visible string; 12 authored lessons (3 sections each), 1 image lesson + 1 video lesson (placeholder ID exercises FR-08 fallback); checkpoint question/options only, never an answer.
- **Protected-data boundary:** the validator scans every JSON file for `correctOptionId(s)`, `explanation`, `quizBank`, `checkpointKey`, `answerKey`, `review`, and a `"questions"` array; any match fails. Banks/keys are imported server-only by N3-04.
- **Unchanged:** schema, `firestore.rules`, `firestore.indexes.json`, Functions TS source, existing tests; fixture counts remain 6/12/424.
- **Evidence:** content 19/19; catalog 11/11; fixtures 19/19 and 17/17; seed 424; full regression **230/230**; build/lint clean.

### 3.12 Documentation set

`backend\docs\{data-model.md, schema-lock.md, catalog-n3.md, content-read-n3.md, content-n3.md, fixtures-n2.md, rules-n2.md, indexes-n2.md, lifecycle-n2.md, api-contract.md, openapi.yaml, security-review-n1.md}` - links and Markdown tables validated.

---

## 4. KEY DECISIONS & RULES

**Source of truth**
1. Current source/tests > Phase 1 Signoff > handoff narrative.
2. Never mark a task complete without build + lint + tests + acceptance evidence.
3. N1-N7 is the execution order; P0-P9 is archive.
4. Unresolved scope conflict: Phase 1 Signoff lists Google Sign-In, Admin Web Panel, local notifications, encrypted 7-day SQLite chat, Crashlytics; the superseding Final Implementation Specification was never uploaded. Do not silently choose; does not affect N1/N2.

**Contract decisions**
5. v1 envelope has **no `schemaVersion` / correlation ID**; adding either is breaking.
6. Error catalog holds only the 5 emitted codes.
7. `403` = role mismatch/disabled/user-not-found; `401` = token failure; `503` = Auth lookup failure.
8. Roles are strict, not hierarchical.
9. Client branches on `error.code`, never message text.

**N2 schema decisions (D-01...D-08, normative in `data-model.md` section 14)**
- D-01 `attempts`, `quizState`, `idempotency` are **server-only**; Flutter uses API only.
- D-02 unlock check reads `get(courseProgress)`; no `entitlements` collection.
- D-03 checkpoint explanation released only after a correct submission.
- D-04 attempts retained for MVP; last 3 content versions retained.
- D-05 `users.role` is a mirror only; **Auth custom claims are authoritative**.
- D-06 `adminAudit` is server-only and append-only.
- D-07 lesson complete = `checkpointPassed && lessonQuizPassed`.
- D-08 cooldown is per quiz.

**N3 content decisions (D-09...D-10, normative in `data-model.md` section 14)**
- D-09 approved content is read by the Flutter client through the **Firebase client SDK** under the N2-04 rules; N3 adds no Functions read endpoints.
- D-10 catalog IDs, order, and EN/AR names are locked in `scripts\catalog.cjs`; see `catalog-n3.md`.

**Content read conventions (N3-01/D-09)**
- Do not add course/lesson/quiz Functions read endpoints unless a new decision supersedes D-09.
- Guests see all course metadata and `course-01` lessons/quizzes; later courses require own `courseProgress.status != "locked"`.
- Quiz lists must filter by `courseId`; unconstrained lists fail closed by design. Lesson lists are path-scoped, so no filter is needed; collection-group lesson queries fail closed.
- `scripts\catalog.cjs` is the only catalog source; it loads `backend\content\catalog.json`. `catalog:test` must pass after any title or lesson change.
- Run `content-read.n3.test.mjs` after any rules or read-sequence change; it uses `demo-networking-contentread`, never the fixture namespace.
- Run `content.n3.test.mjs` after any content edit; it validates bytes, IDs, references, bilingual pairs, media, and the protected-token boundary without an emulator.
- Public content lives only in `backend\content`; quiz banks, answer keys, explanations, and checkpoint keys must never be added there. Add them through the server-only N3-04 path instead.

**Rules conventions (N2-04/N2-05)**
- Rules never use `users.role` as a grant; they identify the caller by token UID.
- Only owner-writable profile fields: `displayName`, `preferredLanguage`, while active.
- Quiz lists require a `courseId` filter; do not "fix" the fail-closed behavior by widening rules.
- A collector-level `get()` costs one read per evaluated document; acceptable at MVP scale.
- Do not weaken the Functions (Admin SDK) path.

**Index conventions (N2-06)**
- Every composite entry must map to a documented query shape and be exercised by `backend\tests\indexes.n2.test.mjs`; no speculative indexes.
- Equality fields first, then the `orderBy` field; directions must match the query exactly.
- `quizState.cooldownUntil` is single-field -> rely on the automatic index; do not add a composite duplicate.
- `I-01` requires the `type == "lesson"` equality; a query that orders only by `order` needs `(courseId, order)` instead.
- TTL policies and deployments are out of `firestore.indexes.json`; do not claim them as done.
- Run index tests in `demo-networking-indexes`; never seed/clear a fixture namespace from them.

**Lifecycle conventions (N2-07)**
- Deletion order is fixed: tombstone -> profile `status = "deleted"` -> Auth -> private subcollections -> profile document -> tombstone `status = "purged"`. The tombstone is never deleted.
- The tombstone is server-only; no client read or write. A purged UID must not be resurrected.
- Publish/rollback are single transactions that flip the pointer and the two version statuses; content documents are never rewritten.
- Retention: active + two most recent historical versions + any version pinned by an active attempt; staging imports are purgeable.
- V-20 (tombstone guard) must be added to the first user-data mutation transaction in N4/N5; do not claim it is enforced.
- Run lifecycle tests in `demo-networking-lifecycle`; they may create/delete their own Auth user but must not touch fixture accounts.

**Must not change unless a task explicitly requires it (11 files)**
`backend\functions\src\index.ts`, `auth.ts`, `authorization.ts`, `backend\firestore.rules`, `backend\firestore.indexes.json`, `backend\functions\tests\api-contract.test.cjs`, `backend\tests\api-contract.http.test.mjs`, `auth.http.test.mjs`, `health.http.test.mjs`, `firestore.rules.test.mjs`, `backend\functions\tests\authorization.http.test.cjs`.
**History:** N2-04 changed `firestore.rules`; N2-05, N2-06, and N2-07 added new test files without editing existing tests; N2-06 changed `firestore.indexes.json`. Rules, Functions source, and existing tests remain untouched by N2-07. N3-01 changed only `scripts\fixtures.cjs` (catalog import) and added `scripts\catalog.cjs`, `tests\catalog.test.cjs`, and the `catalog:test` script. N3-02 added `tests\content-read.n3.test.mjs` and docs only. N3-03 added `backend\content\**`, `tests\content.n3.test.mjs`, `docs\content-n3.md`, and rewrote `scripts\catalog.cjs` as a loader over `content\catalog.json`; no protected file changed.

**Engineering rules**
- One logical task at a time; no skipping, no duplicate work.
- Tests run against compiled `lib/` -> **always `npm run build` before tests**.
- Do not run `npm audit fix --force`.
- Don't touch `mobile\`, `ai_service\`, or `flutter_device_test` unless required.
- Style: 2-space indent, double quotes, JSDoc, LF, ESLint `google`; `.cjs` tests are lint-ignored.
- Fixtures are snapshots: active attempt expires seed+5 min, cooldown seed+20 min -> reseed before verifying (`fixtures:test` reseeds).
- Never seed/clear `demo-networking-p1` from the rules suite (owns `demo-networking-rules`), the index suite (owns `demo-networking-indexes`), or the lifecycle suite (owns `demo-networking-lifecycle`).
- N1-10 rules-level ownership is **closed** by N2-04/N2-05; runtime per-endpoint ownership and revoked/deleted-identity handling remain N4/N5.

---

## 5. CURRENT STATE

**VERIFIED**
- Build + lint clean in `backend\functions`.
- **43/43** legacy regression tests (16 authorization + 6 auth + 5 health + 4 rules smoke + 7 API unit + 5 API HTTP).
- **91/91** N2-05 rules tests; **20/20** N2-06 index tests; **23/23** N2-07 lifecycle tests; **34/34** N3-02 content-read tests; **19/19** N3-03 content tests; **230/230** combined 11-file command.
- **17/17** fixture verification checks; **19/19** fixture tests; 424-document fixture set reproducible.
- Least-privilege rules compile and enforce the matrix; only `firestore.rules` differs from the N2-03 baseline.
- `firestore.indexes.json` holds 11 composite indexes matching the canonical plan; the static contract and live query shapes both pass.
- `data-model.md`, `schema-lock.md`, `fixtures-n2.md`, `rules-n2.md`, `indexes-n2.md`, `lifecycle-n2.md`, `catalog-n3.md`, `content-read-n3.md`, `content-n3.md` written and cross-linked.
- Publish/rollback, staging invisibility, purge order, tombstone retention, and client resurrection denial are verified.
- Rules, index, and lifecycle suite isolation proven (17/17 before and after each).

**PENDING / NOT DONE**
- **Step 5 (N3) is in progress.** N3-01, N3-02, and N3-03 are complete; N3-04 (validated importer/publish/rollback) is next; N3-05...N3-07 remain.
- Lesson bodies and media now exist in Git (`backend\content`, `v003`) but are **not yet imported**; fixtures still seed placeholder sections until N3-04.
- Flutter, AI service, physical device, LAN demo - untouched this phase.
- Rules and indexes are not deployed; deployment is out of MVP scope.

**OPEN ISSUES (accepted/documented)**
- **V-20 tombstone guard is not implemented** because there are no user-data mutation endpoints yet. Add it inside the first mutation transaction in N4/N5 and extend the lifecycle suite.
- **Retention/purge is manual.** The 3-version policy is verified as an algorithm but no job runs it.
- Token revocation/disabled state not enforced until token expiry (F-01, Medium). Reads remain possible for an unexpired token; writes are backend-only. The lifecycle suite confirms a purged profile is gone and writes are denied.
- 7 production advisories, 0 high/critical (F-04).
- No rate limiting (F-05).
- 503 branch still untested (F-03).
- Leftover `backend\index.backup.ts`; empty `.firebaserc`; emulators loopback-only.
- `displayName` minimum length is not enforced by rules (cap only); backend should trim/enforce 1-80.
- Unconstrained quiz lists fail closed; clients must filter by `courseId`.
- Firestore emulator does not enforce composite indexes; index existence rests on the static plan match. The file has not been deployed or accepted by a live project (out of MVP scope).
- TTL policies (idempotency `expiresAt`, 24 h) are documented in `indexes-n2.md` but not enabled; they require a deployed project.
- The course/quiz screens that will issue the indexed queries are not built; if a screen uses a different query shape, revise the index in the same change.
- No git -> no diff history; evidence lives in temp folder + docs.
- `firebase.json` script exclusion was not deploy-tested (deploy out of scope).

---

## 6. NEXT STEPS (in order)

**Step 0 - resume gate (do first).** Start emulators, build, lint, seed fixtures, then run the full 230-test command.

```powershell
Get-NetTCPConnection -LocalPort 9099,8080,5001 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort
cd E:\Graduation_Project2\networking-fundamentals\backend\functions
npm run build
npm run lint
npm run fixtures:test
npm run catalog:test
npm run fixtures:seed
npm run content:test
cd ..
node --test .\tests\api-contract.http.test.mjs .\tests\auth.http.test.mjs .\tests\health.http.test.mjs .\tests\firestore.rules.test.mjs .\tests\firestore.rules.n2.test.mjs .\tests\indexes.n2.test.mjs .\tests\lifecycle.n2.test.mjs .\tests\content-read.n3.test.mjs .\tests\content.n3.test.mjs .\functions\tests\api-contract.test.cjs .\functions\tests\authorization.http.test.cjs
```
Expected: build/lint clean, fixtures 19/19, catalog 11/11, content 19/19, **tests 230 / pass 230 / fail 0**. If HTTP tests fail, the emulators are not running.

**Step 1 - Step 5 (N3): continue with N3-04.**
- Step 4 (N2) is complete; no N2 task remains. N3-01, N3-02, and N3-03 are complete.
- Confirmed N3 queue: N3-01 catalog (done) -> N3-02 content read path (done) -> N3-03 Git-managed bilingual content (done) -> N3-04 importer/publish/rollback -> N3-05 AI exporter -> N3-06 Flutter reader -> N3-07 content review.
- N3-04 must validate `backend\content` before writing, upload the SVGs, map `asset` to `imageUrl` and `videoId` to `videoUrl`, write banks/checkpoint keys server-only, and keep publish/rollback transactional.
- Do not reopen N2 items. V-20 (N4/N5), retention/purge automation, TTL, and deployment are still out of N3.

**Verification after every step:**
```powershell
cd E:\Graduation_Project2\networking-fundamentals\backend\functions
npm run build; npm run lint; npm run fixtures:test; npm run catalog:test; npm run content:test
cd ..
node --test .\tests\api-contract.http.test.mjs .\tests\auth.http.test.mjs .\tests\health.http.test.mjs .\tests\firestore.rules.test.mjs .\tests\firestore.rules.n2.test.mjs .\tests\indexes.n2.test.mjs .\tests\lifecycle.n2.test.mjs .\tests\content-read.n3.test.mjs .\tests\content.n3.test.mjs .\functions\tests\api-contract.test.cjs .\functions\tests\authorization.http.test.cjs
```
Expected: build/lint clean, 19/19 fixtures, 11/11 catalog, 19/19 content, **230/230** regression (grows as later steps add tests).

---

## 7. HOW TO WORK WITH ME

- **One task at a time**, smallest appropriate change.
- Per task: what it is, why, exact files; **before/after**; implement; run build + lint + relevant tests; paste **real output**; check acceptance criteria; then give exact copy-paste PowerShell.
- Keep absolute paths (`E:\Graduation_Project2\...`); I inspect files myself.
- Plain, concrete language; explicit **VERIFIED / UNVERIFIED / NOT DONE / BLOCKED**; no premature "done".
- Don't repeat project info already given; ask only when evidence can't resolve something.
- Keep the status format: Task, Status, Implementation, Files changed, Commands, Build, Lint, Tests, Acceptance criteria, Remaining risks.

---

## Ready-to-paste opening message for the new session

> This is the handoff from my previous session. Read `E:\Graduation_Project2\HANDOFF.md` carefully, confirm your understanding in a few lines, then continue from "Next Steps".
>
> Key context: the project lives at `E:\Graduation_Project2\networking-fundamentals` (Windows/PowerShell, no git). Step 3 (N1-06...N1-12 Standardized API Contracts) is complete. **Step 4 (N2 Data model & security rules) is complete**: N2-01 `backend\docs\data-model.md`; N2-02 `backend\docs\schema-lock.md`; N2-03 424-doc fixtures (17/17 verify, 19/19 tests); N2-04 least-privilege `backend\firestore.rules`; N2-05 91-test rules suite (`backend\tests\firestore.rules.n2.test.mjs`); N2-06 11 composite indexes (`backend\firestore.indexes.json`) with a 20-test contract/query suite (`backend\tests\indexes.n2.test.mjs`); N2-07 23-test lifecycle suite (`backend\tests\lifecycle.n2.test.mjs`) plus `backend\docs\lifecycle-n2.md`. Combined regression was **177/177** at the N2-07 gate. **Step 5 (N3) is in progress:** N3-01 locked the 6-course bilingual catalog (`backend\functions\scripts\catalog.cjs`, `backend\docs\catalog-n3.md`, 11 tests). N3-02 verified the approved-content read path (`backend\docs\content-read-n3.md`, `backend\tests\content-read.n3.test.mjs`, 34 tests): D-09 direct Firestore SDK reads, no Functions read endpoints; D-10 catalog IDs/order/names locked. N3-03 added the Git content tree `backend\content` (`v003`, 6 courses, 12 bilingual lessons, 2 SVGs) with `backend\tests\content.n3.test.mjs` (19 tests) and `backend\docs\content-n3.md`; public content excludes answer keys and bank data. Do not widen the rules or add speculative indexes.
>
> Your first action must be Step 0 of "Next Steps": start the emulators if needed (Auth 9099 / Firestore 8080 / Functions 5001, project `demo-networking-p1`), build, lint, run `fixtures:test`, `catalog:test`, and `content:test`, reseed, then run the 11-file 230-test command.
>
> Then continue **Step 5 (N3)** with N3-04 (validated importer, asset upload, publish/rollback). Confirmed queue: N3-04 -> N3-05 AI exporter -> N3-06 Flutter reader -> N3-07 content review. Do not reopen N2. V-20 (N4/N5), retention/purge automation, TTL, and deployment remain out of N3. Work one task at a time, show before/after, run build/lint/tests and paste real output, then give me exact PowerShell to reproduce. Never mark anything complete without evidence.
