# Firestore Rules — N2-04

**Task:** replace the deny-all rules with least-privilege client access
**File:** `backend\firestore.rules`
**Inputs:** [`schema-lock.md`](./schema-lock.md) §5, [`data-model.md`](./data-model.md) §11/§14, [`fixtures-n2.md`](./fixtures-n2.md)
**Status:** implemented, probed, and covered by the durable N2-05 suite
**Not changed:** `functions\src\index.ts`, `auth.ts`, `authorization.ts`, `firestore.indexes.json`, existing tests

---

## 1. Policy map

| Path | Anonymous | Signed-in owner | Client write | Enforced by |
|---|---|---|---|---|
| `system/publishedContentVersion` | read | read | no | pointer rule |
| `contentVersions/{v}` | active only | active only | no | `activeVersion()` |
| `.../courses/{c}` | active only | active only | no | `activeVersion()` |
| `.../lessons/{l}` | `course-01` only | unlocked courses | no | `activeVersion()` + `courseUnlocked()` |
| `.../lessons/{l}/private/**` | no | no | no | explicit deny |
| `.../quizzes/{q}` | `course-01` only | unlocked courses | no | `courseUnlocked(resource.data.courseId)` |
| `.../quizBanks/**` | no | no | no | explicit deny |
| `.../aiSections/{s}` | no | no | no | explicit deny |
| `users/{uid}` | no | own read; two-field update | see §2 | owner predicate |
| `users/{uid}/courseProgress/{c}` | no | own read | no | path UID |
| `users/{uid}/lessonProgress/{l}` | no | own read | no | path UID |
| `users/{uid}/attempts/{a}` | no | no | no | server-only (D-01) |
| `users/{uid}/quizState/{q}` | no | no | no | server-only |
| `users/{uid}/idempotency/{k}` | no | no | no | server-only |
| `accountTombstones/{uid}` | no | no | no | server-only |
| `adminAudit/{e}` | no | no | no | server-only |
| anything else | no | no | no | catch-all deny |

The Functions backend uses the Admin SDK, which bypasses rules; no endpoint behavior changes.

## 2. Profile update predicate

An owner may update only while `resource.data.status == "active"`, and the changed-key set must be exactly a subset of `displayName` / `preferredLanguage`. `displayName` must be a string ≤ 80 chars; `preferredLanguage` must be `en` or `ar`. Role, status, email, uid, timestamps, and deletion fields therefore cannot be changed. The rule never reads `users.role` as a grant (D-05).

## 3. Design notes

- `activeVersion()` resolves `system/publishedContentVersion` once per evaluation. Missing pointer ⇒ `get()` fails ⇒ deny (fail-closed).
- `courseUnlocked()` is `course-01 || (signedIn && get(courseProgress).status != "locked")`. A missing progress document denies.
- Lessons get the course from the path; quizzes read `resource.data.courseId` because their path has no course segment. A broad quiz list that includes locked courses fails as a whole (rules are not filters); per-course queries work.
- `private/**`, `quizBanks/**`, and `aiSections/**` are explicitly denied even though the catch-all would deny them, so the intent is auditable.
- No rule uses `request.auth.token.role` for content access. Admin *clients* gain nothing; admin work stays in the backend.

## 4. Verification (N2-04 / N2-05)

Temporary probe (50 assertions, seeded with rules disabled, deleted after the run):

```
checks 50, pass 50, fail 0
```

Coverage: guest pointer/active version/catalog/course-01 lesson+quiz; staging hidden; locked lessons and quizzes denied; checkpoint key, bank metadata, bank questions, AI sections denied; guest profile read/write denied; owner profile read/update; role/status/email/`updatedAt`/81-char/language escalation denied; cross-user profile and progress denied; own progress writes denied; attempts/quizState/idempotency denied read+write; unlocked course-02 allowed; locked course-03 denied; disabled owner update denied; admin client denied `adminAudit`, tombstones, and banks.

Durable suite — `backend\tests\firestore.rules.n2.test.mjs`:

- Runs in its own emulator namespace (`demo-networking-rules`), so it cannot read, clear, or collide with the `demo-networking-p1` fixtures.
- Seeds a controlled dataset with rules disabled, then exercises the deny matrix.
- **91 tests, 91 pass, 0 fail.**
- Isolation evidence: `fixtures:verify` 17/17 before and after a suite run (within the 5-minute fixture freshness window).

Gates after the change:

```
npm run fixtures:test   → tests 19, pass 19, fail 0
npm run build           → tsc clean
npm run lint            → eslint clean
43-test command         → tests 43, pass 43, fail 0
npm run fixtures:verify → checks 17, pass 17, fail 0
```

Protected-file hashes: 10/11 unchanged; only `backend\firestore.rules` differs from the N2-03 baseline.

## 5. Known limitations / follow-ups

- Rules identify the caller by token UID. A disabled/deleted account with an unexpired token can still read public content and its own profile until the token expires (documented F-01). Write access to progress is already backend-only.
- `displayName` minimum length is not enforced (rule caps at 80), matching `schema-lock.md` §5.2; the backend can trim/enforce 1–80 on profile updates.
- A write that sends an immutable field with its *existing* value is a no-op and is not distinguishable from omitting it; changing any immutable field is denied.
- Quiz lists must be queried with `where("courseId", "==", …)`. An unconstrained list cannot evaluate `resource.data.courseId` and fails closed; this is also the indexed query shape (I-01 in `data-model.md` §10). Direct quiz reads work normally.
- The Firestore emulator does not enforce composite indexes; N2-06 must still verify query shapes.
- These rules are not deployed. Deployment is out of MVP scope.
