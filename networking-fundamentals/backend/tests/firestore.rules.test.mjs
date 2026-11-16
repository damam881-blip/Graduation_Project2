
import {test, after} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const testDir = dirname(fileURLToPath(import.meta.url));

const rulesPath = resolve(
  testDir,
  "..",
  "firestore.rules"
);

const env = await initializeTestEnvironment({
  projectId: "demo-networking-p1",
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: readFileSync(rulesPath, "utf8"),
  },
});

after(async () => {
  await env.cleanup();
});

const users = [
  ["Guest", env.unauthenticatedContext()],
  ["Student", env.authenticatedContext("test-student")],
];

for (const [name, context] of users) {
  test(`${name} cannot read Firestore`, async () => {
    const ref = doc(
      context.firestore(),
      "security_test",
      "example"
    );

    await assertFails(getDoc(ref));
  });

  test(`${name} cannot write Firestore`, async () => {
    const ref = doc(
      context.firestore(),
      "security_test",
      "example"
    );

    await assertFails(setDoc(ref, {test: true}));
  });
}
