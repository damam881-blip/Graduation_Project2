/**
 * N3-04 local asset server for the Firebase emulator MVP.
 *
 * Serves the bytes written by `import-content.cjs stage` so that the SVG
 * `imageUrl` values resolve on a physical device during verification.
 * Binding is 0.0.0.0 so a phone on the same Wi-Fi can use the laptop IP.
 * In production these URLs come from Cloud Storage (CONTENT_ASSET_BASE_URL).
 */

"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = path.resolve(
  process.argv[2] || path.join(__dirname, "..", ".local", "content-assets")
);
const PORT = Number.parseInt(process.env.ASSET_PORT || "8081", 10);

http.createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = path.resolve(ROOT, `.${requested}`);
  if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) ||
    !fs.statSync(file).isFile()) {
    response.writeHead(404, {"content-type": "text/plain"});
    response.end("not found");
    return;
  }
  response.writeHead(200, {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=3600",
  });
  fs.createReadStream(file).pipe(response);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Serving ${ROOT} on http://0.0.0.0:${PORT}`);
});
