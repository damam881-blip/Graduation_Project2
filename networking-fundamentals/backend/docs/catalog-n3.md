# N3-01 - Locked Course Catalog

**Task:** N3-01 - lock the schema/contract for 6 sequential bilingual courses and at least 12 bilingual lesson contracts.
**Status:** implemented and verified (static catalog + seeded fixtures).
**Normative data:** `backend\functions\scripts\catalog.cjs` (machine-readable).
**Contract test:** `backend\functions\tests\catalog.test.cjs` (11 tests).
**Seed/verify:** `backend\functions\scripts\fixtures.cjs` consumes the catalog.
**Not changed:** `firestore.rules`, `firestore.indexes.json`, Functions source, existing tests.
**Scope note:** this task locks IDs, order, titles, descriptions, and lesson contracts. Real lesson bodies, media, importer, and publishing are N3-03/N3-04/N3-07.

---

## 1. Before / after

| Item | Before (N2-03 fixtures) | After (N3-01 lock) |
|---|---|---|
| Catalog source | Two inline arrays in `fixtures.cjs` | `scripts\catalog.cjs`, imported by `fixtures.cjs` |
| Course 1 EN name | Networking Foundations | **Networking Fundamentals** (FR-05 endpoint) |
| Course 6 EN name | Security and Troubleshooting | **Network Security Basics** (FR-05 endpoint) |
| Course descriptions | `Fixture course: <title>.` | Locked bilingual descriptions |
| Lesson contracts | 12 inline title pairs | 12 locked `title` + `summary` pairs |
| Catalog test | none | 11 tests (IDs, order, bilingual, counts, no quiz data) |
| Fixture counts | 6 courses / 12 lessons | **unchanged: 6 / 12** |

Course IDs, order, and the total document count (424) are unchanged. Only the display text and its source of truth changed.

---

## 2. Course catalog (locked)

| ID | Order | English | Arabic | Minutes |
|---|---|---|---|---|
| `course-01` | 1 | Networking Fundamentals | أساسيات الشبكات | 90 |
| `course-02` | 2 | IP Addressing | عنونة IP | 90 |
| `course-03` | 3 | Subnetting and VLSM | التقسيم الفرعي للشبكات وVLSM | 120 |
| `course-04` | 4 | Routing and Switching | التوجيه والتبديل | 120 |
| `course-05` | 5 | Network Services | خدمات الشبكة | 90 |
| `course-06` | 6 | Network Security Basics | أساسيات أمن الشبكات | 120 |

The English endpoints match Phase 1 FR-05 ("from Networking Fundamentals to Network Security Basics"). Order is sequential and locked for the MVP.

---

## 3. Lesson contracts (locked)

| ID | Course | Order | English | Arabic |
|---|---|---|---|---|
| `lesson-01-01` | course-01 | 1 | What is a Network? | ما هي الشبكة؟ |
| `lesson-01-02` | course-01 | 2 | Network Topologies | طوبولوجيا الشبكات |
| `lesson-02-01` | course-02 | 1 | IPv4 Addresses | عناوين IPv4 |
| `lesson-02-02` | course-02 | 2 | Public and Private Addressing | العنونة العامة والخاصة |
| `lesson-03-01` | course-03 | 1 | Subnet Masks | أقنعة الشبكة الفرعية |
| `lesson-03-02` | course-03 | 2 | VLSM Basics | أساسيات VLSM |
| `lesson-04-01` | course-04 | 1 | Switching Fundamentals | أساسيات التبديل |
| `lesson-04-02` | course-04 | 2 | Static and Dynamic Routing | التوجيه الثابت والديناميكي |
| `lesson-05-01` | course-05 | 1 | DNS and DHCP | DNS وDHCP |
| `lesson-05-02` | course-05 | 2 | HTTP and Email Services | خدمات HTTP والبريد |
| `lesson-06-01` | course-06 | 1 | Security Threats and Defenses | التهديدات الأمنية والدفاعات |
| `lesson-06-02` | course-06 | 2 | Troubleshooting Methodology | منهجية استكشاف الأخطاء |

Each lesson also has a locked one-line bilingual `summary` in `catalog.cjs`. Two lessons per course = **12**, satisfying the N3-01 floor without changing the fixture topology.

---

## 4. Contract rules

1. `scripts\catalog.cjs` is the only source for course/lesson IDs, order, titles, and descriptions. Do not re-inline them.
2. Course IDs `course-01`..`course-06` and every lesson ID are **permanent**. Renaming a title is a content change; changing an ID is a schema change.
3. `order` is locked. Reordering requires a new `contentVersion` and a publish transaction, not an in-place edit.
4. Titles and descriptions are `[en, ar]` pairs. English is printable ASCII; Arabic must contain Arabic script. Technical terms (IP, VLSM, DNS, DHCP, HTTP, NAT, CIDR, MAC, OSI, TCP/IP) stay in Latin script per FR-13.
5. The catalog carries **no** quiz banks, correct answers, or explanations; those remain server-only (D-01, V-10).
6. Guest visibility is unchanged: all 6 course metadata documents are readable; lesson documents are gated by `course-01` or own unlocked `courseProgress` (N2-04).
7. Real lesson bodies, images, and video fallback replace the fixture sections in N3-03/N3-07; this lock does not claim teaching-quality content.

---

## 5. Verification evidence

Commands run from `E:\Graduation_Project2\networking-fundamentals\backend\functions`:

```
npm run catalog:test   -> tests 11, pass 11, fail 0
npm run fixtures:test  -> tests 19, pass 19, fail 0
npm run fixtures:seed  -> totalDocuments 424
npm run fixtures:verify-> checks 17, pass 17, fail 0
```

`fixtures:test` reseeds from `catalog.cjs` and the existing verify checks confirm 6 ordered courses, 12 lessons (2 per course), contiguous lesson order, ID prefixes, and bilingual titles.

Full regression is unchanged at **177/177**; the catalog suite is static and adds no emulator namespace.

---

## 6. Acceptance criteria

| Criterion | Where satisfied | Status |
|---|---|---|
| 6 sequential courses | §2, catalog test "six courses use stable IDs" | PASS |
| Names/order in English and Arabic | §2, §3, bilingual tests | PASS |
| >= 12 bilingual lessons | §3, "at least 12 lessons" | PASS |
| Stable unique IDs | course/lesson ID tests | PASS |
| Structured example/illustration hooks | Existing lesson `sections` schema (N2-01 §5.4) unchanged | PASS (design) |
| No protected bank data in the catalog | "catalog carries no protected quiz material" | PASS |
| Fixtures still seed/verify | 424 docs, 17/17 | PASS |
| Existing tests untouched | 177/177 regression | PASS |

---

## 7. Remaining risks

- Lesson bodies are still fixture placeholders ("Introduction to ...", "Summary of ..."); N3-03/N3-07 own real bilingual content and media.
- Descriptions and summaries are one-line contracts, not full lesson objectives; expanding them is content work, not a schema change.
- No importer/validation pipeline yet (N3-04); `catalog.cjs` is hand-maintained and test-guarded.
- Arabic copy should be reviewed by an Arabic-speaking reviewer during N3-07; the test proves script presence, not translation quality.
