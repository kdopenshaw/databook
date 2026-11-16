#!/usr/bin/env node
/**
 * Headless print of one chart's query result (CSV / text table).
 * Reads query from the chart file's `meta` export.
 *
 *   npm run print-block -- <ChartName>
 *   npm run print-block -- <ChartName> --format table
 *   npm run print-block -- <ChartName> --limit 20
 */
import { createServer } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage(exitCode = 1) {
  console.error(`Usage: npm run print-block -- <ChartName> [--format csv|table] [--limit N]

Print a chart's meta.query result against src/data/canonical.json.
Stdout: compact CSV (default) or aligned text table.
Stderr: one-line chart summary (name, title, row count).`);
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
  return { chartName: positional[0], format, limit };
}

const { chartName, format, limit } = parseArgs(process.argv.slice(2));
if (!chartName) usage(1);

const canonicalPath = path.join(root, 'src/data/canonical.json');
const chartPath = path.join(root, 'src/charts', `${chartName}.tsx`);
if (!existsSync(canonicalPath)) {
  console.error('print-block: missing src/data/canonical.json');
  process.exit(1);
}
if (!existsSync(chartPath)) {
  console.error(`print-block: missing src/charts/${chartName}.tsx`);
  process.exit(1);
}

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
    result = printChartBlock(table, chartName, { format, limit });
  } catch (err) {
    const msg =
      err instanceof PrintBlockError || err?.name === 'PrintBlockError'
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
