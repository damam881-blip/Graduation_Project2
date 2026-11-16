# N3-02 - Approved-Content Read Path

**Task:** N3-02 - public approved-content reads, versioned results, guest visibility, and locked-course restrictions.
**Status:** implemented and verified (contract + conformance suite).
**Decision:** **D-09** - the Flutter client reads approved content with the **Firebase client SDK** under the N2-04 rules. N3 adds **no** Functions read endpoints (`getCourses`/`getLessons` are the confirmed alternative).
**Rules:** unchanged by this task (`backend\firestore.rules`).
**Suite:** `backend\tests\content-read.n3.test.mjs` (34 tests, namespace `demo-networking-contentread`).
**Prerequisite:** Firestore emulator on `127.0.0.1:8080`.

---

## 1. Before / after

| Item | Before (N2-04/N2-05) | After (N3-02) |
|---|---|---|
| Read design | Rules allowed reads; no client sequence defined | Exact query sequence, ordering, and lock evaluation specified |
| Version handling | `contentVersion` on documents | Pointer-anchored result contract + stale-item rule |
| Guest scope | Enforced by rules | Enforced and proven for catalog, course-01, locked courses |
| Quiz lists | Known to require `courseId` | Documented + proven; final quiz uses `finalQuizId` |
| Lesson lists | Path-scoped rule | Clarified: no `where` needed; collection-group queries fail closed |
| Read suite | None | 34 tests (guest, free student, unlocked student, version integrity) |

No schema, rules, index, or Functions change.

---

## 2. Read sequence

Every read is anchored to the active pointer. The client must not hard-code `v001`.

1. **Resolve the active version**
   `system/publishedContentVersion` -> `contentVersion`, `formatVersion`.
   Public read; no write. A missing pointer denies all content (fail-closed).
2. **Validate the version document**
   `contentVersions/{contentVersion}` -> `status` must be `"published"`.
   `formatVersion` must be `1`; an unknown value must be rejected, not partially parsed.
3. **Read the catalog (all six courses)**
   Query `contentVersions/{contentVersion}/courses` ordered by `order` ascending.
   Course metadata is public even for locked courses, so guests can see what exists.
4. **Evaluate locks**
   - Guest: only `course-01` is open.
   - Signed-in: read `users/{uid}/courseProgress/{courseId}`; `status != "locked"` means open.
     A missing document means locked (the rules fail closed).
   - Never infer unlocks from the catalog or from local state.
5. **Read an open course's lessons**
   Query `contentVersions/{contentVersion}/courses/{courseId}/lessons` ordered by `order` ascending.
   The course is in the path, so no `where("courseId")` is required.
6. **Read quizzes**
   - Lesson quizzes: query `contentVersions/{contentVersion}/quizzes` with
     `where("courseId", "==", courseId)`, `where("type", "==", "lesson")`, `orderBy("order")`.
     The `courseId` filter is mandatory: the collection is top-level, so rules cannot infer the course.
   - Final quiz: direct get of `contentVersions/{contentVersion}/quizzes/{courses/{courseId}.finalQuizId}`.
   - Never list the whole `quizzes` collection.

`quizBanks/**`, `aiSections/**`, and `.../private/**` are never readable by clients.

---

## 3. Query shapes and index map

| Read | Query | Index |
|---|---|---|
| Catalog | `courses` `orderBy("order")` | automatic single-field |
| Lessons | `courses/{c}/lessons` `orderBy("order")` | automatic single-field (path-scoped) |
| Lesson quizzes | `quizzes` `where(courseId==c)` + `where(type=="lesson")` + `orderBy("order")` | I-01 |
| Final quiz | direct `get` by `finalQuizId` | none |
| Unlock check | direct `get` of own `courseProgress/{c}` | none |

If a future screen needs a different shape (for example a collection-group lesson list), the index plan and this contract must be revised in the same change. Collection-group lesson queries are denied by the rules because no course ID is bound.

---

## 4. Versioned result contract

Direct SDK reads have no HTTP envelope. The client projects them into one logical result:

```
ContentReadResult<T> = {
  contentVersion: string,   // from system/publishedContentVersion
  formatVersion: number,    // from contentVersions/{contentVersion}
  items: T[]                // documents in `order` order
}
```

Rules:

1. `contentVersion` and `formatVersion` are copied from the pointer and version document, never guessed.
2. Reject `formatVersion != 1`. Do not render a partially understood version.
3. Discard any item whose own `contentVersion` differs from the active pointer, then invalidate the cache and re-resolve. This is the stale-cache guard.
4. MVP limits: 6 courses, 2 lessons per course, 3 quizzes per course. There is no pagination; a larger result means the contract changed and must be reviewed.
5. Ordering is `order` ascending only. IDs are stable but are not the display order.

---

## 5. Guest / locked matrix (proven)

| Read | Guest | Signed-in, no progress | Signed-in, course-02 unlocked |
|---|---|---|---|
| Pointer, version metadata | allow | allow | allow |
| Catalog (6 courses) | allow | allow | allow |
| course-01 lessons/quizzes | allow | allow | allow |
| course-02 lessons/quizzes | deny | deny | **allow** |
| course-03 while `status == "locked"` | deny | deny | deny |
| staging/archived version | deny | deny | deny |
| banks, AI sections, checkpoint keys | deny | deny | deny |
| writes (content, progress) | deny | deny | deny |

A denial is the expected result for locked content; it is not an application error.

---

## 6. Error handling

| Observed | Meaning | Client action |
|---|---|---|
| `permission-denied` on a lesson/quiz path | course is locked or content is server-only | show the unlock requirement or hide the surface; do not retry |
| `permission-denied` on the pointer/catalog | content configuration fault | fail closed with "content unavailable"; do not fall back to hard-coded data |
| `unavailable` / offline | network | serve the last verified cache (N3-06) and revalidate on reconnect |
| pointer missing / `formatVersion` unknown | invalid deployment | fail closed |

---

## 7. Verification evidence

```
node --test .\tests\content-read.n3.test.mjs
  tests 34, pass 34, fail 0
```

The suite seeds its own namespace and proves:

- pointer/version resolution, staging and archived denial;
- catalog order and `contentVersion` on every item;
- course-01 lesson/quiz lists, direct lesson read, final quiz via `finalQuizId`;
- guest and no-progress denial for course-02; unlocked course-02 success;
- locked course-03 denial even for an unlocked student;
- banks, AI sections, checkpoint keys, cross-user progress, and writes denied;
- unconstrained quiz lists and collection-group lesson queries fail closed;
- a missing pointer denies all content;
- non-active version paths are denied.

Fixture isolation: the suite uses `demo-networking-contentread` and never seeds or clears `demo-networking-p1`.

---

## 8. Acceptance criteria

| Criterion | Evidence | Status |
|---|---|---|
| Public approved-content reads | catalog + course-01 tests | PASS |
| Versioned results | pointer/`formatVersion`/per-item tests | PASS |
| Guest visibility | guest matrix tests | PASS |
| Locked-course restrictions | guest, no-progress, locked course-03 | PASS |
| Confirmed alternative to `getCourses`/`getLessons` | D-09 in `data-model.md` §14 and `api-contract.md` §8 | PASS |
| No protected data exposed | bank/AI/private denials | PASS |
| No schema/rules/index change | this task adds docs + tests only | PASS |

---

## 9. Not done / remaining risks

- **Flutter implementation is N3-06.** This task defines and proves the backend read contract; no Dart code exists yet.
- **Local cache and offline read are N3-06.** This document only defines invalidation (`contentVersion` mismatch).
- No Functions read endpoints by D-09; adding one later is a contract change requiring a new decision.
- The emulator does not enforce composite indexes; I-01 shape is proven live, index existence rests on the N2-06 static plan.
- No deployed project; deployed rules/index verification is out of MVP scope.
