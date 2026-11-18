/**
 * N3-05 CLI: validate, export, and preview approved AI knowledge sections.
 *
 * Run from backend/functions:
 *   node scripts/export-ai.cjs validate --version v001
 *   node scripts/export-ai.cjs export --version v001
 *   node scripts/export-ai.cjs preview --version v001
 *
 * The exporter reads the active published version by default. --version may
 * name another published version explicitly. All writes go to the server-only
 * aiSections/** path; the client read path is untouched.
 */

"use strict";

const aiExport = require("./ai-export.cjs");

/**
 * Parses --key value and --flag arguments.
 *
 * @param {string[]} argv - Raw arguments.
 * @return {object} Parsed arguments.
 */
function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

/**
 * Runs the selected exporter command.
 *
 * @return {Promise<void>} Resolves when the command completes.
 */
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (!["validate", "export", "preview"].includes(command)) {
    throw new Error(`Unknown command ${command || "(none)"}`);
  }
  const version = typeof args.version === "string" ? args.version : null;
  const db = aiExport.getAdminDb({
    projectId: args.project || process.env.GCLOUD_PROJECT || "demo-networking-p1",
  });

  if (command === "preview") {
    if (!version) throw new Error("VERSION_REQUIRED");
    console.log(JSON.stringify(await aiExport.preview(db, version), null, 2));
    return;
  }

  const result = command === "validate" ?
    await aiExport.validatePublished(db, {version}) :
    await aiExport.exportPublished(db, {version});

  if (!result.ok) {
    console.error(JSON.stringify({
      command,
      version: result.version || version,
      ok: false,
      errors: result.errors,
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  console.log(JSON.stringify({
    command,
    version: result.version,
    pointerVersion: result.pointerVersion,
    ok: true,
    checksum: result.checksum,
    counts: result.counts,
    write: result.write || null,
  }, null, 2));
}

main().catch((error) => {
  console.error(`${error.message}`);
  process.exitCode = 1;
});
