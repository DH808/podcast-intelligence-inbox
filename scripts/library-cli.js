#!/usr/bin/env node
'use strict';

const path = require('path');
const { DEFAULT_DB_PATH, openDatabase, migrateDatabase } = require('../src/library-database');
const { DEFAULT_SINCE, DEFAULT_RADAR_ROOT, DEFAULT_QUERIES_ROOT, DEFAULT_RAW_REPORTS_ROOT, DEFAULT_REPORTS_DIR,
  inventoryAssets, rebuildLibrary, verifyLibrary, exportSanitizedSnapshot } = require('../src/library-import');

function argumentsFrom(values) {
  const result = { command: values[0] || '', shows: [] };
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index]; const next = values[index + 1];
    if (value === '--since' && next) { result.since = next; index += 1; }
    else if (value === '--show' && next) { result.shows.push(...next.split(',').map(item => item.trim()).filter(Boolean)); index += 1; }
    else if (value === '--db' && next) { result.dbPath = path.resolve(next); index += 1; }
    else if (value === '--radar-root' && next) { result.radarRoot = path.resolve(next); index += 1; }
    else if (value === '--queries-root' && next) { result.queriesRoot = path.resolve(next); index += 1; }
    else if (value === '--raw-reports-root' && next) { result.rawReportsRoot = path.resolve(next); index += 1; }
    else if (value === '--reports-dir' && next) { result.reportsDir = path.resolve(next); index += 1; }
    else if (value === '--output' && next) { result.outputPath = path.resolve(next); index += 1; }
    else throw new Error(`unknown or incomplete argument: ${value}`);
  }
  return result;
}
function defaults(args) {
  return { dbPath: args.dbPath || DEFAULT_DB_PATH, radarRoot: args.radarRoot || DEFAULT_RADAR_ROOT,
    queriesRoot: args.queriesRoot || DEFAULT_QUERIES_ROOT, rawReportsRoot: args.rawReportsRoot || DEFAULT_RAW_REPORTS_ROOT,
    reportsDir: args.reportsDir || DEFAULT_REPORTS_DIR, since: args.since || DEFAULT_SINCE, shows: args.shows };
}
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }

function main(argv = process.argv.slice(2)) {
  const args = argumentsFrom(argv); const options = defaults(args);
  if (args.command === 'migrate') {
    const db = openDatabase(options.dbPath);
    try { print({ ok: true, dbPath: options.dbPath, migrations: migrateDatabase(db) }); } finally { db.close(); }
  } else if (args.command === 'inventory') {
    const inventory = inventoryAssets(options);
    print({ ok: true, report: path.join(options.reportsDir, 'podcast_asset_inventory.json'), totals: inventory.totals,
      iltbCanonicalSobridgeMarkdown: inventory.iltbCanonicalSobridgeMarkdown, genericHistoricalReviewed: inventory.genericHistoricalReviewed });
  } else if (args.command === 'rebuild') {
    const result = rebuildLibrary(options);
    print({ ok: true, dbPath: result.dbPath, counts: result.counts, coverage: result.reports.coverage.totals });
  } else if (args.command === 'verify') {
    const result = verifyLibrary(options); print(result);
  } else if (args.command === 'export') {
    const outputPath = args.outputPath || path.join(path.dirname(path.dirname(options.dbPath)), 'public', 'podcast_library_snapshot.json');
    const snapshot = exportSanitizedSnapshot({ dbPath: options.dbPath, outputPath });
    print({ ok: true, outputPath, format: snapshot.format, gateVersion: snapshot.gateVersion, counts: snapshot.counts });
  } else {
    throw new Error('usage: library-cli.js <migrate|inventory|rebuild|verify|export> [--since YYYY-MM-DD] [--show NAME] [--db PATH]');
  }
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
}

module.exports = { argumentsFrom, main };
