# N3-03 - Git-Managed Bilingual Content

**Task:** N3-03 - store the approved bilingual course content in Git with stable IDs, a `contentVersion`, public media, a YouTube fallback, and no protected assessment data.
**Status:** implemented and verified.
**Tree:** `backend\content\` (22 files: manifest, catalog, 6 courses, 12 lessons, 2 SVGs).
**Validator:** `backend\tests\content.n3.test.mjs` (19 tests; no emulator required).
**Tier rules:** `backend\content\README.md`.
**Catalog contract:** `backend\docs\catalog-n3.md`.
**Read contract:** `backend\docs\content-read-n3.md` (D-09).
**Prerequisite:** none (static validation).

---

## 1. Before / after

| Item | Before (N3-01/N3-02) | After (N3-03) |
|---|---|---|
| Content source | Catalog literals inside `scripts\catalog.cjs`; fixtures seeded placeholder sections | Git tree in `backend\content`; catalog is a loader over `content\catalog.json` |
| Languages | English + Arabic names only | Full bilingual lesson bodies, checkpoints, captions, fallbacks |
| Lesson bodies | Placeholder sections built by the fixture script | 12 authored lessons, 3 sections each, Markdown-in-JSON |
| Media | None | 2 deterministic SVGs, declared in the manifest |
| Video | None | 1 YouTube section with a bilingual fallback (FR-08) |
| Versioning | `v001` used by rules tests | `v003`, `formatVersion: 1`, declared in the manifest |
| Protected data | Rules-only guarantee | Machine-checked: public tree cannot contain answer keys |
| Validation | Catalog shape only | 19-test byte/schema/reference/protection suite |

No schema, rules, index, or Functions source change. `catalog.cjs` now reads the tree instead of duplicating it.

---

## 2. Layout and single source

```
backend\content\
  manifest.json               contentVersion v003, formatVersion 1, languages, file list
  catalog.json                compact course/lesson catalog consumed by catalog.cjs
  courses\course-01..06.json  course metadata, finalQuizId, lessonIds
  lessons\lesson-NN-NN.json   sections, checkpoint question, quizId
  media\network-diagram.svg   referenced by lesson-01-01
  media\ipv4-octets.svg       referenced by lesson-02-01
  README.md                   authoring rules (not imported)
```

`functions\scripts\catalog.cjs` requires `../../content/catalog.json` and maps
the `{en, ar}` objects to the `[en, ar]` arrays used by the fixture seeder and
the N3-01 catalog tests. `tests\content.n3.test.mjs` asserts that this loader
returns exactly the tree's data, so the catalog cannot drift.

The tree has 6 courses x 2 lessons = 12 lessons, matching the locked catalog.
Course and lesson IDs, order, and English/Arabic titles are unchanged from
N3-01 (D-10); only new fields (sections, checkpoint, media, version) were added.

---

## 3. Content tiers

| Tier | Contents | Storage | Client access |
|---|---|---|---|
| Public approved content | course/lesson metadata, Markdown bodies, images, video refs, checkpoint question + options | this tree -> `contentVersions/**` | read under N2-04 rules |
| Server-only approved content | AI source sections | outside this tree; exporter is N3-05 | denied |
| Protected assessment data | quiz-bank questions, `correctOptionIds`, explanations, checkpoint key | outside this tree; importer is N3-04 | always denied |

The public tree deliberately includes the checkpoint **question and options**
but not the correct option. The correct option is written by N3-04 to
`.../lessons/{lessonId}/private/checkpointKey`, which N2-04 denies to every
client and N3-02 proves is denied.

**Machine-checked rule:** `content.n3.test.mjs` scans every JSON file for
`correctOptionId(s)`, `explanation`, `quizBank`, `checkpointKey`, `answerKey`,
`review`, and a `"questions"` array. Any match fails the suite. There is no
allow-list, so protected data cannot be added to this tree by accident.

---

## 4. Lesson schema (public projection)

Each lesson file maps one-to-one to
`contentVersions/{v}/courses/{courseId}/lessons/{lessonId}` (data-model section 5.4):

| Content field | Firestore field | Notes |
|---|---|---|
| `lessonId`, `courseId`, `order` | same | doc ID equals `lessonId` |
| `title`, `summary` | same | `{en, ar}` |
| `estimatedMinutes` | same | positive integer |
| `sections[]` | same | ordered; see below |
| `checkpoint` | same | question + options only |
| `quizId` | same | `quiz-cNN-l0M` |
| `status` | same | `"approved"` |
| `contentVersion` | same | `v003` |

**Section shapes**

| `type` | Required keys |
|---|---|
| `text` | `order`, `sectionId`, `type`, `text {en, ar}` |
| `example` | `order`, `sectionId`, `type`, `text {en, ar}` |
| `image` | `order`, `sectionId`, `type`, `asset`, `alt {en, ar}`, `caption {en, ar}` |
| `video` | `order`, `sectionId`, `type`, `provider`, `videoId`, `unlisted`, `caption {en, ar}`, `fallback {en, ar}` |

**Checkpoint shape:** `checkpointId` (`cp-01`), `afterSectionId`, `question
{en, ar}`, `options[2..6]` (`optionId` `a`..`f`, `text {en, ar}`),
`maxRetries: null`. No answer field.

Every lesson has at least one `text` section and at most one media block, so a
lesson stays readable if the media fails.

---

## 5. Media and video policy

- Images are local SVGs under `media\`, declared in `manifest.media`, and
  referenced by relative POSIX `asset` paths. A media file that is not
  referenced fails the agreement check, and a referenced asset that is missing
  or undeclared fails the suite.
- SVGs must start with `<svg`, declare the SVG namespace and a `viewBox`, end
  with `</svg>`, and contain no `<script`.
- Video sections use `provider: "youtube"` and an 11-character `videoId`.
  `unlisted: true` records that the video is not publicly listed.
- The sample `videoId` (`00000000000`) is intentionally unavailable. It
  exercises FR-08: the bilingual `fallback` is shown when the player cannot
  load. N3-04 maps `provider` + `videoId` to `videoUrl`; the client must use
  `fallback` on error.
- `caption` is required for both media types so the content is usable without
  the media and screen readers have a label.

---

## 6. Source to Firestore mapping (for N3-04)

| Source | Target |
|---|---|
| `courses/{courseId}.json` | `contentVersions/{v}/courses/{courseId}` |
| `lessons/{lessonId}.json` | `contentVersions/{v}/courses/{courseId}/lessons/{lessonId}` |
| section `asset` | `imageUrl` after upload (keep `sectionId`, `alt`, `caption`) |
| section `videoId` + `provider` | `videoUrl` = `https://www.youtube.com/watch?v={videoId}` |
| checkpoint | public `checkpoint` field, unchanged |
| version metadata | `contentVersions/{v}` (`status`, counts) and `system/publishedContentVersion` |

N3-04 owns: schema validation before write, asset upload, bank/checkpoint-key
writes to server-only paths, publish/rollback, and pointer movement. N3-03 only
defines the bytes and proves they are safe to import.

---

## 7. contentVersion and formatVersion

- This tree is `contentVersion: "v003"` with `formatVersion: 1`.
- The version is declared once in `manifest.json` and copied into every course
  and lesson file; the suite rejects a mismatch.
- The Flutter client resolves the active version from
  `system/publishedContentVersion` at runtime (N3-02) and must never hard-code
  `v003`.
- `formatVersion` changes only for a breaking schema change. An unknown value
  is rejected by the client rather than partially rendered.
- A new publish is a new directory (`v004`, ...); IDs are never reused.

---

## 8. Verification evidence

```
node --test .\tests\content.n3.test.mjs
  tests 19, pass 19, fail 0
```

The suite proves:

1. manifest `v003` / `formatVersion 1` / `en,ar`;
2. every manifest path exists and the tree has no orphan files;
3. all 22 files are UTF-8 without BOM, LF-only, newline-terminated;
4. course schema, order, `finalQuizId`, and locked IDs;
5. lesson schema, course ownership, order, and `quizId`;
6. contiguous unique section IDs per lesson;
7. section types and their required keys;
8. text presence and the one-media limit;
9. image existence, manifest agreement, and SVG shape;
10. YouTube ID format, unlisted flag, bilingual caption and fallback;
11. checkpoint public-only projection and option rules;
12. no protected assessment token in any JSON file;
13. `catalog.json` equals the course and lesson files;
14. no reused course/lesson/quiz/option ID;
15. schema-lock ID grammars;
16. every bilingual pair is complete and free of placeholders;
17. per-file size caps (4 KB course, 16 KB lesson, 32 KB catalog);
18. `catalog.cjs` derives exactly this tree.

Fixture isolation: the suite reads files only and never touches an emulator
namespace, so `demo-networking-p1` is unaffected.

---

## 9. Acceptance criteria

| Criterion | Evidence | Status |
|---|---|---|
| Content stored in Git | 22 files under `backend\content` | PASS |
| Unique stable IDs | ID grammar + uniqueness subtests | PASS |
| `contentVersion` | manifest + per-document + mismatch checks | PASS |
| Bilingual EN/AR | recursive bilingual-pair check | PASS |
| Media + YouTube fallback | image/video subtests | PASS |
| No protected bank data | token scan + checkpoint projection | PASS |
| Single catalog source | `catalog.cjs` loader test | PASS |
| No schema/rules/index change | this task adds content, tests, docs only | PASS |

---

## 10. Not done / remaining risks

- **Import, upload, publish, and rollback are N3-04.** The tree is not yet in
  Firestore; fixtures still seed placeholder sections until N3-04.
- **AI source sections are N3-05.** They are intentionally absent here.
- **Flutter rendering is N3-06.** The client must render Markdown safely and
  show `fallback` on video error.
- The placeholder `videoId` is unavailable by design; a real course video must
  be supplied before N3-07 review.
- Arabic copy here is authored but not yet reviewed by a native speaker; N3-07
  is the review gate.
- No deployment and no git history in this environment; the tree is
  Git-ready but not committed.
