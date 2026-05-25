#!/usr/bin/env node
/**
 * Mirrors data/app-downloads.json into node_modules/@conduction/data/ so
 * @conduction/docusaurus-preset's stats import resolves on a freshly-
 * installed tree. The preset's src/data/app-downloads.js requires the
 * file at `../../../data/app-downloads.json` relative to its own
 * location, which targets node_modules/@conduction/data/ — a path the
 * npm install layout does not create on its own.
 *
 * Hooked into postinstall + prestart + prebuild so the file is in place
 * for both dev and prod builds. Safe to re-run; idempotent on contents.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'app-downloads.json');
const DST_DIR = path.join(__dirname, '..', 'node_modules', '@conduction', 'data');
const DST = path.join(DST_DIR, 'app-downloads.json');

if (!fs.existsSync(SRC)) {
  console.warn(`[sync-app-downloads] source missing at ${SRC}; skipping`);
  process.exit(0);
}

try {
  fs.mkdirSync(DST_DIR, { recursive: true });
  fs.copyFileSync(SRC, DST);
  console.log(`[sync-app-downloads] copied ${SRC} → ${DST}`);
} catch (err) {
  console.warn(`[sync-app-downloads] copy failed: ${err.message}`);
  process.exit(0);
}
