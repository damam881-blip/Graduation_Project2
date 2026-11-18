# N3-05 - Approved AI Knowledge Exporter

This document is the contract for `functions/scripts/ai-export.cjs` (pure
validation/build + Admin SDK write helpers) and `functions/scripts/export-ai.cjs`
(the CLI). It implements data-model §5.9 and schema-lock V-11.

**Status:** implemented and verified (2026-11-18).

---

## 1. Before / after

| Item | Before | After |
|---|---|---|
| AI source in imported versions | none for `v004`; only fixture placeholders in `v001` | generated from the published version's approved lesson prose |
| Answer-key boundary | documented (V-10/V-11) | enforced by an export validator before any write |
| Version pin | documented | active pointer resolved, version status must be `published` |
| Client read path | D-09 direct SDK reads | **unchanged**; `aiSections/**` still denied by rules |
| External AI | forbidden | still none; this is a local, server-side export |

No schema, index, `firestore.rules`, Functions endpoint, or D-09 read-path
change is made by N3-05.

---

## 2. One command at a time

Run from `networking-fundamentals/backend/functions`:

```powershell
node scripts/export-ai.cjs validate --version v001
node scripts/export-ai.cjs export --version v001
node scripts/export-ai.cjs preview --version v001
```

Options: `--version` (defaults to `system/publishedContentVersion.contentVersion`),
`--project` (defaults to `demo-networking-p1`). `validate` and `preview` are
read-only. `export` writes only under
`contentVersions/{version}/aiSections/{sectionId}`.

Validation/write failures print JSON errors and exit with code 2. Unexpected
errors exit with code 1. Re-running `export` writes the same documents and the
same checksum (idempotent); it does not delete stale section IDs.

---

## 3. Source and trust boundary

The exporter reads only path-scoped course and lesson documents from one
published version:

- `contentVersions/{version}/courses/{courseId}`
- `contentVersions/{version}/courses/{courseId}/lessons/{lessonId}`

It never reads `quizBanks/**`, `.../private/**`, checkpoint keys, or the
protected CSV sources. Public lesson metadata such as `quizId` and `checkpoint`
may exist in the source document but is **ignored**, never copied.

`buildAiSections()` fails closed when:

- the version ID does not match `^v\d{3}$` or the version is not `published`;
- a course or lesson is not `approved` or carries a different `contentVersion`;
- a bilingual title or summary is missing, or a lesson has no approved prose
  in either language;
- a source document contains `correctOptionId(s)`, `correctAnswer(s)`,
  `explanation`, `review`, `quizBank(s)`, or `bankSize`;
- a generated section contains any assessment key, a `quiz-c0N-...` ID, or a
  correct-answer/explanation token;
- an AI section ID or language is invalid, or a section ID is duplicated.

The generated section contains exactly the §5.9 fields:

| Field | Rule |
|---|---|
| `sectionId` | `ai-c0N-l0M-001` (en) or `-002` (ar) |
| `courseId`, `lessonId` | copied from the approved source |
| `language` | `en` or `ar` |
| `heading` | localized lesson title, plain text |
| `body` | localized summary + approved text/example prose + image/video alt, caption, or fallback; Markdown markers and links stripped |
| `keywords` | stable unique tokens from IDs, titles, and body |
| `sourceRef` | `{lessonId}#sections` |
| `order` | `(lesson.order - 1) * 2 + 1|2` (stable bilingual ordering) |
| `approved` | always `true` |
| `checksum` | SHA-256 of the canonical section object without the checksum |

The export checksum is SHA-256 over the ordered list of section paths and
section checksums at the pinned version.

---

## 4. Result and evidence (2026-11-18)

CLI against the isolated namespace `demo-networking-aiexport-cli` with one
published course and one approved lesson:

- `validate`: `ok: true`, 1 course / 1 lesson / 2 sections.
- `export`: `written: 2`, `batches: 1`, checksum `dab859ab...9678e41` (same
  value produced by `validate` for the same pinned input).
- `preview`: `sectionCount: 2`, `languages: ["ar", "en"]`, orders `1` and `2`.

`backend/tests/ai-export.n3.test.mjs` **9/9** in namespace
`demo-networking-aiexport` proves: bilingual section shape and ID grammar, no
`quiz-c01`/`checkpoint`/`correctOptionId`/`correctAnswer`/`explanation` tokens,
plain-text Markdown stripping, deterministic checksum, fail-closed on an
unapproved lesson or a leaked answer key, Admin SDK writes only to the pinned
`aiSections/**` path, idempotent re-export, client read denial under the real
rules while the D-09 lesson read remains allowed, and fail-closed on a
non-published version.

Add the suite to the backend regression command:

```powershell
cd E:\Graduation_Project2_GitHub\networking-fundamentals\backend
npm run ai:export:test
```

---

## 5. Not done / remaining risks

- The Python AI service is still a health stub; retrieval/inference is N5/N6.
- No automatic export trigger is installed. Run `export` after a version is
  published (and again if its approved prose changes).
- Removing a lesson from a later version does not delete its earlier AI
  sections; old versions remain pinned and server-only. Cleanup would require
  an explicit admin retention decision.
