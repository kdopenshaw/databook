import type {
  BookDocument,
  BookRow,
  ChartBlock,
  ChartEncoding,
  ComponentRow,
  RechartsSpec,
  TabSection,
} from './types';

export type ChartLintIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
  chartId?: string;
  rowId?: string;
  tabId?: string;
};

const STOCK_MARKS = new Set(['line', 'bar', 'area', 'scatter']);
const STOCK_CHARTS = new Set(['linechart', 'barchart', 'areachart', 'scatterchart']);

const zoomStated = (block: ChartBlock) =>
  /axis starts at/i.test(`${block.subtitle ?? ''} ${block.notes ?? ''}`);

function chartRoot(spec: RechartsSpec): string {
  return spec.chart.replace(/\s+/g, '').toLowerCase();
}

function isBarChart(spec: RechartsSpec): boolean {
  return chartRoot(spec).includes('bar');
}

function isLineChart(spec: RechartsSpec): boolean {
  const root = chartRoot(spec);
  return root.includes('line') && !root.includes('bar');
}

function seriesKeys(spec: RechartsSpec): string[] {
  if (spec.series?.length) return spec.series.map((s) => s.dataKey);
  return spec.yKeys ?? [];
}

function measureSignature(spec: RechartsSpec): string {
  return `${chartRoot(spec)}|${spec.xKey}|${seriesKeys(spec).join(',')}`;
}

function encodingColumns(encoding: ChartEncoding | undefined): string[] {
  if (!encoding) return [];
  return Object.values(encoding).filter((v): v is string => typeof v === 'string');
}

function resolveBlock(book: BookDocument, block: ChartBlock): { block: ChartBlock; error?: string } {
  if (!block.ref) return { block };
  const all = collectBlocks(book);
  const target = all.find((b) => b.id === block.ref);
  if (!target) return { block, error: `ref "${block.ref}" not found` };
  if (target.ref) return { block, error: `ref "${block.ref}" points at another ref (no chains)` };
  return {
    block: {
      ...target,
      id: block.id,
      title: block.title || target.title,
      subtitle: block.subtitle ?? target.subtitle,
      notes: block.notes ?? target.notes,
      flex: block.flex ?? target.flex,
      ref: undefined,
    },
  };
}

export function collectBlocks(book: BookDocument): ChartBlock[] {
  const out: ChartBlock[] = [];
  for (const tab of book.tabs) {
    for (const row of tab.rows) {
      if (row.type === 'component') out.push(...row.components);
    }
  }
  return out;
}

function lintResolvedBlock(
  block: ChartBlock,
  tabId: string,
  rowId: string,
  conventions: BookDocument['conventions'],
): ChartLintIssue[] {
  const issues: ChartLintIssue[] = [];
  const loc = { chartId: block.id, rowId, tabId };
  const zeroBars = conventions?.zeroBaselineBars !== false;

  if (!block.recharts || !block.query) {
    issues.push({ level: 'error', code: 'missing-spec', message: `chart "${block.id}" needs recharts + query (or a valid ref)`, ...loc });
    return issues;
  }

  const spec = block.recharts;
  const root = chartRoot(spec);
  const knownRoot =
    STOCK_CHARTS.has(root) || ['line', 'bar', 'area', 'scatter'].some((m) => root.includes(m));
  if (!knownRoot) {
    issues.push({
      level: 'error',
      code: 'unknown-chart',
      message: `unknown chart root "${spec.chart}" — stock: LineChart, BarChart, AreaChart, ScatterChart`,
      ...loc,
    });
  }

  const series = spec.series?.length
    ? spec.series
    : (spec.yKeys ?? []).map((dataKey) => ({ mark: 'Line', dataKey }));

  if (!series.length && !root.includes('scatter')) {
    issues.push({ level: 'error', code: 'no-series', message: `chart "${block.id}" has no series / yKeys`, ...loc });
  }

  for (const s of series) {
    const mark = (s.mark || 'line').toLowerCase();
    if (!STOCK_MARKS.has(mark)) {
      issues.push({
        level: 'error',
        code: 'unknown-mark',
        message: `unknown mark "${s.mark}" on "${block.id}" — stock: Line, Bar, Area, Scatter`,
        ...loc,
      });
    }
  }

  if (zeroBars && isBarChart(spec) && spec.yDomain) {
    const [lo] = spec.yDomain;
    if (typeof lo === 'number' && lo > 0) {
      issues.push({
        level: 'error',
        code: 'bar-truncated-axis',
        message: `bar chart "${block.id}" yDomain starts at ${lo}; bars must include 0 (or omit yDomain)`,
        ...loc,
      });
    }
  }

  if (isLineChart(spec) && spec.yDomain) {
    const [lo] = spec.yDomain;
    if (typeof lo === 'number' && lo > 0 && !zoomStated(block)) {
      issues.push({
        level: 'error',
        code: 'line-zoom-unstated',
        message: `line chart "${block.id}" zooms yDomain from ${lo} — say "axis starts at …" in subtitle or notes`,
        ...loc,
      });
    }
  }

  const enc = encodingColumns(block.encoding);
  if (enc.length) {
    const used = new Set<string>([spec.xKey, ...seriesKeys(spec), ...(spec.tooltipKeys ?? []), ...(spec.colorBy ? [spec.colorBy.key] : [])]);
    for (const col of enc) {
      if (!used.has(col)) {
        issues.push({
          level: 'warning',
          code: 'unused-encoding',
          message: `encoding column "${col}" on "${block.id}" is not referenced by recharts (xKey/series/tooltipKeys/colorBy)`,
          ...loc,
        });
      }
    }
  }

  return issues;
}

function lintComponentRow(row: ComponentRow, tabId: string): ChartLintIssue[] {
  const issues: ChartLintIssue[] = [];
  const groups = new Map<string, ChartBlock[]>();
  for (const b of row.components) {
    if (!b.recharts || b.ref) continue;
    const sig = measureSignature(b.recharts);
    groups.set(sig, [...(groups.get(sig) ?? []), b]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const lead = group[0].recharts!;
    for (const b of group) {
      const spec = b.recharts!;
      if (!spec.yDomain) {
        issues.push({
          level: 'error',
          code: 'shared-scale-missing',
          message: `sibling panel "${b.id}" in row "${row.id}" needs an explicit yDomain shared with its neighbors`,
          chartId: b.id,
          rowId: row.id,
          tabId,
        });
        continue;
      }
      if (JSON.stringify(spec.yDomain) !== JSON.stringify(lead.yDomain)) {
        issues.push({
          level: 'error',
          code: 'shared-scale-mismatch',
          message: `sibling panel "${b.id}" yDomain ${JSON.stringify(spec.yDomain)} ≠ ${JSON.stringify(lead.yDomain)}`,
          chartId: b.id,
          rowId: row.id,
          tabId,
        });
      }
      if (JSON.stringify(spec.xDomain ?? null) !== JSON.stringify(lead.xDomain ?? null)) {
        issues.push({
          level: 'error',
          code: 'shared-x-mismatch',
          message: `sibling panel "${b.id}" xDomain must match neighbors for aligned small multiples`,
          chartId: b.id,
          rowId: row.id,
          tabId,
        });
      }
    }
  }
  if (row.components.length > 4) {
    issues.push({
      level: 'warning',
      code: 'row-overfull',
      message: `component row "${row.id}" has ${row.components.length} charts; prefer ≤3 (soft) / ≤4`,
      rowId: row.id,
      tabId,
    });
  }
  return issues;
}

function walkRows(tab: TabSection, book: BookDocument): ChartLintIssue[] {
  const issues: ChartLintIssue[] = [];
  for (const row of tab.rows as BookRow[]) {
    if (row.type !== 'component') continue;
    const resolved: ChartBlock[] = [];
    for (const raw of row.components) {
      const { block, error } = resolveBlock(book, raw);
      if (error) {
        issues.push({
          level: 'error',
          code: 'bad-ref',
          message: error,
          chartId: raw.id,
          rowId: row.id,
          tabId: tab.id,
        });
        continue;
      }
      resolved.push(block);
      issues.push(...lintResolvedBlock(block, tab.id, row.id, book.conventions));
    }
    issues.push(...lintComponentRow({ ...row, components: resolved }, tab.id));
  }
  return issues;
}

/** Static honesty / schema checks for a BookDocument. Errors should fail CI / pipeline step 6. */
export function lintBook(book: BookDocument): ChartLintIssue[] {
  const issues: ChartLintIssue[] = [];
  const ids = new Set<string>();

  for (const tab of book.tabs) {
    for (const row of tab.rows) {
      if (row.type !== 'component') continue;
      for (const b of row.components) {
        if (ids.has(b.id)) {
          issues.push({
            level: 'error',
            code: 'duplicate-id',
            message: `duplicate chart id "${b.id}"`,
            chartId: b.id,
            tabId: tab.id,
          });
        }
        ids.add(b.id);
      }
    }
  }

  for (const tab of book.tabs) {
    issues.push(...walkRows(tab, book));
  }

  if (book.pages?.length) {
    const tabIds = new Set(book.tabs.map((t) => t.id));
    for (const page of book.pages) {
      for (const tid of page.tabIds) {
        if (!tabIds.has(tid)) {
          issues.push({
            level: 'error',
            code: 'page-bad-tab',
            message: `page "${page.id}" references unknown tab "${tid}"`,
          });
        }
      }
    }
  }

  return issues;
}

export function lintBookErrors(book: BookDocument): ChartLintIssue[] {
  return lintBook(book).filter((i) => i.level === 'error');
}

export function formatLintIssues(issues: ChartLintIssue[]): string {
  return issues.map((i) => `[${i.level}] ${i.code}${i.chartId ? ` (${i.chartId})` : ''}: ${i.message}`).join('\n');
}
