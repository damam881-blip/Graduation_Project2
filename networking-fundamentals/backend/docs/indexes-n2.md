# N2-06 - Firestore indexes and migration policy

**Task:** N2-06 - populate and verify `backend\firestore.indexes.json`.
**Status:** implemented and verified (emulator; deployment out of MVP scope).
**Files changed:** `backend\firestore.indexes.json` (empty scaffold -> 11 composite indexes).
**Files added:** `backend\tests\indexes.n2.test.mjs` (20 tests), this document.
**Unchanged:** `firestore.rules`, Functions source, existing tests, `firebase.json`.

---

## 1. Before / after

| | Before | After |
|---|---|---|
| `indexes` | `[]` (scaffold comments only) | 11 composite indexes (I-01...I-11) |
| `fieldOverrides` | `[]` | `[]` (no speculative overrides) |
| Index contract test | none | 20 tests (6 static + 12 live + subsuite) |
| Query shapes exercised | 0 | 11 composite shapes + 1 single-field shape |

The file is strict JSON (no comments), so it parses with `JSON.parse` and with
the Firebase CLI.

---

## 2. Index set

Staged order follows `schema-lock.md` section 6: content -> progress ->
attempts/quiz -> admin/audit. Field order is equality fields first, then the
`orderBy` field.

| # | Stage | Collection group | Fields | Query shape exercised |
|---|---|---|---|---|
| I-01 | 1 | `quizzes` | `courseId` ASC, `type` ASC, `order` ASC | `courseId == c && type == "lesson"`, order by `order` |
| I-02 | 1 | `lessons` | `courseId` ASC, `order` ASC | `courseId == c`, order by `order` |
| I-08 | 1 | `aiSections` | `courseId` ASC, `language` ASC, `order` ASC | `courseId == c && language == l`, order by `order` |
| I-06 | 2 | `lessonProgress` | `courseId` ASC, `lessonOrder` ASC | `courseId == c`, order by `lessonOrder` |
| I-03 | 3 | `attempts` | `uid` ASC, `startedAt` DESC | `uid == u`, order by `startedAt` desc |
| I-04 | 3 | `attempts` | `quizId` ASC, `status` ASC, `startedAt` ASC | `quizId == q && status == s`, order by `startedAt` |
| I-05 | 3 | `attempts` | `status` ASC, `deadlineAt` ASC | `status == s`, order by `deadlineAt` |
| I-07 | 4 | `users` | `role` ASC, `status` ASC, `createdAt` ASC | `role == r && status == s`, order by `createdAt` |
| I-09 | 4 | `adminAudit` | `actorUid` ASC, `createdAt` DESC | `actorUid == a`, order by `createdAt` desc |
| I-10 | 4 | `adminAudit` | `action` ASC, `createdAt` DESC | `action == a`, order by `createdAt` desc |
| I-11 | 4 | `accountTombstones` | `status` ASC, `deletedAt` ASC | `status == s`, order by `deletedAt` |

### I-12 is intentionally absent

`quizState` needs only `cooldownUntil` (single field). Firestore creates the
single-field index automatically, so adding a composite entry would duplicate
an automatic index and add write cost. The suite asserts that no `quizState`
entry exists and exercises the cooldown sweep
(`cooldownUntil > now`, order by `cooldownUntil`) with a live query.

### I-01 clarification

The course screen does not query a combined "lesson quizzes then final" list.
The final quiz id is stored on the course document (`courses/{c}.finalQuizId`)
and is read directly; the list query is lesson quizzes only. That is why `type`
is an equality field in the I-01 index and not merely an ordering field.

### No unused indexes

Every entry maps to a query shape in `data-model.md` section 10 that is executed
by `backend\tests\indexes.n2.test.mjs`. There are no speculative entries and no
`fieldOverrides`. The production Functions layer does not issue these queries
yet (queries arrive with the course/quiz screens); deployment can remain staged
per `schema-lock.md` section 6.

---

## 3. Why the emulator cannot prove index existence

The Firestore emulator evaluates queries without requiring composite indexes.
A query that would fail on a deployed project still succeeds locally. Therefore
N2-06 uses two independent checks:

1. **Static contract (index existence):** the JSON is parsed and compared, entry
   by entry and in order, with the canonical I-01...I-11 plan. Missing, extra,
   reordered, or direction-flipped entries fail the test.
2. **Live query shapes (data-model reality):** each documented query is run
   against seeded documents in the private namespace `demo-networking-indexes`.
   The tests assert the exact ordered result set, which proves that every
   indexed field path exists, is orderable, and produces the documented order.

What is still unproven: that a deployed project accepts the file. No live
Firebase project is used in this MVP, and deployment is out of scope.

---

## 4. Verification evidence

```
node --test .\tests\indexes.n2.test.mjs
  tests 20, pass 20, fail 0
```

Static subtests: strict JSON; exact plan match; no duplicates; supported keys
only; no `quizState` composite; empty `fieldOverrides`.

Live subtests: I-01...I-11 ordered result sets; I-12 single-field cooldown sweep.

### Mutation check (the guard is not vacuous)

Flipping `deletedAt` from `ASCENDING` to `DESCENDING` in the file made the suite
fail with exit code 1 and this diff:

```
+ 'accountTombstones|status:ASCENDING,deletedAt:DESCENDING'
- 'accountTombstones|status:ASCENDING,deletedAt:ASCENDING'
```

The file was then restored byte-for-byte (verified by SHA-256) and the suite
returned to 20/20.

`firestore.indexes.json` SHA-256 after restore:
`F8997BBFBC470CF6CD5DDF5D23A12FFCECC0C4DB7F0E205DA5D143E609DC3B6E`.

### Isolation

The index suite runs in `demo-networking-indexes` and clears only that
namespace. `fixtures:verify` is 17/17 before and after a run.

---

## 5. TTL policies (not expressible in this file)

Firestore TTL is a project-level field policy, not part of
`firestore.indexes.json` and not part of `firebase.json`. The intended policies
from `data-model.md` section 10:

| Path | Field | Retention |
|---|---|---|
| `users/{uid}/idempotency/{keyHash}` | `expiresAt` | 24 hours |
| `users/{uid}/attempts/{attemptId}` | - | no TTL in MVP (D-04) |
| `accountTombstones/{uid}` | - | permanent |
| `adminAudit/{eventId}` | - | no TTL in MVP |

Enabling TTL requires a deployed project, for example:

```powershell
gcloud firestore fields ttls update expiresAt `
  --collection-group=idempotency `
  --enable-ttl `
  --project=<project-id>
```

This is recorded as an operational step, not performed (no deployed project).

---

## 6. Migrations

Firestore is schemaless, so there is no schema migration file for the MVP.
The migration mechanisms are:

- **Content:** versioned documents under `contentVersions/{v}` plus the single
  `system/publishedContentVersion` pointer. Publish and rollback are atomic
  pointer writes (`data-model.md` section 9); no document rewrite is needed.
- **Retention:** keep the active version and two predecessors (D-04); purge is a
  manual/admin job that writes an `adminAudit` event.
- **Deletion:** `accountTombstones` blocks resurrection; purge order is
  Auth -> user data -> tombstone retention. This is verified by the N2-07 suite
  (`backend\tests\lifecycle.n2.test.mjs`, `backend\docs\lifecycle-n2.md`).
- **Field changes:** add fields with defaults on read; never rename or reuse an
  ID (`schema-lock.md` section 2). A breaking content change is a new version.

No migration script is added or required by N2-06.

---

## 7. Reproduce

```powershell
# 0. Emulators (skip if 9099/8080/5001 are listening)
Get-NetTCPConnection -LocalPort 9099,8080,5001 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort
cd E:\Graduation_Project2\networking-fundamentals\backend
firebase emulators:start --only auth,firestore,functions --project demo-networking-p1

# 1. Index contract + query shapes (20/20)
cd E:\Graduation_Project2\networking-fundamentals\backend
node --test .\tests\indexes.n2.test.mjs

# 2. Full 8-file regression at the N2-06 gate (134 + 20)
node --test .\tests\api-contract.http.test.mjs .\tests\auth.http.test.mjs .\tests\health.http.test.mjs .\tests\firestore.rules.test.mjs .\tests\firestore.rules.n2.test.mjs .\tests\indexes.n2.test.mjs .\functions\tests\api-contract.test.cjs .\functions\tests\authorization.http.test.cjs
```

Expected: index suite 20/20; combined 154/154; build and lint clean; fixtures
19/19 and verify 17/17 after reseed. After N2-07 adds the 23-test lifecycle
suite the gate is **177/177**; these N2-06 numbers are historical.

---

## 8. Remaining risks

- **Not deployed.** The file is valid and tested locally, but no deployed
  project accepted it. Deployment is out of MVP scope.
- **Emulator does not enforce indexes.** Static plan match is the only
  index-existence evidence until a deployed check is possible.
- **Queries not yet in Functions.** The course/quiz screens that will issue
  these queries are not built. If a screen later uses a different shape, the
  index must be revised in the same change.
- **I-01** must keep `type` as an equality filter. A query that orders by
  `order` without the `type` equality needs `(courseId, order)` instead.
- **TTL** is documented but not enabled (requires a deployed project).
