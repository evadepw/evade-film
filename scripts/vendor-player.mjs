#!/usr/bin/env node
/**
 * Copies EvadePlayer's self-contained Web Component build out of node_modules
 * and into `public/vendor/evade-player/`.
 *
 * Why vendor instead of import: `evade-player@0.2.1` publishes only its React
 * entry in `exports`, and that entry loads react-dom through a `require()`
 * interop shim Turbopack cannot execute. The standalone `<evade-player>` build
 * has no such shim, but is not reachable by specifier — so it is copied out at
 * install time and loaded as a plain script on the watch routes. Nothing is
 * fetched from a CDN; the bytes come from the pinned package, and re-running
 * `npm install` refreshes them.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "public", "vendor", "evade-player");

const FILES = ["evade-player.js", "evade-player.css"];

async function main() {
  let entry;
  try {
    // The package does not export `package.json`, so the main entry is what we
    // resolve; it lives in the same `dist/` as the standalone build.
    entry = require.resolve("evade-player");
  } catch {
    console.warn("[vendor-player] evade-player is not installed — skipping.");
    return;
  }

  const dist = dirname(entry);
  await mkdir(target, { recursive: true });

  for (const file of FILES) {
    await copyFile(join(dist, file), join(target, file));
  }

  console.log("[vendor-player] copied standalone build → public/vendor/evade-player/");
}

await main();
