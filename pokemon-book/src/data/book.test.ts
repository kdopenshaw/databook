import { describe, expect, it } from 'vitest';
import { loadCanonical } from './loadCanonical';
import { runQuery } from './runQuery';
import type { BookDocument, ChartBlock, DataRow } from './types';
import rowsJson from './rows.json';

const book = rowsJson as BookDocument;
const table = loadCanonical();
const blocks: ChartBlock[] = book.tabs.flatMap((t) => t.rows.flatMap((r) => (r.type === 'component' ? r.components : [])));
const BASE = [
  { column: 'type_slot', op: 'eq' as const, value: 'Primary' },
  { column: 'is_primary_form', op: 'eq' as const, value: true },
];

describe('book structure', () => {
  it('has unique tab, row, and chart ids with contiguous order', () => {
    const ids = [...book.tabs.map((t) => t.id), ...book.tabs.flatMap((t) => t.rows.map((r) => r.id)), ...blocks.map((b) => b.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of book.tabs) expect(t.rows.map((r) => r.order)).toEqual(t.rows.map((_, i) => i));
    expect(book.tabs.some((t) => t.id === book.defaultTabId)).toBe(true);
  });

  it('keeps component rows to at most 3 charts', () => {
    for (const t of book.tabs) for (const r of t.rows) if (r.type === 'component') expect(r.components.length).toBeLessThanOrEqual(3);
  });
});

describe.each(blocks.map((b) => [b.id, b] as const))('chart %s', (_id, block) => {
  const rows = runQuery(table, block.query);

  it('returns rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('only encodes columns the query returns', () => {
    const cols = new Set(Object.keys(rows[0]));
    const spec = block.recharts;
    const keys = [spec.xKey, ...(spec.series ?? []).map((s) => s.dataKey), ...(spec.yKeys ?? []), ...(spec.tooltipKeys ?? [])];
    for (const k of keys) expect(cols, `${block.id} → ${k}`).toContain(k);
    for (const v of Object.values(block.encoding)) if (typeof v === 'string' && cols.has(v)) expect(cols).toContain(v);
  });
});

describe('canonical sanity (numbers quoted in markdown)', () => {
  const one = (q: Parameters<typeof runQuery>[1]): DataRow => runQuery(table, q)[0];

  it('has 721 base species and 1,071 type memberships', () => {
    expect(one({ filter: BASE, aggregate: [{ fn: 'count', as: 'n' }] }).n).toBe(721);
    expect(one({ filter: [BASE[1]], aggregate: [{ fn: 'count', as: 'n' }] }).n).toBe(1071);
  });

  it('legendary vs non-legendary mean totals are 620 vs 404', () => {
    const r = one({
      filter: BASE,
      aggregate: [
        { fn: 'mean', column: 'total_legendary', as: 'leg' },
        { fn: 'mean', column: 'total_nonlegendary', as: 'non' },
        { fn: 'min', column: 'total_legendary', as: 'leg_min' },
      ],
    });
    expect(Math.round(r.leg as number)).toBe(620);
    expect(Math.round(r.non as number)).toBe(404);
    expect(r.leg_min).toBe(580);
  });

  it('Mega/Primal uplift is +100 except one +90', () => {
    const rows = runQuery(table, {
      filter: [BASE[0], { column: 'mega_uplift', op: 'not_null' }],
      groupBy: ['mega_uplift'],
      aggregate: [{ fn: 'count', as: 'n' }],
    });
    expect(rows).toEqual([
      { mega_uplift: 90, n: 1 },
      { mega_uplift: 100, n: 49 },
    ]);
  });
});
