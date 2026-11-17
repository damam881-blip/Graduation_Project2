# N3-04 - Validated importer, publish, and rollback

This document is the contract for `functions/scripts/content-import.cjs`
(pure validation and lifecycle helpers) and `functions/scripts/import-content.cjs`
(the CLI). N3-03 owns the public bytes; N3-04 owns validation, mapping,
protected writes, staging, preview, publishing, and rollback.

## 1. One command at a time

Run from `networking-fundamentals/backend/functions`:

```powershell
node scripts/import-content.cjs validate --version v004
node scripts/import-content.cjs stage --version v004
node scripts/import-content.cjs preview --version v004
node scripts/import-content.cjs publish --version v004 --actor admin
node scripts/import-content.cjs rollback --version v004 --restore v001 --actor admin
```

Options: `--content`, `--protected`, `--asset-dir`, `--project`, `--restore`.
Validation failures exit with code 2 and print every error; no write happens.
The default project is `demo-networking-p1` and the default version is `v004`.

## 2. Sources

| Source | Visibility | Contents |
|---|---|---|
| `backend/content/*.json` | public, Git-managed | manifest, catalog, 6 courses, 12 lessons, 2 SVGs |
| `functions/scripts/import-data/checkpoint-keys.csv` | server-only | `lessonId,correctOptionId,explanationEn,explanationAr` (12 rows) |
| `functions/scripts/import-data/quiz-answers.csv` | server-only | `quizId,correctOptionId,bankSize` (18 rows) |

The CSV files are deliberately **outside** `backend/content`, which must remain
answer-free. CSV parsing is strict: quoted fields, doubled quotes, LF or CRLF,
even column counts, and a header row.

## 3. Validation gate (before any write)

`validateSources()` rejects the import unless all of the following hold:

- manifest `formatVersion == 1`, all files on disk are declared, every
  course/lesson/catalog version equals `manifest.contentVersion`;
- exactly 6 approved courses with `order` 1..6 and unique IDs;
- at least 12 approved lessons, at least 2 per course, contiguous order,
  matching ID prefixes, and exact `lessonIds` agreement;
- every localized field is a non-empty `{en, ar}` pair; sections are ordered
  and unique, image assets exist, and video IDs are 11-character YouTube IDs;
- every `finalQuizId` and `quizId` resolves to the derived lesson/final quiz;
- each of the 18 quizzes has a server-only answer row with
  `bankSize >= questionCount` (10 for lessons, 20 for finals);
- each generated question has 2–4 unique options and exactly one correct
  option that exists in the source checkpoint;
- every lesson checkpoint has exactly one private key whose correct option is
  one of the public options;
- no client-readable document contains `correctOptionId`, `correctOptionIds`,
  `explanation`, or `review`.

Error codes include `MISSING_FIELD`, `DUPLICATE_ID`, `BROKEN_REFERENCE`,
`BANK_TOO_SMALL`, `MISSING_PRIVATE_KEY`, `PROTECTED_LEAK`, `MANIFEST_MISMATCH`,
and `BROKEN_ORDER`. Errors carry a source path so a reviewer can fix the exact
file. A valid import of the current tree is 391 documents: 1 version, 6 courses,
12 lessons, 18 quizzes, 18 banks, 324 questions, and 12 checkpoint keys.

## 4. Mapping and asset handling

- `courses/{id}.json` -> `contentVersions/{v}/courses/{id}`
- `lessons/{id}.json` -> `contentVersions/{v}/courses/{courseId}/lessons/{id}`
- section `asset` -> `imageUrl`; `videoId` -> `videoUrl`
  (`https://www.youtube.com/watch?v={videoId}`), with `fallback` preserved;
- checkpoint public question/options stay on the lesson; the answer is written
  only to `.../lessons/{id}/private/checkpointKey`;
- quiz banks and every question are written only under
  `contentVersions/{v}/quizBanks/**`.

SVG bytes are copied by `publishAssets()` into
`functions/.local/content-assets/{v}/...` and verified by SHA-256. The local
`serve-assets.cjs` server exposes them on port 8081 so an emulator device can
load the mapped `imageUrl`. Set `CONTENT_ASSET_BASE_URL` to the laptop IP during
local verification; a deployed environment supplies its HTTPS Storage origin.
`firestore.rules` still denies all client access to `private/**`, `quizBanks/**`,
and `aiSections/**`, and is unchanged by N3-04.

## 5. Lifecycle transactions

- `stage`: validate, upload assets, then batch-write the version with
  `status: "staging"` and `validation.ok: true`. The active pointer is not
  touched, so clients cannot see the new version.
- `publish`: one Admin transaction requires staging status and `validation.ok`,
  then sets the new version `published`, moves
  `system/publishedContentVersion` with `previousContentVersion`, and archives
  the old version. Content documents are never rewritten.
- `rollback`: one Admin transaction requires the named version to be active,
  moves the pointer back, marks the bad version `rolledBack`, and marks the
  restored version `published` with `rollbackOf: badId`.
- A rejected publish/rollback performs no writes; `NOT_VALIDATED`,
  `NOT_STAGING`, `NOT_ACTIVE`, and missing-document errors are fail-closed.

## 6. Verification

```powershell
cd networking-fundamentals\backend
npm run content:import:test     # 14 tests, own namespace demo-networking-contentimport
node --test .\tests\content.n3.test.mjs
cd functions
npm run build
npm run lint
npm run content:import:validate -- --version v004
```

The suite covers missing fields, duplicate IDs, broken references,
insufficient bank size, a missing private key, a client-side answer leak,
asset/video mapping, verified asset bytes, staging invisibility under the real
rules, atomic publish, failed publish with an unchanged pointer, rollback, and
failed rollback with an unchanged pointer.

Evidence (2026-11-18): `content:import:test` 14/14 pass; CLI `validate` reports
6 courses / 12 lessons / 18 quizzes / 324 questions / 391 documents and
checksum `26e2b9e885f7b79f7f5559deb29c472229ab6eccc6784076b4882e503a855cf4`;
CLI `stage` kept the pointer at `v001` with `visibleToClients: false`; CLI
`publish` moved `v001 -> v004` and set `visibleToClients: true`; CLI `rollback`
restored `v001` and recorded `rollbackOf: v004`.
