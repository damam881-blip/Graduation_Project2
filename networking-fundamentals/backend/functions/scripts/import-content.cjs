/**
 * N3-04 CLI: validate, stage, preview, publish, and rollback content.
 *
 * Examples (run from backend/functions):
 *   node scripts/import-content.cjs validate --version v004
 *   node scripts/import-content.cjs stage --version v004
 *   node scripts/import-content.cjs preview --version v004
 *   node scripts/import-content.cjs publish --version v004
 *   node scripts/import-content.cjs rollback --version v004 --restore v001
 *
 * The default asset base URL is local-only. Set CONTENT_ASSET_BASE_URL to the
 * HTTPS origin that serves the SVG files in a deployed environment.
 */

"use strict";

const path = require("node:path");

const importer = require("./content-import.cjs");

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
 * Resolves the source roots and build options from CLI arguments.
 *
 * @param {object} args - Parsed arguments.
 * @return {object} Resolved options.
 */
function buildOptions(args) {
  return {
    contentRoot: args.content ?
      path.resolve(args.content) : importer.DEFAULT_CONTENT_ROOT,
    protectedRoot: args.protected ?
      path.resolve(args.protected) : importer.DEFAULT_PROTECTED_ROOT,
    version: args.version || "v004",
    imageUrlBase: process.env.CONTENT_ASSET_BASE_URL || importer.DEFAULT_ASSET_BASE_URL,
    assetDir: args.assetDir ?
      path.resolve(args.assetDir) : importer.DEFAULT_ASSET_DIR,
    actor: args.actor || "n3-04-importer",
    restoreVersion: args.restore || null,
    projectId: args.project || "demo-networking-p1",
  };
}

/**
 * Runs the selected command.
 *
 * @return {Promise<void>} Resolves when the command completes.
 */
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const options = buildOptions(args);

  if (!["validate", "stage", "preview", "publish", "rollback"].includes(command)) {
    throw new Error(`Unknown command ${command || "(none)"}`);
  }

  if (command === "validate" || command === "stage") {
    const model = importer.loadSources({
      contentRoot: options.contentRoot,
      protectedRoot: options.protectedRoot,
    });
    const result = importer.validateSources(model, {
      version: options.version,
      imageUrlBase: options.imageUrlBase,
    });
    if (!result.ok) {
      console.error(JSON.stringify({
        command,
        version: options.version,
        ok: false,
        errors: result.errors,
      }, null, 2));
      process.exitCode = 2;
      return;
    }
    const summary = {
      command,
      version: options.version,
      ok: true,
      checksum: result.checksum,
      counts: result.counts,
    };
    if (command === "stage") {
      const uploaded = importer.publishAssets({
        assets: result.assets,
        version: options.version,
        destDir: options.assetDir,
      });
      const db = importer.getAdminDb({projectId: options.projectId});
      summary.uploadedAssets = uploaded;
      summary.write = await importer.stage(db, {entries: result.entries});
      summary.preview = await importer.preview(db, options.version);
    }
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const db = importer.getAdminDb({projectId: options.projectId});
  if (command === "preview") {
    console.log(JSON.stringify(await importer.preview(db, options.version), null, 2));
  } else if (command === "publish") {
    const outcome = await importer.publish(db, {
      version: options.version,
      actor: options.actor,
    });
    console.log(JSON.stringify({
      command,
      ...outcome,
      preview: await importer.preview(db, options.version),
    }, null, 2));
  } else {
    const outcome = await importer.rollback(db, {
      version: options.version,
      restoreVersion: options.restoreVersion,
      actor: options.actor,
    });
    console.log(JSON.stringify({
      command,
      ...outcome,
      preview: await importer.preview(db, outcome.restoredVersion),
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(`${error.message}`);
  process.exitCode = 1;
});
