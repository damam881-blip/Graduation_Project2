# N3-03 - Git-Managed Bilingual Content

This directory is the single source of truth for **public approved content**.
The validated importer (N3-04) reads it; `backend\functions\scripts\catalog.cjs`
reads `catalog.json` directly; the Flutter app reads the imported Firestore
documents through the N3-02 read contract.

Everything here is UTF-8 without a BOM and ends with a trailing newline.

---

## 1. Layout

```
content/
  manifest.json            version, languages, and the full file list
  catalog.json             compact course/lesson catalog (single catalog source)
  courses/course-0N.json   course metadata (6 files)
  lessons/lesson-0N-0M.json  lesson content (12 files)
  media/*.svg              public image assets
  README.md                this document (not imported)
```

| File | Imported? | Purpose |
|---|---|---|
| `manifest.json` | metadata only | declares `contentVersion`, `formatVersion`, languages, and every file |
| `catalog.json` | yes | course/lesson titles and order for the catalog screen |
| `courses/*.json` | yes | course documents under `contentVersions/{v}/courses` |
| `lessons/*.json` | yes | lesson documents under `.../courses/{courseId}/lessons` |
| `media/*.svg` | yes (uploaded) | referenced by `image` sections; must also appear in the manifest |
| `README.md` | no | authoring rules |

`contentVersion` is `v003` and `formatVersion` is `1` for this tree. Every
course and lesson file carries the same `contentVersion`, so a partially
updated tree is detectable at import time.

---

## 2. Content tiers (hard boundary)

| Tier | Where it lives | Client-readable? |
|---|---|---|
| Public approved content | this directory | yes, under the N2-04 rules |
| Server-only approved content | AI source sections, maintained outside this tree | no |
| Protected assessment data | quiz banks, answer keys, explanations | **never** |

**This tree must never contain** quiz-bank questions, `correctOptionId`,
`correctOptionIds`, `explanation`, `review`, `quizBank`, `checkpointKey`, or a
`questions` array. The checkpoint carries only the question and its options;
the correct option lives in the server-only checkpoint key written by N3-04.

`tests\content.n3.test.mjs` scans every JSON file here and fails if any of
those tokens appears. Do not add an exclusion; move the data instead.

---

## 3. Authoring rules

1. **Bilingual by construction.** Every user-visible string is an object with
   non-empty `en` and `ar` values: titles, descriptions, summaries, section
   text, alt text, captions, video fallbacks, checkpoint questions, options.
2. **IDs are permanent.** Follow `docs\schema-lock.md` section 2:
   `course-0N`, `lesson-0N-0M`, `quiz-c0N-l0M`, `quiz-c0N-final`, `sec-0N`,
   `cp-01`, option IDs `a`..`f`. Never renumber or recycle an ID; retire a
   lesson by omitting it from the next version.
3. **Order is explicit.** `order` is 1-based, unique, and contiguous within a
   course (courses, lessons) or within a lesson (sections).
4. **No protected data.** See section 2.
5. **Media is declared.** Every `image` section's `asset` must exist under
   `media\` and be listed in `manifest.json`. Use relative POSIX paths.
6. **Video needs a fallback.** `provider` is `youtube`, `videoId` is exactly
   11 characters, and `fallback` is a bilingual sentence shown when the video
   cannot play (FR-08). The placeholder ID here is intentionally unavailable,
   which exercises the fallback path.
7. **Markdown is inline.** Lesson bodies are Markdown strings inside `text`
   and `example` sections; there are no separate `.md` lesson files. Keep
   links absolute or project-relative and never embed HTML.
8. **Size caps.** Course file <= 4 KB, lesson file <= 16 KB, catalog <= 32 KB,
   manifest <= 4 KB. Split a lesson rather than growing past the cap.

---

## 4. Source to Firestore mapping (N3-04)

| Content field | Firestore path/field |
|---|---|
| `courses/{id}.json` | `contentVersions/{v}/courses/{courseId}` |
| `lessons/{id}.json` | `contentVersions/{v}/courses/{courseId}/lessons/{lessonId}` |
| `catalog.json` | used to build both of the above and the manifest counts |
| section `asset` | `imageUrl` (uploaded asset URL) |
| section `videoId` + `provider` | `videoUrl` (`https://www.youtube.com/watch?v={videoId}`) |
| section `fallback` | `fallback` (kept verbatim) |
| `checkpoint` | public `checkpoint` field, unchanged |
| `contentVersion` | copied to every document |

The importer validates first, then writes. It never substitutes defaults for a
missing bilingual field.

---

## 5. Validation

Run from `backend`:

```powershell
node --test .\tests\content.n3.test.mjs
```

The suite checks the manifest, counts, UTF-8/no-BOM, ID grammars, uniqueness,
reference integrity, section shapes, bilingual fields, media existence and
manifest agreement, video fallback, the checkpoint projection, the protected
token scan, size caps, catalog agreement, and the `catalog.cjs` loader.

Any new content file must be added to `manifest.json` (and to `catalog.json`
when it is a course or lesson) or the suite fails on the orphan/shortfall
check.

---

## 6. Versioning

- Bump `contentVersion` (`v004`, `v005`, ...) for any published change.
- Keep the previous version readable until every active client has moved.
- `formatVersion` changes only for a breaking schema change; the client rejects
  an unknown value (N3-02 section 4).
- Publishing and rollback are N3-04; this tree only defines the bytes.
