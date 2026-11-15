import { describe, expect, it } from 'vitest';
import type { ColumnSpec, Table } from './types';
import { QueryError, runQuery } from './runQuery';

const schema: ColumnSpec[] = [
  { name: 'id', type: 'categorical' },
  { name: 'date', type: 'temporal' },
  { name: 'group', type: 'categorical', levels: ['b', 'a'] },
  { name: 'x', type: 'quantitative', nullable: true },
  { name: 'n', type: 'quantitative' },
  { name: 'flag', type: 'boolean' },
];

const table: Table = {
  schema,
  rows: [
    { id: 'r1', date: '2026-01-01', group: 'a', x: 1, n: 10, flag: true },
    { id: 'r2', date: '2026-01-01', group: 'b', x: 4, n: 20, flag: false },
    { id: 'r3', date: '2026-01-02', group: 'a', x: null, n: 30, flag: false },
    { id: 'r4', date: '2026-01-03', group: 'a', x: 9, n: 40, flag: true },
    { id: 'r1', date: '2026-01-03', group: 'b', x: 15, n: 50, flag: true },
  ],
};

describe('runQuery', () => {
  it('returns raw rows when nothing is aggregated', () => {
    expect(runQuery(table, {})).toHaveLength(5);
  });

  it('filters, aggregates, orders, and limits', () => {
    const rows = runQuery(table, {
      filter: [{ column: 'group', op: 'eq', value: 'a' }],
      groupBy: ['group'],
      aggregate: [{ fn: 'sum', column: 'n', as: 'n_sum' }],
      orderBy: [{ column: 'n_sum', direction: 'desc' }],
      limit: 1,
    });
    expect(rows).toEqual([{ group: 'a', n_sum: 80 }]);
  });

  it('samples deterministically', () => {
    const a = runQuery(table, { sample: { n: 3, seed: 42 } });
    const b = runQuery(table, { sample: { n: 3, seed: 42 } });
    expect(a).toHaveLength(3);
    expect(a).toEqual(b);
  });

  it('refuses groupBy without aggregate', () => {
    expect(() => runQuery(table, { groupBy: ['group'] })).toThrow(QueryError);
  });

  it('fills empty histogram bins by default', () => {
    const rows = runQuery(table, {
      filter: [{ column: 'x', op: 'not_null' }],
      bin: [{ column: 'x', step: 5 }],
      aggregate: [{ fn: 'count', as: 'n' }],
    });
    // Observed x: 1,4,9,15 → bins 0,5,10,15 — empty 10 should appear with n=0
    expect(rows.map((r) => r.x_bin)).toEqual([0, 5, 10, 15]);
    expect(rows.find((r) => r.x_bin === 10)?.n).toBe(0);
  });
});

