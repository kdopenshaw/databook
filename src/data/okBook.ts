/**
 * Book gate: tab parse, chart resolve, query validate + nonempty, unused charts.
 * Invoked by `npm run ok` (see scripts/ok-book.mjs).
 */
import { listBookCharts, resolveChartMeta } from '../charts/registry';
import { uniqueChartNames } from './parseBook';
import type { BookDocument, ChartMeta, Table } from './types';
import { runQuery } from './runQuery';
import { validateQuery } from './validate';

export type OkIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
  chartId?: string;
  tabId?: string;
};

export type OkResult = {
  ok: boolean;
  issues: OkIssue[];
};

export function allowsEmptyQuery(meta: ChartMeta): boolean {
  if (meta.allowEmpty) return true;
  const notes = `${meta.subtitle ?? ''} ${meta.notes ?? ''}`.toLowerCase();
  return /\ballow(?:s|ed)?\s+empty\b/.test(notes) || /\bempty\s+ok\b/.test(notes);
}

export function checkBookStructure(book: BookDocument): OkIssue[] {
  const issues: OkIssue[] = [];
  if (!book.title) {
    issues.push({ level: 'error', code: 'missing-title', message: 'book.yaml missing title' });
  }
  if (!book.tabs.length) {
    issues.push({ level: 'error', code: 'no-tabs', message: 'no tab markdown files under src/book/' });
  }
  for (const tab of book.tabs) {
    if (!tab.sourceFile) {
      issues.push({
        level: 'error',
        code: 'tab-file',
        message: `tab "${tab.id}" missing sourceFile`,
        tabId: tab.id,
      });
    }
    for (const block of tab.blocks) {
      if (block.type !== 'charts') continue;
      for (const ref of block.charts) {
        const meta = resolveChartMeta(ref.name);
        if (!meta) {
          issues.push({
            level: 'error',
            code: 'unknown-chart',
            message: `chart "${ref.name}" not found in src/charts/`,
            chartId: ref.name,
            tabId: tab.id,
          });
        }
      }
    }
  }
  return issues;
}

export function smokeChartQueries(book: BookDocument, table: Table): OkIssue[] {
  const issues: OkIssue[] = [];
  for (const name of uniqueChartNames(book)) {
    const meta = resolveChartMeta(name);
    if (!meta) continue;
    const vErrors = validateQuery(meta.query, table.schema);
    for (const message of vErrors) {
      issues.push({
        level: 'error',
        code: 'query-invalid',
        message: `chart "${name}": ${message}`,
        chartId: name,
      });
    }
    if (vErrors.length) continue;
    if (allowsEmptyQuery(meta)) continue;

    let rows;
    try {
      rows = runQuery(table, meta.query);
    } catch (err) {
      issues.push({
        level: 'error',
        code: 'query-failed',
        message: `chart "${name}" query threw: ${err instanceof Error ? err.message : err}`,
        chartId: name,
      });
      continue;
    }
    if (!rows.length) {
      issues.push({
        level: 'error',
        code: 'query-empty',
        message: `chart "${name}" query returned 0 rows (set meta.allowEmpty or note "empty ok" if intentional)`,
        chartId: name,
      });
    }
  }
  return issues;
}

export function checkUnusedCharts(book: BookDocument): OkIssue[] {
  const referenced = new Set(uniqueChartNames(book));
  const issues: OkIssue[] = [];
  for (const name of listBookCharts()) {
    if (!referenced.has(name)) {
      issues.push({
        level: 'error',
        code: 'unused-chart',
        message: `src/charts/${name}.tsx is never referenced in a \`\`\`chart block`,
        chartId: name,
      });
    }
  }
  return issues;
}

/** Full live book check used by `npm run ok`. */
export function checkLiveBook(book: BookDocument, table: Table): OkResult {
  const issues = [
    ...checkBookStructure(book),
    ...smokeChartQueries(book, table),
    ...checkUnusedCharts(book),
  ];
  return { ok: issues.every((i) => i.level !== 'error'), issues };
}

export function formatOkIssues(issues: OkIssue[]): string {
  if (!issues.length) return '';
  return issues
    .map((i) => {
      const where = [i.tabId, i.chartId].filter(Boolean).join('/');
      const prefix = where ? `${where}: ` : '';
      return `- [${i.level}] ${i.code} ${prefix}${i.message}`;
    })
    .join('\n');
}
