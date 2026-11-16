/**
 * Headless chart query preview — reads `meta` from the chart module.
 * Invoked by `npm run print-block -- <ChartName>` (see scripts/print-block.mjs).
 */
import { resolveChartMeta } from '../charts/registry';
import type { ChartQuery, DataRow, Table, Value } from './types';
import { runQuery } from './runQuery';

export type PrintBlockFormat = 'csv' | 'table';

export type PrintBlockOptions = {
  format?: PrintBlockFormat;
  /** Max data rows to print (header excluded). Default: all. */
  limit?: number;
};

export type PrintBlockResult = {
  chartId: string;
  title: string;
  queryLabel?: string;
  rowCount: number;
  columns: string[];
  rows: DataRow[];
  body: string;
  summary: string;
};

export class PrintBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrintBlockError';
  }
}

function cellString(v: Value): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);
    if (Number.isInteger(v)) return String(v);
    const s = v.toPrecision(12).replace(/\.?0+$/, '');
    return s;
  }
  return String(v);
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function formatRowsCsv(rows: DataRow[], columns?: string[]): string {
  const cols =
    columns ??
    (rows.length
      ? Array.from(
          rows.reduce((set, r) => {
            for (const k of Object.keys(r)) set.add(k);
            return set;
          }, new Set<string>()),
        )
      : []);
  const lines = [cols.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => csvEscape(cellString(row[c] ?? null))).join(','));
  }
  return lines.join('\n');
}

export function formatRowsTable(rows: DataRow[], columns?: string[]): string {
  const cols =
    columns ??
    (rows.length
      ? Array.from(
          rows.reduce((set, r) => {
            for (const k of Object.keys(r)) set.add(k);
            return set;
          }, new Set<string>()),
        )
      : []);
  if (!cols.length) return '(no columns)';
  const stringRows = rows.map((r) => cols.map((c) => cellString(r[c] ?? null)));
  const widths = cols.map((c, i) =>
    Math.max(c.length, ...stringRows.map((cells) => cells[i]?.length ?? 0)),
  );
  const fmt = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i]!)).join('  ');
  const header = fmt(cols);
  const rule = widths.map((w) => '-'.repeat(w)).join('  ');
  return [header, rule, ...stringRows.map(fmt)].join('\n');
}

export function printChartBlock(
  table: Table,
  chartName: string,
  options: PrintBlockOptions = {},
): PrintBlockResult {
  const meta = resolveChartMeta(chartName);
  if (!meta) {
    throw new PrintBlockError(
      `chart "${chartName}" not found (export meta from src/charts/${chartName}.tsx)`,
    );
  }

  if (!meta.query) {
    throw new PrintBlockError(`chart "${chartName}" has no meta.query`);
  }

  let rows: DataRow[];
  try {
    rows = runQuery(table, meta.query as ChartQuery);
  } catch (err) {
    throw new PrintBlockError(
      `chart "${chartName}" query failed: ${err instanceof Error ? err.message : err}`,
    );
  }

  const limit = options.limit;
  const truncated = typeof limit === 'number' && limit >= 0 ? rows.slice(0, limit) : rows;
  const columns = truncated.length
    ? Array.from(
        truncated.reduce((set, r) => {
          for (const k of Object.keys(r)) set.add(k);
          return set;
        }, new Set<string>()),
      )
    : [];

  const format: PrintBlockFormat = options.format ?? 'csv';
  const body =
    format === 'table' ? formatRowsTable(truncated, columns) : formatRowsCsv(truncated, columns);

  const shown =
    truncated.length === rows.length
      ? `${rows.length} rows`
      : `${truncated.length}/${rows.length} rows`;
  const label = meta.query.label ? ` · ${meta.query.label}` : '';
  const summary = `${chartName}  ${meta.title}${label}  ${shown}`;

  return {
    chartId: chartName,
    title: meta.title,
    queryLabel: meta.query.label,
    rowCount: rows.length,
    columns,
    rows: truncated,
    body,
    summary,
  };
}
