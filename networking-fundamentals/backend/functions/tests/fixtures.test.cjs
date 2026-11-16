const {test} = require("node:test");
const assert = require("node:assert/strict");

const {seedFixtures, verifyFixtures} = require("../scripts/fixtures.cjs");

test("N2-03 fixture set satisfies the schema invariants", async (t) => {
  const counts = await seedFixtures();

  await t.test("seed produces the expected topology", () => {
    assert.equal(counts.courses, 6);
    assert.equal(counts.lessons, 12);
    assert.equal(counts.quizzes, 18);
    assert.equal(counts.banks, 18);
    assert.equal(counts.questions, 288);
    assert.equal(counts.aiSections, 24);
    assert.equal(counts.checkpointKeys, 12);
    assert.equal(counts.profiles, 4);
    assert.equal(counts.attempts, 12);
    assert.equal(counts.quizStates, 9);
    assert.equal(counts.tombstones, 1);
  });

  const result = await verifyFixtures();

  for (const check of result.checks) {
    await t.test(check.id, () => {
      assert.ok(check.ok, check.detail);
    });
  }

  assert.equal(
    result.failures.length,
    0,
    result.failures.map((failure) => `${failure.id}: ${failure.detail}`).join("; ")
  );
});
