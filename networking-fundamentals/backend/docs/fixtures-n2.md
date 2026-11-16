# Emulator Fixtures — N2-03

**Task:** N2-03 — seed/fixtures for Guest/Student/Admin, first-course unlock, content versions, stale attempts
**Owner:** Developer A (backend)
**Depends on:** [`data-model.md`](./data-model.md), [`schema-lock.md`](./schema-lock.md)
**Status:** verified against the running Firebase emulators; client rules are least-privilege (N2-04); seeding and verification use the Admin SDK
**Implementation:** `backend\functions\scripts\fixtures.cjs` (seed + verify), `backend\functions\tests\fixtures.test.cjs`

---

## 1. What is seeded

The seed writes **424 documents** into the emulators and creates 5 Auth records (4 live + 1 deleted):

| Data | Count | Notes |
|---|---|---|
| Content documents (v001 + staging v002) | 383 | 6 courses, 12 lessons, 18 quizzes, 18 banks, 288 questions, 24 AI sections, 12 private checkpoint keys |
| User profiles | 4 | student, cooldown student, admin, disabled student |
| `courseProgress` | 7 | 6 for student-01, 1 for student-02 |
| `lessonProgress` | 5 | student-01 |
| `attempts` | 12 | 8 finalized, 1 expired, 1 void, 2 active (one stale) |
| `quizState` | 9 | includes one active cooldown |
| `idempotency` | 1 | 24-hour record |
| `accountTombstones` | 1 | deleted/guest fixture |
| `adminAudit` | 2 | publish + role change |

Active content pointer: `system/publishedContentVersion` → `v001`.
`contentVersions/v002` exists with `status: "staging"` and must stay invisible.

## 2. Fixture accounts

| UID | Role claim | Profile status | Auth | Purpose |
|---|---|---|---|---|
| `fixture-student-01` | `student` | active | enabled | normal progression: course-01/02 completed, course-03 in progress, courses 04–06 locked |
| `fixture-student-02` | `student` | active | enabled | 3 failed attempts → active 30-minute cooldown |
| `fixture-admin` | `admin` | active | enabled | trusted admin actor for audit events |
| `fixture-disabled` | `student` | disabled | disabled | disabled-account behavior |
| `fixture-deleted` | none | none | deleted | tombstone only; no profile or private data |
| guest | none | none | no account | unauthenticated context |

All live fixture accounts use password `FixturePass123!` in the emulator only. These are **not** production credentials.

## 3. Commands

```powershell
cd E:\Graduation_Project2\networking-fundamentals\backend\functions

# Seed (destructive only for fixture-owned paths)
npm run fixtures:seed

# Verify the N2-02 invariants (17 checks)
npm run fixtures:verify

# Seed + verify as one node:test suite (19 tests)
npm run fixtures:test
```

Prerequisite: emulators listening on Auth **9099**, Firestore **8080**, Functions **5001**.

```powershell
Get-NetTCPConnection -LocalPort 9099,8080,5001 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort
cd E:\Graduation_Project2\networking-fundamentals\backend
firebase emulators:start --only auth,firestore,functions --project demo-networking-p1
```

## 4. Reset scope

`fixtures:seed` deletes and rewrites only these paths:

- `system/publishedContentVersion`
- `contentVersions/v001` and `contentVersions/v002` (recursively)
- `users/{fixture-student-01,fixture-student-02,fixture-admin,fixture-disabled,fixture-deleted}` (recursively)
- `accountTombstones/fixture-deleted`
- the two fixture `adminAudit` events
- the five fixture Auth users

It does **not** touch other Auth users, other Firestore collections, rules, indexes, or Functions code.

## 5. Time-sensitive fixtures

The active attempt and cooldown are snapshots of "now":

- `fixture-student-01` active attempt deadline: seed time **+5 minutes**.
- `fixture-student-02` cooldown: seed time **+20 minutes**.

Run `fixtures:seed` immediately before `fixtures:verify` (or use `fixtures:test`, which seeds first). A verify run more than ~5 minutes after seeding will correctly report the active attempt as no longer future. The stale attempt (deadline **−45 minutes**) and all finalized/expired/void attempts remain valid indefinitely.

## 6. What verification checks

`fixtures:verify` asserts, among others:

- pointer is `v001`, `v001` is published with 6 courses / 12 lessons, `v002` is staging;
- courses ordered 1–6; 12 lessons, 2 per course; 18 quizzes with 10/15 and 20/30 constants;
- 18 banks and 288 questions, exactly one correct option per question;
- 12 private checkpoint keys resolve to a public option;
- no public content document contains `correctOptionIds`, `correctOptionId`, `explanation`, or `review`;
- 24 AI sections are approved and contain no quiz IDs;
- 4 profiles mirror Auth roles/disabled state; guest and deleted Auth users are absent;
- progress is sequential and completion implies a final pass;
- every attempt has a unique draw, a valid option permutation, answers drawn from the draw, and correct deadline arithmetic;
- finalized/expired attempts have a review whose correctness count matches `correctCount`;
- one future active attempt, one stale active attempt, one active 3-failure cooldown;
- tombstone exists, profile is absent, Auth user is deleted;
- idempotency record expires in 24 hours; 2 audit events exist.

Last recorded result: **17/17 checks PASS**, fixture suite **19/19 tests PASS**, existing regression suite **43/43 PASS**, build and lint clean.

## 7. Explicit non-goals

- No Firestore rules change (N2-04).
- No index change (N2-06).
- No Functions or Flutter code change.
- Fixtures are seeded and verified with the Admin SDK, which bypasses the N2-04 client rules; client visibility is covered by the N2-05 suite.
- No production data, secrets, or real student records.
