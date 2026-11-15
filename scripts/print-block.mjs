#!/usr/bin/env node
/**
 * Headless print of one chart block's query result (CSV / text table).
 * Same resolve + runQuery engine as the app — no Vite app server, no Playwright.
 *
 *   npm run print-block -- <chartId>
 *   npm run print-block -- <chartId> --format table
 *   npm run print-block -- <chartId> --limit 20
 *
 * Loads TypeScript modules via Vite SSR (library mode), not `npm run dev`.
 */
import { createServer } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage(exitCode = 1) {
  console.error(`Usage: npm run print-block -- <chartId> [--format csv|table] [--limit N]

Print a chart's inlined query result against src/data/canonical.json.
Stdout: compact CSV (default) or aligned text table.
Stderr: one-line chart summary (id, title, row count).`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const positional = [];
  let format = 'csv';
  let limit;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    if (a === '--format') {
      format = argv[++i];
      if (format !== 'csv' && format !== 'table') {
        console.error(`print-block: invalid --format "${format}" (use csv|table)`);
        process.exit(1);
      }
      continue;
    }
    if (a === '--limit') {
      const raw = argv[++i];
      limit = Number(raw);
      if (!Number.isFinite(limit) || limit < 0) {
        console.error(`print-block: invalid --limit "${raw}"`);
        process.exit(1);
      }
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`print-block: unknown flag ${a}`);
      usage(1);
    }
    positional.push(a);
  }
  return { chartId: positional[0], format, limit };
}

const { chartId, format, limit } = parseArgs(process.argv.slice(2));
if (!chartId) usage(1);

const rowsPath = path.join(root, 'src/data/rows.json');
const canonicalPath = path.join(root, 'src/data/canonical.json');
if (!existsSync(rowsPath)) {
  console.error('print-block: missing src/data/rows.json');
  process.exit(1);
}
if (!existsSync(canonicalPath)) {
  console.error('print-block: missing src/data/canonical.json');
  process.exit(1);
}

const book = JSON.parse(readFileSync(rowsPath, 'utf8'));

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  clearScreen: false,
  logLevel: 'error',
});

try {
  const { loadCanonical } = await server.ssrLoadModule('/src/data/loadCanonical.ts');
  const { printChartBlock, PrintBlockError } = await server.ssrLoadModule('/src/data/printBlock.ts');
  const table = loadCanonical();
  let result;
  try {
    result = printChartBlock(book, table, chartId, { format, limit });
  } catch (err) {
    const msg = err instanceof PrintBlockError || err?.name === 'PrintBlockError'
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
    console.error(`print-block: ${msg}`);
    process.exit(1);
  }
  console.error(result.summary);
  console.log(result.body);
} finally {
  await server.close();
}
