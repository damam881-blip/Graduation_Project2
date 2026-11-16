const {verifyFixtures} = require("./fixtures.cjs");

(async () => {
  const result = await verifyFixtures();

  for (const check of result.checks) {
    const suffix = check.detail ? ` — ${check.detail}` : "";
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.id}${suffix}`);
  }

  const passed = result.checks.filter((check) => check.ok).length;
  const failed = result.checks.length - passed;
  console.log(`\nchecks ${result.checks.length}, pass ${passed}, fail ${failed}`);
  process.exit(result.ok ? 0 : 1);
})().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
