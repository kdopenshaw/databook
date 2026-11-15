import { describe, expect, it } from 'vitest';
import type { BookDocument, ChartBlock } from './types';
import { lintBookErrors } from './chartLint';
import { loadCanonical, getCanonicalMeta } from './loadCanonical';
import { runQuery } from './runQuery';
import bookJson from './rows.json';

const book = bookJson as BookDocument;

const blocks: ChartBlock[] = book.tabs.flatMap((t) =>
  t.rows.flatMap((r) => (r.type === 'component' ? r.components : [])),
);

const allRows = book.tabs.flatMap((t) => t.rows.map((r) => ({ tabId: t.id, row: r })));

describe('pokemon book', () => {
  it('passes chart lint', () => {
    expect(lintBookErrors(book)).toEqual([]);
  });

  it('documents conventions and population', () => {
    expect(book.conventions?.population).toMatch(/in_team_pool|team-building pool|total≥500|total ≥ 500/i);
    expect(book.conventions?.notes?.length).toBeGreaterThan(0);
    expect(book.conventions?.zeroBaselineBars).not.toBe(false);
  });

  it('preserves the analyst speed-tier user row', () => {
    const hit = allRows.find((x) => x.row.id === 'md-analyst-speed-tiers');
    expect(hit?.tabId).toBe('summary');
    expect(hit?.row.createdBy).toBe('user');
    expect(hit?.row.type).toBe('markdown');
  });

  it('has pages that drive the sidebar', () => {
    expect(book.pages?.length).toBeGreaterThanOrEqual(2);
    const pageTabIds = new Set(book.pages!.flatMap((p) => p.tabIds));
    for (const t of book.tabs) {
      expect(pageTabIds.has(t.id), t.id).toBe(true);
    }
    expect(book.pages!.map((p) => p.label)).toEqual(expect.arrayContaining(['Overview', 'Deep dive']));
  });

  it('has scannable tabs including team pool', () => {
    const labels = book.tabs.map((t) => t.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'Summary',
        'By type',
        'By generation',
        'Legendary',
        'Distributions',
        'Archetypes',
        'Team pool',
      ]),
    );
  });

  it('canonical grain is form × type slot with team pool', () => {
    const meta = getCanonicalMeta();
    expect(meta.rowCount).toBe(1214);
    const table = loadCanonical();
    const species = table.rows.filter((r) => r.is_primary_form === true && r.type_slot === 'Primary');
    expect(species).toHaveLength(721);
    const pool = species.filter((r) => r.in_team_pool === true);
    expect(pool).toHaveLength(134);
  });

  it('summary refs resolve to real charts', () => {
    const ids = new Set(blocks.filter((b) => !b.ref).map((b) => b.id));
    for (const b of blocks.filter((b) => b.ref)) {
      expect(ids.has(b.ref!), b.ref).toBe(true);
    }
  });

  it('bar charts that set yDomain still include 0', () => {
    for (const b of blocks) {
      if (b.ref || !b.recharts) continue;
      const spec = b.recharts;
      if (!spec.chart.toLowerCase().includes('bar') || !spec.yDomain) continue;
      expect(Number(spec.yDomain[0]), b.id).toBeLessThanOrEqual(0);
    }
  });

  it('team-pool speed shares sum to ~1', () => {
    const table = loadCanonical();
    const shares = runQuery(table, {
      filter: [
        { column: 'is_primary_form', op: 'eq', value: true },
        { column: 'type_slot', op: 'eq', value: 'Primary' },
        { column: 'in_team_pool', op: 'eq', value: true },
      ],
      groupBy: ['speed_tier_rank', 'speed_tier'],
      aggregate: [
        { fn: 'sum', column: 'pool_share_unit', as: 'share' },
        { fn: 'count', as: 'n' },
      ],
      orderBy: [{ column: 'speed_tier_rank', direction: 'asc' }],
    });
    expect(shares).toHaveLength(4);
    const total = shares.reduce((s, r) => s + Number(r.share), 0);
    expect(total).toBeGreaterThan(0.99);
    expect(total).toBeLessThan(1.01);
  });
});
