# N2-07 - Lifecycle checks: account deletion and content versions

**Task:** N2-07 - verify the deletion/tombstone sequence and the content
publish/rollback/retention contract.
**Status:** implemented and verified in the emulator; deployment and runtime
enforcement are out of scope (see section 1).
**Files added:** `backend\tests\lifecycle.n2.test.mjs` (23 tests), this document.
**Files unchanged:** `firestore.rules`, Functions source, existing tests,
`firestore.indexes.json`.

---

## 1. Scope: what is verified now and what is deferred

Normative inputs:

- `data-model.md` section 7 (account tombstones and purge order).
- `data-model.md` section 9 (atomic publish, rollback, retention).
- `schema-lock.md` V-20 (tombstone guard).

The MVP API still has only the auth/authorization endpoints. There is no
user-data mutation endpoint, publish endpoint, or purge job to call. N2-07
therefore verifies the **contract** end to end against the real rules:

| Area | Verified in N2-07 | Deferred |
|---|---|---|
| Tombstone shape and visibility | yes | - |
| Purge order | yes (intermediate states asserted) | automated job |
| Auth deletion | yes (Auth emulator) | token revocation before expiry (F-01) |
| Data purge and tombstone retention | yes | scheduled/manual retention tooling |
| V-20 runtime guard | precondition + client fail-closed | guard inside mutation endpoints (N4/N5) |
| Publish atomicity | yes (transaction + visibility) | publish endpoint (N4/N5) |
| Rollback | yes | rollback endpoint (N4/N5) |
| Retention policy | reference algorithm + tests | purge job |
| Staging/archived/rolledBack invisibility | yes | - |
| Pinned-attempt grading | yes (Admin path) | grading endpoint |

Administrative steps run through the rules-disabled test context, which is the
test equivalent of the Functions Admin SDK. Client visibility is checked
against the real `firestore.rules`.

---

## 2. Account deletion sequence (data-model section 7)

Purge order: **tombstone -> profile `status = "deleted"` -> Auth deletion ->
private subcollections -> profile document -> tombstone `status = "purged"`**.
The tombstone is never deleted.

The suite creates a real Auth user (Auth emulator REST API), seeds the profile
and all five private subcollections, then performs the sequence and asserts the
state after each step.

| Step | Assertion in the suite |
|---|---|
| Tombstone written first | Tombstone exists with `uid`, `requestedAt`, `deletedAt`, `purgeAfter`, `reason`, `requestId`; `authDeletedAt`/`purgedAt` are null. The profile is still `active` and Auth sign-in still works. |
| Profile marked deleted | Profile `status == "deleted"`. The owner may still read it, but `displayName` and `role` updates are denied. Private data still exists. |
| Auth account deleted | Sign-in with the same email fails; the attempt document still exists, proving Auth was removed before data. |
| Private data purged | `courseProgress`, `lessonProgress`, `attempts`, `quizState`, `idempotency` are all empty. |
| Profile document removed | Profile read returns no document. |
| Tombstone retained | `status == "purged"`, `purgedAt`/`authDeletedAt` set, `uid` unchanged. |
| Other accounts untouched | The live and student profiles and their progress remain intact. |

### Client rules during and after deletion

- Guests, students, and even an `admin` custom-claim client cannot read, list,
  create, update, or delete tombstones.
- Clients cannot create a profile or delete one.
- After the purge, the deleted account's unexpired test token can still read its
  own path by rule, but the document is gone (`exists() == false`); every write
  is denied. This is the documented F-01 expiry-window behavior, not a
  resurrection path.
- A client cannot recreate the profile or a progress document for the purged
  UID.

### V-20 status

V-20 says: if `accountTombstones/{uid}` exists, every user-data mutation fails
closed. The guard belongs inside the future mutation transactions. Today the
only user-data write surface is the two-field profile update, which the rules
already restrict; the API has no other mutation endpoints. N2-07 proves the
precondition (tombstone-first) and the client fail-closed behavior. The
transactional guard is **not implemented** and must be added with the mutation
endpoints in N4/N5. This is a scope gap, not a regression.

---

## 3. Content publish, rollback, and retention (data-model section 9)

The suite seeds `v001` (published), `v002` (staging), `v003` (archived), `v004`
(rolledBack, pinned by an active attempt), and `v005` (staging), then runs the
documented sequences in transactions.

| Check | Result |
|---|---|
| Guest reads pointer and v001 course/lesson/quiz | allowed |
| Guest reads staging v002 (doc, course, lesson, quiz) | denied |
| Guest reads archived v003 / rolledBack v004 | denied |
| Client writes pointer or content | denied |
| Publish v002 | pointer -> v002, `previousContentVersion == "v001"`, v002 `published`, v001 `archived`; guest sees v002 and no longer sees v001 |
| Failed publish transaction | injected throw; pointer stays v002, v005 stays `staging` |
| Publish v005, then rollback to v002 | pointer -> v002; v005 `rolledBack`; v002 `published`; guest sees v002 and not v005 |
| Pinned grading | Admin (rules-disabled) reads v004 and v005 content; guests cannot |
| Retention | never purges the active version, the two most recent historical versions, or a version pinned by an active attempt; staging imports are purgeable |

### Retention policy (reference algorithm)

`retentionPlan(versions, activeRefs)` in the suite implements section 9.3:

1. Keep the version whose `status == "published"`.
2. Keep the two most recent `archived`/`rolledBack` versions.
3. Keep every version referenced by an `active` attempt.
4. Everything else, including staging imports, is purgeable.

Tested cases: active + four predecessors -> purge the two oldest; a pinned old
version is exempt; a staging import is purgeable; with no published version only
pins survive; pins are derived from a real collection-group query over active
attempts. The automated purge job is **not implemented**; this is the executable
reference for it.

---

## 4. Verification evidence

```
node --test .\tests\lifecycle.n2.test.mjs
  tests 23, pass 23, fail 0
```

Combined regression (9 files):

```
  tests 177, pass 177, fail 0
```

```
build           -> tsc clean
lint            -> eslint clean
fixtures:test   -> 19/19
fixtures:verify -> 17/17 before and after the lifecycle suite
```

### Mutation check

Widening the `contentVersions/{versionId}` read rule to `if true` made the suite
fail (exit 1) on three checks: staging v002, archived/rolledBack v003/v004, and
post-publish v001 visibility. The rule file was restored by hash and the suite
returned to 23/23. This proves the visibility checks are not vacuous.

### Isolation

The suite runs in `demo-networking-lifecycle`, creates and deletes its own Auth
user, and clears only its Firestore namespace. It never reads or writes the
`demo-networking-p1` fixtures. `fixtures:verify` was 17/17 before and after.

---

## 5. Findings

1. **Tombstone-first is observable.** After the tombstone write, both the
   profile and the Auth account still exist, so the sequence cannot be
   accidentally reordered without failing the test.
2. **Rollback keeps grading possible.** The bad version is invisible to clients
   but still readable through the Admin path, matching the pinned-attempt rule.
3. **No retention/purge automation exists.** The policy is verified as an
   algorithm, but nothing runs it. Treat "last three versions" as a documented
   operational rule until the purge job lands.
4. **V-20 has no runtime surface yet.** Do not claim it is enforced. Add the
   tombstone guard to the first mutation transaction in N4/N5 and extend this
   suite.
5. **Fixture coverage is v001 + v002 only.** Rollback and three-version
   retention require synthetic versions; the suite provides them rather than
   changing the 424-document fixture set.

---

## 6. Reproduce

```powershell
# 0. Emulators (skip if 9099/8080/5001 are listening)
Get-NetTCPConnection -LocalPort 9099,8080,5001 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort
cd E:\Graduation_Project2\networking-fundamentals\backend
firebase emulators:start --only auth,firestore,functions --project demo-networking-p1

# 1. Lifecycle suite (23/23)
cd E:\Graduation_Project2\networking-fundamentals\backend
node --test .\tests\lifecycle.n2.test.mjs

# 2. Build, lint, fixtures
cd functions
npm run build
npm run lint
npm run fixtures:test          # 19/19
npm run fixtures:seed

# 3. Full regression (177/177)
cd ..
node --test .\tests\api-contract.http.test.mjs .\tests\auth.http.test.mjs .\tests\health.http.test.mjs .\tests\firestore.rules.test.mjs .\tests\firestore.rules.n2.test.mjs .\tests\indexes.n2.test.mjs .\tests\lifecycle.n2.test.mjs .\functions\tests\api-contract.test.cjs .\functions\tests\authorization.http.test.cjs

# 4. Re-verify fixtures
cd functions
npm run fixtures:verify        # 17/17
```

---

## 7. Remaining risks

- **V-20 guard not implemented** (no mutation endpoints yet). Highest-priority
  item for N4/N5.
- **Retention and purge are manual.** No scheduled job; the algorithm is tested
  but not running.
- **Auth tokens remain valid until expiry** after account deletion (F-01). The
  profile is gone and all writes are denied, but reads of still-existing public
  content remain possible with an unexpired token.
- **No deployed verification.** Rules, indexes, and these sequences were tested
  only against the emulator.
- Transaction atomicity is Firestore's guarantee; the suite proves the
  documented two-document write produces the expected visibility, not that a
  future endpoint uses the same transaction.
