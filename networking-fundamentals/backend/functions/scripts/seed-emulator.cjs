const {seedFixtures} = require("./fixtures.cjs");

(async () => {
  const counts = await seedFixtures();
  console.log("N2-03 fixtures seeded into the emulators.");
  console.log(JSON.stringify(counts, null, 2));
})().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
