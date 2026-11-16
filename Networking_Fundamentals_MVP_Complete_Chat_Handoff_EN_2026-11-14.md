# Complete Project Handoff and Continuity Guide — Networking Fundamentals Learning Mobile Application

**Complete New-Chat Handoff • Implementation & Requirements & Tests & Roadmap**  
**Document prepared:** November 14, 2026  
**Most recent implementation evidence supplied by the user:** PowerShell runs on November 4, 2026 (plus the conversation steps through this handoff)  
**Scope:** Only the Networking Fundamentals mobile learning application. Do not confuse it with the Unity Network Simulator or Skillory 2.  
**Overall status:** The local development foundations and Authentication/RBAC have been implemented and tested; most end-user application features have not yet been implemented.

> **Important rule:** This is a handoff and continuation reference, not a replacement for source files or the original approved documents. Verified log evidence is distinguished from requirements and proposals. Never claim a feature is complete without implementation and test evidence.

## 0) Ready-to-copy opening message for the new chat

"I am building the graduation project **Networking Fundamentals Learning Mobile Application**. Treat the attached document as the **primary project-continuity reference**. Read it fully, especially the exact stopping point, implementation evidence, current N1–N7 plan, differences from the historical P0–P9 plan, PowerShell commands, and risk register. The project has two developers, runs on Windows as a zero-cost local demo, and uses **entirely local AI with no external AI provider**. Do not repeat already settled questions or confuse design with implementation. Continue at the **current task: create `backend/functions/src/api-response.ts`, then run Build/Lint**, unless I provide more recent evidence. I prefer practical, step-by-step instructions and complete copy-paste-ready code when needed, with test evidence recorded before any task is closed. Integrate components contract-first; the second developer works on Flutter in parallel."

## 1) Executive snapshot: exactly where work stopped

- **Most recent confirmed success:** The old regression tests were rerun from `backend`: `auth.http.test.mjs` **6/6**, `health.http.test.mjs` **5/5**, and `firestore.rules.test.mjs` **4/4**. Immediately before that, `functions/tests/authorization.http.test.cjs` passed **16/16**. The combined latest result is **31/31 across four separate test runs**, not one unified test command.
- **Functions confirmed through Build/Lint:** `health`, `me`, `studentAccess`, `adminAccess`. Shared helpers: `src/auth.ts` and `src/authorization.ts`.
- **Current RBAC:** Verifies the Firebase ID Token, retrieves the user's current Firebase Auth record through `getUser(uid)`, checks that the live role matches both the role in the token and the required role, and rejects disabled users. Tests passed for removed Admin claims with stale tokens, Student promotion, disabled Admin accounts, and role spoofing.
- **Next requested step, with no user-provided completion evidence yet:** Create `backend/functions/src/api-response.ts` containing `successResponse<T>` and `errorResponse`; run `npm run build` and `npm run lint`. **Treat the file as not verified to exist until the user checks it.**
- After that: create `api-errors.ts` and the Error Codes/HTTP mapping; refactor all four endpoints to use the helpers without changing existing HTTP/JSON contracts; add tests; rerun the 31 regressions; then implement the Data Model and Firestore Rules.
- **Do not claim the application is complete:** Flutter is currently a scaffold; Firestore rules are temporarily Deny-All; the current AI service only has a skeleton/health check; there are no verified integrated curriculum, quiz, or progress APIs yet.

### Dashboard: Current Workstream State

| Workstream | Precise status | Evidence / exit gate |
|---|---|---|
| Project scope, architecture, decisions | [x] Documented and approved baseline; not all code has been built | Phase 1 documents + Final Implementation Specification |
| Local Windows/Android toolchain | [x] Verified | `flutter doctor`, SDK/ADB, documented versions |
| Flutter Android workspace | [x] Scaffold and tests only; [ ] functional application | `pub get`, `flutter analyze` OK, one widget test; final Android demo unverified |
| Firebase emulator workspace | [x] Running and verified | Auth 9099, Firestore 8080, Functions 5001 |
| HTTP Health API | [x] Implemented and tested | 5/5 |
| Firebase Auth ID Token verification | [x] Implemented and tested | 6/6 |
| Student/Admin Authorization | [x] Core implemented and tested | 16/16, including current-role lookup |
| Final Firestore rules | [ ] Not implemented | Currently Deny-All; four denial-only tests passed |
| Standard API response helpers | [ ] Not yet verified — **first task** | Create `api-response.ts` + Build/Lint |
| Standard error catalog & OpenAPI | [ ] Not implemented | N1 |
| Domain DB models & per-user ownership | [ ] Not implemented | N2 |
| Six-course content + import/publish | [ ] Not functionally implemented | N3 |
| Timed quiz / progress / unlock APIs | [ ] Not functionally implemented | N4 |
| Local AI model / RAG / Flutter tutor integration | [ ] Not implemented; service skeleton only | N5 |
| Flutter auth/course/quiz/AI/calculator UI | [ ] Not verified in the main MVP | N6 / parallel |
| Phone-to-LAN end-to-end demo & APK | [ ] Not verified | N7 |
| Dependencies audit | [!] Six Moderate vulnerabilities remain open in Functions runtime dependencies | Document and remediate safely before defense |

## 2) Project identity, objectives, and binding constraints

**Name:** Networking Fundamentals Learning Mobile Application for Beginners.  
**Purpose:** An Android application teaching networking fundamentals from scratch through **six sequential courses**, bilingual Arabic/English content, lesson checkpoints, official quizzes, progress tracking and sequential course unlocking, a content-aware AI Networking Tutor, and an offline IPv4/VLSM Subnet Calculator.  
**Development team:** Exactly two developers; no fictional separate departments and no Jira. Work is assigned directly and tracked jointly.  
**Current implementation owner (Developer A / the user):** Backend, Firebase Functions, Auth, data security, AI FastAPI, integration, technical documentation, and tests.  
**Developer B:** Flutter Android/UI, content, localization, user experience, and the calculator; assignments remain flexible and undergo joint review.  
**Deployment:** Graduation demonstration only, not a publicly hosted internet service; **zero mandatory cost**.  
**Chosen architecture:** Flutter + Riverpod → Firebase Auth/Firestore/Functions **Emulators** + trusted TypeScript backend → local Python/FastAPI AI service.  
**Non-negotiable constraint:** No OpenAI/Gemini/Claude/hosted inference or any other external AI API. Inference and retrieval must be local/self-hosted.  
**Development laptop:** Windows 10 64-bit Dell Latitude 5580, Intel i7-7600U, CPU-only with no discrete GPU. Prefer lightweight models and evaluation on the same machine.  
**Development phone:** Samsung Galaxy A17 (SM-A175F), Android 16/API 36, previously connected successfully through ADB/Flutter, but disconnected during the last toolchain verification.  
**Previously targeted defense window:** Mid-December; an official exact defense date was not documented in this conversation.

### Approved MVP scope in the Final Implementation Specification

- **Email + Password** registration, sign-in and sign-out through local Firebase Auth, restricted guest browsing, and a secure online account-deletion process.
- **Six sequential courses**, with **at least two complete bilingual instructional lessons per course**, or **at least 12 lessons total**, including examples and illustrations, optional media, and fallback behavior.
- One comprehension checkpoint around the midpoint of each lesson: a correct response is required to enable Start Quiz. Incorrect checkpoint answers have unlimited retries and do not consume formal quiz attempts.
- Lesson quiz: **10 questions in 15 minutes**; course final: **20 questions in 30 minutes**; MCQ and True/False; random, unique questions with a stable draw per attempt; a private question bank; **70% passing score** (7/10 and 14/20).
- Three unsuccessful formal attempts followed by a **30-minute cooldown**, after which attempts are replenished. Timers, grading, persistence, eligibility, and unlocking are **backend-authoritative**. No official offline quizzes.
- Progress, lesson completion, and course unlocking require backend approval. The first course is unlocked by default; each subsequent course unlocks only after passing the preceding **Course Final**.
- General and course-contextual AI Tutor chat with Arabic/English responses and networking terminology, grounded in approved content and `contentVersion`. It must not access protected quiz answer keys; it is **blocked for guests and during active quizzes**, enforced on the server and by hiding late replies in Flutter.
- **Chat history in the current simplified MVP is transient and session-only**: no cloud sync and no durable encrypted history. The latter is a requirement from an older plan, not the latest Final Implementation Specification.
- Offline IPv4 / CIDR / Binary / Network-Broadcast / Host Range / Usable Hosts / `/31` and `/32` edge cases / multi-network VLSM calculation, implemented **entirely in local Dart** without internet access.
- Reviewed bilingual Git-managed content with Import/Validate/Stage/Publish/Rollback using a **developer-operated JSON/CSV script**; answer keys remain private.
- Approved lesson text and images cached for offline reading; no official operation is considered successful until the backend acknowledges it.
- Arabic/English localization with RTL, loading/error/offline states, and an APK running on a real phone over the same Wi-Fi network as the laptop-hosted services.

### Critical differences: historical baseline versus current simplified MVP — do not mix scopes

| Topic | Older Phase 1 / Master Roadmap | Current Final Implementation Specification |
|---|---|---|
| Authentication | Included Google Sign-In, account linking, and password reset | Current operational baseline specifies Email/Password; Google Sign-In is not mandatory for the reduced MVP |
| Content admin | Full Admin Web Panel with Bulk Import | **Developer-operated validation/import/publish script**; the historical Admin Panel is not automatically required now |
| Chat storage | Encrypted per-course SQLite history with seven-day retention | **Session-only transient chat**; no cloud or persistent history |
| Offline progress | Synchronization queues and offline eligible progress | Offline reading only; official progress/quiz/unlock actions require online backend acknowledgment |
| Notifications | Local study reminders and cooldown alerts | Not listed as an implementation requirement in the current Final Implementation Specification |
| Crash monitoring | Firebase Crashlytics in the older specification | Not an established completion gate in the current reduced MVP |
| Model provider | Earlier local-first proposals included evaluation of free providers | The user definitively requires **no external AI whatsoever**; local/self-hosted models only |

**Conflict-resolution rule:** Use `Networking_Fundamentals_Final_Implementation_Specification.docx` and AC-01..16 as the operational baseline for the reduced MVP. Retain Phase 1 and Master Roadmap as historical traceability references; do not expand scope without an explicit request. Not every historical requirement has necessarily been rescinded: identify and document any actual discrepancy rather than hiding it.

## 3) Detailed requirements: Contract and Acceptance Checklist

### Non-negotiable quiz invariants

1. A quiz starts when the backend accepts the start request. The 15- or 30-minute timer is based on server time; losing network connectivity does not pause it.
2. Each attempt records `attemptId`, UID, quizId, stable question IDs, `startedAt`, `deadlineAt`, acknowledged answers, state/grade/`finalizedAt`, and idempotency keys. Never expose correct answers before finalization.
3. Only answers **saved and acknowledged by the backend** count. Invalid, late, or unacknowledged answers do not count. On timeout, the backend grades acknowledged answers; the student may still pass if they reach 70%.
4. `startQuiz` must be idempotent, with at most one active attempt within the designed scope. Save/finish/retry must not charge attempts twice or duplicate grading; concurrency tests are mandatory.
5. Guests cannot take quizzes or use AI. User/role/resource ownership comes from a verified token, not the request body, query, or untrusted headers.
6. Content versions are fixed within a quiz attempt and AI retrieval. Answers and explanations are released only after finalization.
7. Flutter must never directly write official results, course unlock state, or protected question keys.
8. AI is blocked through the backend during an active quiz attempt, and a late AI response must not appear on the student's screen after a quiz starts.

### Final Implementation Specification acceptance criteria — all pending at integrated-product level

| ID | Graduation demo acceptance criterion | End-to-end verification status |
|---|---|---|
| AC-01 | APK + physical phone + LAN + RTL bilingual | [ ] |
| AC-02 | Register/login/guest restriction/logout | [ ] |
| AC-03 | 6 courses, ≥12 complete bilingual lessons, first-course-only access | [ ] |
| AC-04 | Checkpoint before quiz, retry without attempt consumption | [ ] |
| AC-05 | 10/20 questions, 15/30 minutes, server grading | [ ] |
| AC-06 | 70%, acknowledged-answer-only, timeout, stable draw, bilingual explanations | [ ] |
| AC-07 | 3 unsuccessful attempts → 30m cooldown; replay/concurrency resistance | [ ] |
| AC-08 | Final quiz pass unlocks next course, reliable progress | [ ] |
| AC-09 | Arabic/English AI answers grounded in curated content, handles unsupported | [ ] |
| AC-10 | AI guest/active-quiz blocked, incl. direct request and late replies | [ ] |
| AC-11 | AI outage graceful; lesson/calculator unaffected | [ ] |
| AC-12 | Offline IPv4 + Binary + /31-/32 + VLSM verified | [ ] |
| AC-13 | Cached lessons readable offline; official operations online-only | [ ] |
| AC-14 | Importer validation/private separation/atomic publish | [ ] |
| AC-15 | Deletion revokes app access, prevents stale recreation | [ ] |
| AC-16 | Laptop service restart → phone reconnects and repeats full demo | [ ] |

## 4) Windows local environment & exact repository layout

### Verified paths

```text
E:\Graduation_Project2\networking-fundamentals\
├── mobile\                     Flutter Android app
│   ├── pubspec.yaml
│   └── lib\main.dart
├── backend\                    Firebase project root
│   ├── firebase.json
│   ├── firestore.rules          CURRENTLY TEMPORARY DENY-ALL
│   ├── tests\
│   │   ├── auth.http.test.mjs
│   │   ├── health.http.test.mjs
│   │   └── firestore.rules.test.mjs
│   └── functions\
│       ├── package.json
│       ├── .eslintrc.js
│       ├── src\
│       │   ├── index.ts
│       │   ├── auth.ts
│       │   ├── authorization.ts
│       │   ├── api-response.ts  NOT VERIFIED CREATED (NEXT)
│       │   └── api-errors.ts    PLANNED, NOT CREATED
│       └── tests\
│           └── authorization.http.test.cjs
└── ai_service\                 Python FastAPI local service
    ├── main.py
    └── .venv\Scripts\python.exe
```

**Old POC paths, separate and unnecessary for running the primary workspace:** `E:\P1_Firebase_Emulator_POC\P1_Firebase_Emulator_POC` and `E:\P1_HTTP_Integration_POC\P1_HTTP_Integration_POC`. Do not automatically copy them into the repository; the current project has its own independent tests.

### Versions and previous verification

| Tool | Most recently confirmed version |
|---|---|
| Windows | 10 x64 22H2 |
| VS Code | 1.144.0 |
| Flutter / Dart | 3.47.9 stable / 3.13.7 |
| Git | 2.54.0.windows.1 |
| Python | 3.12.10 |
| Node.js / npm | 24.15.0 / 11.12.1 |
| Firebase CLI | 15.34.2 |
| Java host | Eclipse Temurin JDK 21.0.13 LTS |
| Android SDK | `C:\Users\HP\AppData\Local\Android\Sdk` |
| Android components | Platform 36/37, Build Tools 36.0.0, Platform Tools/ADB |
| Firebase emulator project ID | `demo-networking-p1` |
| Emulator Auth / Firestore / Functions | `127.0.0.1:9099` / `:8080` / `:5001` |
| AI prototype service | `127.0.0.1:8000` |

- `flutter doctor` reported a healthy Android toolchain. Missing Chrome and Visual Studio C++ desktop components do not block Android-only development.
- The Samsung A17 previously launched apps through VS Code Flutter & Dart, but the final integrated app has not been verified end-to-end on the phone.
- Node dependencies in `backend/functions`: `firebase-admin@14.5.0`, `firebase-functions@7.4.0`, TypeScript 6.0.3. Relevant POC/backend test tooling includes `firebase@13.0.0` and Firebase CLI 15.34.2.
- Previously installed Flutter dependencies include `flutter_riverpod@3.4.3`, `firebase_core`, `firebase_auth`, `cloud_firestore`, and `cloud_functions`. Do not upgrade simply because newer versions exist.
- Python virtual environment imports verified: FastAPI/Uvicorn/Pydantic/Pytest/HTTPX/scikit-learn; `pip check` reported no broken requirements.

### Workstation caveats

- PowerShell sometimes raises `PSReadLine System.ArgumentOutOfRangeException` during paste. Open a fresh PowerShell or temporarily run `Remove-Module PSReadLine -ErrorAction SilentlyContinue`.
- In VS Code, open the **folder** `E:\Graduation_Project2\networking-fundamentals\backend\functions` if opening individual files causes false TS/ESLint errors.
- ESLint expects LF, not CRLF, in `.ts` files. In VS Code use `Ctrl+Shift+P` → `Change End of Line Sequence` → `LF` → Save. `.cjs` test files are excluded by `ignorePatterns: ["tests/**/*.cjs"]` in `.eslintrc.js`; Build/Lint succeeded after this setup.
- The production dependency graph has **six Moderate** `npm audit` advisories involving transitive `glob`/`minimatch` dependencies. The backend root audit previously had zero advisories with an `@grpc/grpc-js@1.13.6` override. Do not use `npm audit fix --force` without compatibility evidence; review before defense.

## 5) What has actually been implemented: Implementation Evidence Ledger

### Backend endpoints (present and tested)

| Function export / URL suffix | Method | Expected contract | Security |
|---|---|---|---|
| `health` | GET | HTTP 200 `{success:true,data:{status:"ok",service:"networking-backend"}}` | Public health, `Cache-Control: no-store` |
| `me` | GET | HTTP 200 `{success:true,data:{uid:"<verified uid>"}}` | Firebase Bearer ID Token verified |
| `studentAccess` | GET | HTTP 200 `{success:true,data:{uid,role:"student"}}` | Only verified current Student role |
| `adminAccess` | GET | HTTP 200 `{success:true,data:{uid,role:"admin"}}` | Only verified current Admin role |

All endpoints above reject unsupported POST with `405 METHOD_NOT_ALLOWED`; protected endpoints without token give `401`, invalid token gives `401`; wrong/missing/unknown role gives `403` where verified; `Authorization` Header Bearer is mandatory. `health` remains publicly accessible. Not all error routes are tested for no-store/Allow yet. URLs inside local Functions emulator typically: `http://127.0.0.1:5001/demo-networking-p1/us-central1/<functionName>`.

**`auth.ts` behavior:** initializes Firebase Admin once (`getApps()/initializeApp`), parses exactly Bearer token, calls `getAuth().verifyIdToken`, returns `{ok:true,user:DecodedIdToken}` or error `UNAUTHENTICATED`/`INVALID_TOKEN`. **Current code is not reported to use `verifyIdToken(token,true)` revocation checking**.

**`authorization.ts` current behavior:** calls `authenticate`; invokes `getAuth().getUser(uid)` for fresh user state; compares `userRecord.customClaims?.role` with `auth.user.role` and required role; checks `userRecord.disabled`; returns `FORBIDDEN` 403 on mismatch, or `AUTH_SERVICE_UNAVAILABLE` 503 on unexpected lookup failure, and `FORBIDDEN` on user-not-found. **Rule:** Strict student-only vs admin-only for current example endpoints (Admin does not automatically pass Student endpoint). Future actual user-specific resources still need ownership checks.

**Caveats:** A passing disabled-user test accepted `401` or `403`, so the exact status is not evidenced. Fresh-role lookup protects the tested role-change case, but is not full token-revocation/refresh-token session policy. For sensitive actions, assess revoked tokens, deletion tombstones, and fail-closed behavior separately. Do not publicly expose a role-granting endpoint. Emulators are local/demo only.

### Automated tests — observed results

| Test file | Latest results | Main assertions |
|---|---|---|
| `backend/functions/tests/authorization.http.test.cjs` | **16/16 PASS** | missing/invalid token; Student/Admin match/mismatch; no-role; unknown `teacher`; query/header spoofing; 405; stale Admin after claim removal; disabled Admin; old Student token after promotion |
| `backend/tests/auth.http.test.mjs` | **6/6 PASS** | missing/invalid/malformed Bearer; valid emulator token UID; spoof UID; POST 405 |
| `backend/tests/health.http.test.mjs` | **5/5 PASS** | 200, JSON contract, no-store, POST 405/error body |
| `backend/tests/firestore.rules.test.mjs` | **4/4 PASS** | Guest read/write denied; authenticated student read/write denied under temporary Deny-All |
| Flutter baseline `flutter test` | **1/1 PASS** | initial widget test only, not full app acceptance |
| AI `GET /health/live` | **HTTP 200** | service alive only; no tutor inference proof |

**31 backend tests PASS** = 16+6+5+4 **across four independent test runs**. Firestore `PERMISSION_DENIED` messages are expected because tests assert that access is rejected; they are not failures. `npm run build` and `npm run lint` succeeded after the latest authorization changes.

### Critical items not yet implemented, despite designs or POCs

- No verified functional endpoints for courses, lessons, answers, grades, progress, or account deletion.
- No final Firestore rules: `deny all` remains temporary, not the final student access policy.
- No verified seed data yet in the Cloud/Emulator DB for the six courses, 12 lessons, and quiz banks.
- No verified end-to-end local inference and knowledge-base retrieval pipeline in the current `ai_service`; a healthy endpoint alone is insufficient.
- No verified complete Flutter UI, calculator, or final integrated APK installed on a physical phone.
- Current HTTP tests focus on authentication security only; do not claim load, full security, or production signoff.

## 6) Active execution plan N1–N7 — detailed, with task-status marks

**Status legend:** `[x]` verified by test/command evidence; `[~]` partially implemented or designed without full verification; `[ ]` not verified as implemented; `[!]` blocker/risk.  
**Closure rule:** Design + code + tests + regression + logged commands/evidence + joint review; a successful build alone is insufficient. Owner A = user, Owner B = Flutter teammate, Both = both developers.

### N0 — Governance, toolchain, local skeleton | FOUNDATION CLOSED (not the complete product)

- [x] Approved a two-developer Android MVP with zero mandatory cost, no external AI, and no Jira.
- [x] Approved an emulator-first local architecture with a physical Android device target.
- [x] Created the `networking-fundamentals` root with `mobile`, `backend`, and `ai_service`; verified 11 essential paths.
- [x] Flutter SDK/Android SDK/ADB/Java/Node/Python/Firebase CLI verified.
- [x] Firebase emulator proofs and backend root tests; AI health; Flutter analyze + baseline test.
- [~] P0/P1 design documents exist, but every historical criterion has not been independently verified against the current files.

### N1 — Authorization + standardized API contract | **CURRENT ACTIVE PHASE**, Owner A

- [x] N1-01: Firebase emulator/Auth Admin init and `health` endpoint; build/lint and 5 HTTP tests.
- [x] N1-02: `authenticate()` reusable helper in `src/auth.ts`, protected `me` endpoint, 6 auth tests.
- [x] N1-03: `authorize()` helper & `studentAccess`/`adminAccess`; verified Firebase `role` claim and `getUser` current role.
- [x] N1-04: 16 role tests incl. unknown role, spoofing, stale role removal, disabled admin, stale promotion.
- [x] N1-05: Old 15 regression tests re-run after RBAC changes; 31/31 cumulative by groups.
- [ ] **N1-06 CURRENT NEXT:** create `src/api-response.ts` (`ApiSuccess<T>`, `ApiFailure`, `successResponse`, `errorResponse`) without changing endpoint behavior; build/lint.
- [ ] N1-07: create `src/api-errors.ts` centralized documented error codes with HTTP mapping (ensure 401/403/405/503 and later domain errors); preserve tested response format; decide `schemaVersion` and correlation-ID adoption as explicit API contract changes, never silently break clients.
- [ ] N1-08: refactor all **four** endpoints to use helpers; preserve `Cache-Control`, `Allow`, method checks, `uid` trust and status codes; Build/Lint.
- [ ] N1-09: add contract HTTP/unit tests for both responses and error mapping; verify old tests still pass; consider all 31 in one coordinated command, note emulator state and isolation.
- [ ] N1-10: secure resource **ownership policy** and handling deleted/revoked identities as actual domain APIs are built; `Student` vs `Admin` alone is not enough for `/users/{uid}` resources.
- [ ] N1-11: document API errors/openapi/example responses and Flutter client contract for Developer B; agree on version and error types.
- [ ] N1-12: review dependency audit risk, token revocation/disabled behavior, service-unavailable handling, and local-only bind. Do not claim full penetration-test signoff.
- **Exit gate:** identical old HTTP behavior, 31 regression tests still PASS plus new tests; helper contracts documented; no server-controlled domain data exposed through Flutter.

### N2 — Data model, ownership invariants, Firestore rules | NEXT, Owner A (+ B review)

- [ ] N2-01: formal collection schema: course, lesson, publishedContentVersion, quizDefinition/question bank (private), users/profile, progress, attempts, cooldown, AI source sections, deletion tombstones.
- [ ] N2-02: IDs, indexes, timestamps, ordering, unique/versioned identifiers; field-level rules for student identity vs backend-only state. Model must use **real Firestore**, not relational ERD assumptions transplanted from Unity simulator.
- [ ] N2-03: create emulator seed/fixtures for Guest/Student/Admin, first-course unlock, content versions, stale attempts.
- [ ] N2-04: replace deny-all rules with **least privilege**: Guests may read only approved public content, Students only own private profile/progress; quiz keys/grades/attempt state server-managed; Admin actions trusted backend. Never broad `allow read, write: if request.auth != null`.
- [ ] N2-05: positive/negative rules tests and ownership-attack tests (cross-UID, private answer key, forged official writes).
- [ ] N2-06: create `firestore.indexes.json`, seeded dataset, version/rollback migration strategy, emulator reset scripts.
- [ ] N2-07: security checks deletion/resurrection and `contentVersion` atomic commit.
- **Exit gate:** reproducible schema/fixtures, allowed operations pass, forbidden operations fail; no leaked question keys; regression PASS.

### N3 — Courses, lessons, bilingual content, importer | Owner A + B content

- [ ] N3-01: lock schema/contract for **6** sequential courses with names/order Arabic/English; ≥12 complete bilingual lessons, structured examples/illustrations.
- [ ] N3-02: build public approved-content read endpoints (`getCourses`, `getLessons` or confirmed alternatives), versioned envelopes, guest visibility and locked-course restrictions.
- [ ] N3-03: Git source Markdown/JSON, unique IDs, `contentVersion`, images and optional unlisted YouTube/video fallback; no protected bank data in public content.
- [ ] N3-04: validated JSON/CSV importer + staging/preview/publish + atomic active version pointer + rollback; tests for missing fields, duplicate IDs, broken references, insufficient bank size.
- [ ] N3-05: AI knowledge exporter from approved content only, not question bank or correctAnswer.
- [ ] N3-06: Flutter catalog/lesson reader skeleton integration with local cache and bilingual RTL (Developer B), schema test/mock and offline read.
- [ ] N3-07: content review and first course to end-to-end teaching quality, then populate remaining five without changing core architecture.
- **Exit gate:** six-course content in emulator, version/publish validation, Guest/student read policy, content cached offline.

### N4 — Checkpoint, authoritative quizzes, progress & unlock | Owner A backend; B Flutter

- [ ] N4-01: checkpoint correct-answer rule around lesson midpoint, unlimited retries, authoritative eligibility; no scrolling-only unlock.
- [ ] N4-02: protect banks; draw random stable **10/20** questions without duplicates; MCQ/T-F; never expose keys pre-finalize.
- [ ] N4-03: design/implement `startQuiz`, `saveQuizAnswer`, `finishQuiz`, `getQuizStatus` with transactional state and per-user ownership + idempotency.
- [ ] N4-04: server-clock deadlines **15m/30m**, grade only acknowledged answers, timeout finalizes, pass **70%**, final result/explanations bilingual.
- [ ] N4-05: 3 unsuccessful attempts then **30m cooldown**; no bypass via reconnect or simultaneous requests.
- [ ] N4-06: `completeLesson` and `getStudentProgress`; monotonic completion; final-pass-only course unlock, never client-generated.
- [ ] N4-07: write cross-account and concurrency tests; exact boundary times, duplicate/late/expired tokens, overlapping starts/saves/finish, network disconnect.
- [ ] N4-08: Flutter lesson→checkpoint→quiz/timer/result/progress UI with separate saved/unsaved indications.
- **Exit gate:** end-to-end quiz journey for lesson and final; no bypass and all security tests PASS.

### N5 — Fully local AI tutor and trusted backend integration | Owner A

- [x] N5-00 foundation only: `ai_service/main.py`, Python venv and `/health/live` 200; no claims of model functionality.
- [ ] N5-01: benchmark small **local CPU** open-weight models (quantized if useful), memory/latency/Arabic-English ability on Dell i7-7600U. Evaluate before selecting; no external hosted inference.
- [ ] N5-02: approved bilingual KB export (English master + Arabic adaptation, if aligned with source) into versioned sections + BM25 or TF-IDF retrieval, reference IDs and no quiz answers.
- [ ] N5-03: FastAPI model adapter, typed internal request/response, validation, contentVersion, timeouts/concurrency/resource budgets, graceful unavailable.
- [ ] N5-04: localized course and general-chat prompting, grounding/citations from actual source sections, reject or qualify unsupported claims; no hallucinated citations.
- [ ] N5-05: trusted Firebase Backend proxy `invokeAi` checks Bearer student, active quiz state, allowed course/lesson/contentVersion, limits and internal caller authentication before FastAPI.
- [ ] N5-06: Flutter AI chat (general/course) with **session-only history**, logout clearing, hide/cancel replies when a quiz starts; no cloud storage.
- [ ] N5-07: evaluation corpus bilingual + adversarial (historical target ~200 test cases), context safety, out-of-scope, timeouts, offline/outage and risk-based human audit.
- [ ] N5-08: benchmark real laptop CPU with Firebase Emulators and phone concurrently; no external services.
- **Exit gate:** a real Arabic/English AI response from local model, grounded in content, through trusted Backend from Flutter; blocked during quiz and unavailability gracefully handled.

### N6 — Flutter user experience + local calculator (parallel with N2–N5) | Owner B (+ A integration)

- [x] N6-00: Flutter workspace with SDK and dependencies; `pub get`, `analyze`, initial widget test.
- [ ] N6-01: navigation architecture, Riverpod providers, repository/API client, error/loading/offline, localization/RTL.
- [ ] N6-02: Login/register/guest/protected-action CTA/profile/logout and backend token handling; secure deletion flow.
- [ ] N6-03: 6-course catalog + locked/unlocked + lesson bilingual rich text/images/video fallback + cached approved content offline.
- [ ] N6-04: checkpoint, quiz start/answer ack, timer from server, pause/reconnection restriction, results/progress.
- [ ] N6-05: Dart offline IPv4/VLSM calculator including /31-/32, binary, invalid/insufficient space, UI and unit tests.
- [ ] N6-06: AI course/general chat, privacy/quiz disabled states, controlled errors and user experience.
- [ ] N6-07: physical Galaxy A17 verified in development mode, bilingual RTL, API26 compatibility, airplane-mode calculator/content tests.
- **Exit gate:** complete app journeys function against laptop-hosted local services, not just `flutter analyze`.

### N7 — Integrated LAN demo, QA, security & graduation deliverables | Both

- [ ] N7-01: configure Firebase/AI listeners for restricted LAN; Android **must use laptop LAN IP**, not localhost; validate Android network and Windows firewall rules; no public binding.
- [ ] N7-02: clean-room startup scripts + emulator/AI readiness, seed imported courses, test/demo student/admin profiles with trusted claims.
- [ ] N7-03: complete cross-service E2E journey from guest→login→course/lesson/checkpoint→quiz→unlock→AI available and quiz-blocked→offline calculator + cached content.
- [ ] N7-04: interrupted network, late AI answer, quiz timeout, deleted media, AI down and service restart, disabled/deleted users, content rollback.
- [ ] N7-05: run Flutter tests, backend tests, AI pytest, Firestore rules, security/dependency audit and LAN phone test; no Critical/High release issue.
- [ ] N7-06: create signed/debug demo APK as appropriate for graduation, install and confirm actual phone; document requirements and install instructions.
- [ ] N7-07: architecture diagrams, current DB logical/physical representation appropriate for Firestore, OpenAPI/contracts, evidence logs, seed reset/recovery, test reports, screenshots and defense script.
- [ ] N7-08: peer review from both developers, known limitations and final demo sign-off; demo-ready is not production-ready.
- **Exit gate:** repeatable offline-friendly local demonstration on physical Android and documented failures/recovery.

## 7) Historical execution roadmap P0–P9 (57 task IDs) — tracking appendix

This appendix comes from `Networking_Fundamentals_Master_Implementation_Roadmap_Final_Execution_Baseline.docx`. The **phase names, task IDs, owners, dependencies, deliverables, and acceptance criteria** are retained for archive and traceability. **Not every historical task is required by the current reduced MVP**: examples include P2-04 Admin Web Panel, P7-05 encrypted persistent history, P6 Notifications, Google Sign-In/Linking, and offline progress sync. Follow Section 2 / the Final Implementation Specification in case of a discrepancy. Some `P0/P1` tasks may be design-closed only, not integrated and implemented. Do not interpret an `[x]` mark here as runnable-code evidence unless the status explicitly says so.

### P0 — Requirements baseline & execution governance

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P0-01` | Both | none | Freeze approved FR/BR/DEC and trace inventory; label 50-test AI prototype as prototype / **Deliverable:** requirements index, change-control log / **Acceptance:** All scope items traced; no prototype labelled production | [x] Design/governance baseline approved |
| `P0-02` | B | P0-01 | Map user journeys and permission matrix for Guest, Student, Super Admin / **Deliverable:** journey map, role matrix / **Acceptance:** Each restricted action has owner and rejection behavior | [x] Design/journey baseline recorded |
| `P0-03` | Both | P0-01 | Confirm two-person ownership, review rule, repo/branch workflow, Definition of Done / **Deliverable:** RACI, DoD, task board / **Acceptance:** Every task has one implementer and second-person review | [x] Two-person/direct tracker decision approved |
| `P0-04` | A | P0-01 | Inventory existing AI code/contracts/tests and categorize keep/adapt/defer / **Deliverable:** AI reuse audit / **Acceptance:** No new AI feature work until dependencies resolved | [~] Prototype inventory/earlier work recorded; current AI implementation incomplete |

### P1 — Cross-system architecture and contract gates

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P1-01` | Both | P0-01 | Select backend/BaaS and application database with explicit tradeoff and ADR / **Deliverable:** ADR-001, stack proof of concept / **Acceptance:** Supports trusted quiz authority, transactions and deletion | [x] Architecture choice + emulator POC |
| `P1-02` | A | P1-01 | Define boundaries: mobile, admin, backend, database, content publishing, AI / **Deliverable:** C4/context, sequence flows / **Acceptance:** Authoritative ownership and trust boundaries unambiguous | [x] Architecture/trust boundary design approved |
| `P1-03` | A+B | P1-02 | Model entities and invariants (users, identities, six courses, lessons, sections, content versions, checkpoint, question banks, attempts, answers, cooldown, progress, tombstones) / **Deliverable:** logical ERD + constraints / **Acceptance:** Quiz attempts, deletion, sync idempotent by design | [x] Logical design baseline; not implemented schema |
| `P1-04` | A+B | P1-03 | Specify v1 client API and AI adapter contract, versioning, errors, correlation and idempotency / **Deliverable:** OpenAPI + example payloads / **Acceptance:** Flutter and backend contract tests pass independently | [~] Contract designs exist; actual standardized API docs N1 incomplete |
| `P1-05` | A | P1-03 | Finalize auth and ownership flows incl Google linking/reset/account deletion and guest boundaries / **Deliverable:** auth threat model and endpoints / **Acceptance:** No email-only linking; no offline deletion success | [~] Firebase token/RBAC done; account deletion/link/reset not done |
| `P1-06` | A+B | P1-03 | Finalize quiz server lifecycle/time and AI quiz-race guard design / **Deliverable:** quiz state chart and API / **Acceptance:** No stale or in-flight AI answer displays during quiz | [~] Quiz POC/design; integrated quiz not done |
| `P1-07` | B | P1-03 | Choose Flutter cache/chat encryption & sync plan; define content release contract / **Deliverable:** mobile storage and content ADRs / **Acceptance:** 7-day/backup/cleanup policies implementable | [↺] Legacy storage policy superseded by simplified session-only chat/online official progress |
| `P1-08` | Both | P1-04..07 | Define test pyramid, mock contracts, release metrics and security gates / **Deliverable:** QA matrix and CI gates / **Acceptance:** Every critical rule tied to automated verification | [~] Test design/POCs; current baseline has 31 backend tests, not full QA matrix |

### P2 — Development foundations and shared fixtures

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P2-01` | A | P1-01..08 | Create repositories or monorepo directories, CI checks, secret rules and local reproducible setup / **Deliverable:** runnable CI pipelines / **Acceptance:** Fresh clone starts without checked-in secrets or venv | [~] Local repo skeleton verified; CI/secrets gate not verified |
| `P2-02` | A | P2-01 | Initialize backend, DB migrations, seeded content fixtures, API error envelope / **Deliverable:** health endpoint + migrations / **Acceptance:** Clean rebuild reproducible | [~] Health + Auth + RBAC functions; schema/import/migrations not done |
| `P2-03` | B | P2-01; P1-04 | Initialize Flutter API26 Android, bilingual RTL themes/navigation, API client and error states / **Deliverable:** launchable Android shell / **Acceptance:** Arabic/English and guest routes work | [~] Flutter scaffold only; bilingual shell/UI not verified |
| `P2-04` | B | P2-01; P1-05 | Initialize web Admin Panel shell and authorization middleware / **Deliverable:** admin shell / **Acceptance:** Non-admin denied | [↺] Historical Admin web panel, replaced by developer-operated importer in current spec |
| `P2-05` | Both | P2-02..04 | Stand up contract mocks, test containers/fixtures as applicable; import prior AI tests without claiming integrated success / **Deliverable:** contract test harness / **Acceptance:** Backend, Flutter and AI independently exercise same examples | [~] Emulator tests functional; full cross-component contract mocks not done |

### P3 — Identity and content vertical slice

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P3-01` | A | P2-02;P1-05 | Implement sign-up/login/email reset/Google verified linking/logout / **Deliverable:** auth endpoints and DB rules / **Acceptance:** Security tests include invalid/expired tokens and linking attacks | [~] Auth verification only; Flutter signup/reset/deletion not verified |
| `P3-02` | B | P3-01;P2-03 | Implement Flutter guest and account flows, error/reset UX, account-scoped cache / **Deliverable:** mobile auth UI / **Acceptance:** Guest forbidden actions prompt registration | [ ] Not verified/implemented; check current reduced MVP scope |
| `P3-03` | Both | P1-07; P2-02 | Author content schema, six-course skeleton + bilingual sample; review workflow / **Deliverable:** versioned content package / **Acceptance:** Content human-approved; question keys isolated | [ ] Not verified/implemented; check current reduced MVP scope |
| `P3-04` | A+B | P3-03;P2-04 | Implement admin CSV/JSON validation, preview, approve, publish and rollback / **Deliverable:** admin import & publish / **Acceptance:** Import alone never publishes; version rollback works | [ ] Not verified/implemented; check current reduced MVP scope |
| `P3-05` | A+B | P3-04;P2-03 | Implement versioned public course/lesson read endpoints, videos fallback and download/cache / **Deliverable:** lesson reading E2E / **Acceptance:** Guest read restrictions; video failure does not crash | [ ] Not verified/implemented; check current reduced MVP scope |
| `P3-06` | A+B | P3-01..05 | Implement confirmed online account deletion, revoke tokens, tombstone and local purge / **Deliverable:** deletion vertical slice / **Acceptance:** Cannot resurrect via stale sync or restored backup | [ ] Not verified/implemented; check current reduced MVP scope |

### P4 — Learning state, checkpoint and offline progress

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P4-01` | A | P3-05 | Implement formative mid-lesson checkpoint, unlimited retry, server-defined eligibility / **Deliverable:** checkpoint domain/API / **Acceptance:** Scrolling does not unlock quiz; wrong answer retries | [ ] Not verified/implemented; check current reduced MVP scope |
| `P4-02` | A | P3-01;P3-05 | Implement student lesson progress and monotonic idempotent synchronization / **Deliverable:** progress API + idempotency / **Acceptance:** Duplicates and stale updates never regress completion | [ ] Not verified/implemented; check current reduced MVP scope |
| `P4-03` | B | P4-01..02 | Implement Flutter reading/progress, offline cache, checkpoint UX and sync queue / **Deliverable:** mobile lesson flow / **Acceptance:** Offline reads; sync after reconnect; signout warning | [ ] Not verified/implemented; check current reduced MVP scope |
| `P4-04` | Both | P4-03 | Test multi-device and account lifecycle isolation, cache failure and content version migration / **Deliverable:** integration suite / **Acceptance:** Deleted/sign-out account cannot replay queued events | [ ] Not verified/implemented; check current reduced MVP scope |

### P5 — Authoritative quizzes and course unlocking

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P5-01` | A | P3-04;P4-01 | Protect question banks/answers; implement 10/20 random stable question sets and 70% grading / **Deliverable:** question API + grading service / **Acceptance:** 7/10 and 14/20 pass; answer keys hidden during attempt | [ ] Not verified/implemented; check current reduced MVP scope |
| `P5-02` | A | P5-01 | Implement server acceptance, deadline (15m/30m), answer acknowledgements, resume and expiry grading / **Deliverable:** transactional attempt service / **Acceptance:** Server time, retries idempotent, timeout grades acknowledged answers | [ ] Not verified/implemented; check current reduced MVP scope |
| `P5-03` | A | P5-02 | Implement 3 attempts/30m cooldown, unlock next course only after final pass / **Deliverable:** attempt/cooldown/unlock APIs / **Acceptance:** Concurrent start does not double-charge; next course unlock correct | [ ] Not verified/implemented; check current reduced MVP scope |
| `P5-04` | B | P5-02..03 | Implement Flutter quiz timer, offline-block state, pending answer indicator, results/explanations / **Deliverable:** quiz UI / **Acceptance:** Client never invents grade or treats unconfirmed answer as saved | [ ] Not verified/implemented; check current reduced MVP scope |
| `P5-05` | Both | P5-04 | Verify quiz concurrency, reconnect, resume, timeout, late answer, duplicate finalize / **Deliverable:** adversarial quiz suite / **Acceptance:** All critical race/timeout tests pass | [ ] Not verified/implemented; check current reduced MVP scope |

### P6 — Offline calculator and notifications

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P6-01` | B | P2-03 | Implement offline IPv4, subnet metrics, binary and VLSM calculation with exhaustive bounds / **Deliverable:** calculator module/tests / **Acceptance:** Correct CIDR/VLSM, rejects malformed and insufficient space | [ ] Not verified/implemented; check current reduced MVP scope |
| `P6-02` | B | P6-01 | Create calculator UI and offline scenario tests / **Deliverable:** Android tool flow / **Acceptance:** Works in airplane mode | [ ] Not verified/implemented; check current reduced MVP scope |
| `P6-03` | B | P4-03;P5-03 | Implement three-day inactivity and authoritative cooldown notifications; permission fallbacks / **Deliverable:** local notification flows / **Acceptance:** Permissions denied no crash; notification not authority | [↺] Notifications in historical scope, not listed as current reduced MVP gate |
| `P6-04` | Both | P6-03 | Verify Android API26 behavior, permissions and clock handling / **Deliverable:** device validation / **Acceptance:** Notifications informational only | [↺] Notifications in historical scope, not listed as current reduced MVP gate |

### P7 — AI content, model and service integration

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P7-01` | A+B | P3-03..04 | Formalize approved Tier1/Tier2 knowledge export, index boundaries/versioning, prohibited quiz corpus / **Deliverable:** versioned KB build / **Acceptance:** No protected answer keys indexed; rollback traceable | [ ] Not verified/implemented; check current reduced MVP scope |
| `P7-02` | A | P7-01 | Select local CPU candidates and optional permitted free evaluation; profile on target laptop / **Deliverable:** model scorecards / **Acceptance:** Quality gate before speed/cost selection; zero mandatory spend | [ ] Not verified/implemented; check current reduced MVP scope |
| `P7-03` | A | P7-01..02 | Build retrieval, bilingual prompts, context budgeting, citations and uncertainty handling / **Deliverable:** AI answering pipeline / **Acceptance:** Domain boundaries + contextual grounding tested | [ ] Not verified/implemented; check current reduced MVP scope |
| `P7-04` | A | P5-05;P7-03 | Integrate backend auth/quiz gate with AI service, content-version validation and cancellation / **Deliverable:** secured AI proxy / **Acceptance:** Guest and active quiz denied; in-flight output suppressed | [ ] Not verified/implemented; check current reduced MVP scope |
| `P7-05` | B | P7-04;P1-07 | Implement Flutter AI course chat, encrypted per-course SQLite, 7-day sliding retention / **Deliverable:** chat client and storage / **Acceptance:** Read/AI response do not extend expiry; purge on logout/delete | [↺] Legacy encrypted long-term chat replaced by session-only transient chat |
| `P7-06` | A+B | P7-02..05 | Choose synchronous or Jobs v2 based on measured model latency, contract + recovery; reuse validated prototype carefully / **Deliverable:** AI delivery ADR / **Acceptance:** No extra moving parts absent demonstrated need | [ ] Not verified/implemented; check current reduced MVP scope |
| `P7-07` | Both | P7-03..06 | Run QA dataset across six courses, Arabic/English, adversarial, 200-case planning target / **Deliverable:** model evaluation evidence / **Acceptance:** Risk-tiered mandatory gates; independent holdout | [ ] Not verified/implemented; check current reduced MVP scope |

### P8 — Security, operations and release readiness

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P8-01` | Both | P3..P7 | Run full auth/deletion/backup/quiz/AI race penetration and privacy review / **Deliverable:** security report / **Acceptance:** No unresolved Critical/High finding for release | [ ] Not verified/implemented; check current reduced MVP scope |
| `P8-02` | A | P7-02..07 | Calibrate quotas, concurrency, RAM/CPU, timeouts, operational retention and monitoring / **Deliverable:** capacity/operations report / **Acceptance:** Measured on intended environment, fail safely | [ ] Not verified/implemented; check current reduced MVP scope |
| `P8-03` | B | P3..P7 | Test Android API26+, Arabic RTL, video fallback, offline, sync, notifications, accessibility / **Deliverable:** device test matrix / **Acceptance:** Critical user journeys complete without crashes | [ ] Not verified/implemented; check current reduced MVP scope |
| `P8-04` | Both | P8-01..03 | Execute end-to-end regression, release migration, content rollback, crash report and recovery tests / **Deliverable:** release checklist / **Acceptance:** All mandatory gates pass; fail blocks release | [ ] Not verified/implemented; check current reduced MVP scope |
| `P8-05` | Both | P8-04 | Prepare deployment/backup/restore, admin operation guide, student privacy disclosure and handoff / **Deliverable:** release runbook / **Acceptance:** Reproducible deployment and recovery; release owner signs | [ ] Not verified/implemented; check current reduced MVP scope |

### P9 — Graduation defense & final delivery

| Task | Owner | Dependencies | Planned deliverable & acceptance (original roadmap) | Current status |
|---|---|---|---|---|
| `P9-01` | Joint | P8 | Freeze demo release candidate; signed git tag; documented component and content versions; clean install reproducibility | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-02` | Developer B | P3–P7 | Prepare Android APK on supported API 26+ emulator/device, bilingual RTL/LTR demo paths, screen capture fallback; confirm guest/student/admin role boundaries | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-03` | Developer A | P3–P8 | Prepare repeatable demo environment with deployed Backend, application data store, AI service, content publication, protected secrets and status/readiness checks; start-from-clean instructions | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-04` | Joint | P3–P8 | Seed approved bilingual six-course lessons, media fallback examples and eligible quiz banks: >=10 per lesson, >=20 per final; document content version and rollback; NO protected answers in AI index | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-05` | Joint | P5–P8 | Rehearse scripted E2E demo: guest restriction → registration → learning/checkpoint → quiz/pass/unlock → AI allowed/quiz-denied → offline calculator/progress sync → admin import/review/publish | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-06` | Joint | P8 | Show failure demonstrations: AI offline graceful fallback; quiz disconnect/server timer; no late AI answer; deleted/private video; account deletion and stale sync rejection | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-07` | Developer A | P8 | Technical defense pack: architecture/data-flow & trust boundaries, physical ERD, migration rationale, API/OpenAPI contracts, auth/quiz invariants, AI evaluation evidence, CPU/cost tradeoffs | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-08` | Developer B | P8 | User-facing pack: feature walkthrough, bilingual screenshots, app permissions/offline behavior, Android installation instructions, presentation/slides and demo rehearsal | [ ] Not verified/implemented; check current reduced MVP scope |
| `P9-09` | Joint | P9-01..08 | Final delivery checklist signed by both; APK, source, migrations, seed/import data, deployment/runbook, test evidence and known limitations. Demo-ready != production-ready | [ ] Not verified/implemented; check current reduced MVP scope |


## 8) Exact resumption point: the first coding action in the new chat

**Do not restart the project or switch to Flutter development right now; continue from N1-06.** In the last exchange, the assistant requested creation of `backend/functions/src/api-response.ts`, but the user has not yet supplied evidence that the file exists. First check whether it was created after moving chats, without repeating known questions.

### Previously proposed `src/api-response.ts` content (copy-ready; NOT CONFIRMED CREATED)

```typescript
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

/**
 * Builds a standardized successful API response.
 *
 * @param {T} data - Response payload.
 * @return {ApiSuccess<T>} Successful response.
 */
export function successResponse<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Builds a standardized API error response.
 *
 * @param {string} code - Stable error identifier.
 * @param {string} message - Human-readable error message.
 * @return {ApiFailure} Error response.
 */
export function errorResponse(
  code: string,
  message: string
): ApiFailure {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
```

**PowerShell commands for the user to run now:**

```powershell
cd E:\Graduation_Project2\networking-fundamentals\backend\functions
code .\src\api-response.ts
# Paste code in VS Code, switch CRLF to LF, Ctrl+S
npm run build
npm run lint
```

**Expected:** `tsc` succeeds and `eslint --ext .js,.ts .` reports no errors. Next is N1-07: `api-errors.ts` with **codes/statuses compatible with the current contract**. Do not add `schemaVersion` or correlation IDs to public responses without agreement and regression tests.

### Controlled refactoring and tests thereafter

- Inspect the actual `src/index.ts` before modifying it. It exports four functions and its existing status codes, messages, and headers have already been tested.
- Create centralized, testable helpers; adopt them progressively in endpoints without changing no-store, Allow, GET-only checks, or authentication order.
- Add helper tests (success/error) and error-mapping tests; run Build/Lint; then Authorization and the 15 older tests.
- If `tests/authorization.http.test.cjs` fails, confirm that the Functions emulator loaded the latest compiled `lib` after `npm run build`, and that ports 9099/8080/5001 belong to the expected project.
- Record actual Passed/Failed counts. Do not mark N1-06..09 `[x]` until the commands complete successfully.

## 9) Startup and verification command reference — PowerShell

**Terminal A — Firebase Emulators (keep running during HTTP tests):**

```powershell
cd E:\Graduation_Project2\networking-fundamentals\backend
firebase emulators:start --only auth,firestore,functions --project demo-networking-p1
```

**Terminal B — Build/Lint + RBAC tests:**

```powershell
cd E:\Graduation_Project2\networking-fundamentals\backend\functions
npm run build
npm run lint
node --test .\tests\authorization.http.test.cjs
```

**Terminal B or C — Older regression tests:**

```powershell
cd E:\Graduation_Project2\networking-fundamentals\backend
node --test .\tests\auth.http.test.mjs
node --test .\tests\health.http.test.mjs
node --test .\tests\firestore.rules.test.mjs
```

**Historical expected results:** Authorization 16/16, Auth 6/6, Health 5/5, Firestore 4/4 — **not a guarantee that changed code still passes: execute and verify**.

**AI FastAPI skeleton:**

```powershell
cd E:\Graduation_Project2\networking-fundamentals\ai_service
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
# From another terminal:
Invoke-RestMethod http://127.0.0.1:8000/health/live
```

**Flutter shell (not evidence of a complete UI):**

```powershell
cd E:\Graduation_Project2\networking-fundamentals\mobile
flutter pub get
flutter analyze
flutter test
flutter devices
# With Samsung connected and detected:
flutter run -d <device-id>
```

**Troubleshooting notes:**

- `flutter devices` may display only Windows/Chrome/Edge when the phone is unplugged. Galaxy A17 was previously detected as device ID `RKGYC042G6T`, but verify the current ID using `flutter devices` before running.
- When the phone is on Wi-Fi with the laptop, `127.0.0.1` on the phone means **the phone itself**, not the laptop. Bind services restrictively to the laptop's LAN IP and use that IP in Flutter; configure the firewall and network isolation. Never publish services to the internet.
- The current deny-all Firestore rules will block direct access from Flutter. **This is expected** until N2 establishes the proper allowed-read policy.
- Check the actual `firebase.json` for port settings; do not assume that paths or Functions remained unchanged after this handoff.

## 10) Risk register, decisions, and known gaps

| Risk ID | Risk / fact | Status and required action |
|---|---|---|
| R-01 | 6 Moderate indirect advisories under `backend/functions` prod dependency graph (`glob`/`minimatch`) | [!] Open; document audit; no blind `--force`; reassess before defense |
| R-02 | Firestore rules deny-all | [!] Temporary; positive read rules and student private isolation in N2 |
| R-03 | Admin/Student RBAC only per example endpoint; no real resource-ownership policies | [!] Implement ownership in domain APIs |
| R-04 | Current `auth.ts` uses `verifyIdToken` without recorded `checkRevoked`; fresh getUser helps claims, not a complete session revocation protocol | [!] Decide revocation, deletion tombstone, expired/deleted users; fail closed |
| R-05 | Live `getUser` on every role-checked request adds latency and Emulator/network dependency | [!] Measure P95/CPU; explicit 503 for unexpected lookup failure |
| R-06 | App lacks full official quiz backend and concurrency / state-machine tests | [!] N4 biggest security-critical scope |
| R-07 | AI inference/KB unavailable yet; only FastAPI health verified | [!] Choose tested local CPU model; do not substitute hosted AI |
| R-08 | No integrated physical-phone LAN demo verified | [!] N7 Wi-Fi/IP/ports/firewall/APK tests |
| R-09 | Historical Phase1 vs simplified implementation document scope divergence | [!] Use active simplified spec; keep legacy traceability, no silent additions |
| R-10 | Full user account deletion, signout stale queues, content version rollback not implemented | [!] N2–N4/N7 |
| R-11 | `api-response.ts` only proposed at handoff | [ ] First action, not verified |
| R-12 | No production/public release intended | [x] Local demo scope; do not impose cloud cost or unnecessary production orchestration |

## 11) Continuation and collaboration rules for the new chat

1. **Do not ask again** about the project name, paths, Firebase project ID, device, no-external-AI restriction, team, scope, quiz settings (10/20 questions, 15/30 min, 70%, three attempts/30-minute cooldown), or current stopping point; they are documented here.
2. Start at **N1-06**. If the user reports completing it, evaluate the logs and update the tracker before advancing. Do not automatically repeat the 31 tests merely because a new chat has started; rerun when a relevant code change warrants it.
3. The user prefers clear, direct Egyptian Arabic explanations with English technical terminology, copy-ready PowerShell commands, and **complete source files** when needed, rather than conflicting fragments.
4. Update the tracker after each step (`[x]`, `[~]`, `[ ]`, `[!]`) and attach evidence to closure. Do not label the entire MVP complete or production-ready.
5. Source code under `/src` must comply with ESLint (LF, JSDoc, TypeScript) and trust boundaries. Test negative cases, not just the happy path.
6. The new chat **does not automatically have access to files on the user's `E:\...` drive**. These are Windows paths on the user's machine; do not assume they can be read without uploads, pasted content, or an explicitly connected file-access tool. Request a specific file's content only when needed for a safe edit.
7. Check new guidance against the `Final Implementation Specification` before changing scope. Treat undocumented choices as Proposed, not Approved.
8. The final goal is a locally operating, end-to-end Android APK for the graduation defense, not merely theoretical code or documentation.
9. Preserve new evidence suites with API changes; check consent/privacy and enforce active-quiz AI blocking in the backend, not Flutter alone.
10. Do not confuse **Networking Fundamentals Learning App** with the **Unity Desktop Networking Simulator** (TASK-01..05/PostgreSQL) or Skillory 2 (PHP/MySQL/recommendations). Never transfer simulator-specific PostgreSQL decisions to this Firebase application.

## 12) Reference documents and sources (for deeper technical details)

| File | Why it matters | Note |
|---|---|---|
| `Networking_Fundamentals_Final_Implementation_Specification.docx` | Latest reduced MVP requirements, AC-01..16, quiz/content/AI contracts | Previously also found under a `(1)`-suffixed name |
| `Networking Fundamentals Phase1 Final Signoff Candidate (1)(1).docx` | Original consolidated requirements and detailed decisions; broader than the reduced MVP | Historical traceability reference; discrepancies must be documented |
| `Networking_Fundamentals_Master_Implementation_Roadmap_Final_Execution_Baseline.docx` | Historical P0..P9 plan (57 tasks) | Preserved in the appendix here |
| `Networking_Fundamentals_Implementation_Status_and_Next_Steps_v1.docx` | Last baseline before implementing RBAC (November 4 document) | **Outdated:** referred only to 15 tests and `health`/`me`; this handoff updates that to 31 tests and four endpoints |
| `backend/functions/src/index.ts`, `auth.ts`, `authorization.ts` | Actual implementation source of truth | Inspect the user's current files before any refactor |
| `backend/functions/tests/authorization.http.test.cjs` | Sixteen authorization/security scenarios | Test results are supported by the user's logs |
| `backend/tests/*.mjs` | Fifteen older regression scenarios | Tests were rerun successfully after RBAC |

**Evidence note:** Test results and paths in this document are based on PowerShell outputs supplied by the user and retrieved documentation, not on live access to the user's computer. Future tasks and plans are not implementation claims. The handoff date is the document date; it does not imply every test was rerun on that date.

## 13) Work-tracking update template for the new chat

| Task ID | Status | Code/Artifact | Evidence | Next dependency |
|---|---|---|---|---|
| N1-06 | [ ] | `src/api-response.ts` | Pending Build/Lint | N1-07 |
| N1-07 | [ ] | `src/api-errors.ts` | Pending unit/schema tests | N1-08 |
| N1-08 | [ ] | Refactor 4 endpoints | Pending 31 regressions + new tests | N1-09 |
| N1-09 | [ ] | New contract test suite | Pending | N1 signoff/N2 |
| N2-01 | [ ] | Firestore logical schema | Pending | N2-02 |
| N3-01 | [ ] | 6-course content schema | Pending | N3-02 |
| N4-01 | [ ] | Lesson checkpoint contract | Pending | Quiz lifecycle |
| N5-01 | [ ] | Local CPU model selection evidence | Pending | Local AI tutor |
| N6-01 | [ ] | Flutter app screens architecture | Pending | Feature screens |
| N7-01 | [ ] | Local LAN topology/readiness scripts | Pending | Physical device E2E |

**End of continuity handoff. First actionable task: N1-06.**
