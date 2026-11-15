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

  it('computes share and conditional aggregates', () => {
    const byGroup = runQuery(table, {
      groupBy: ['group'],
      aggregate: [
        { fn: 'share', column: 'flag', as: 'flag_share' },
        { fn: 'count_if', where: { column: 'flag', op: 'eq', value: true }, as: 'flag_n' },
        { fn: 'sum_if', column: 'n', where: { column: 'flag', op: 'eq', value: true }, as: 'flag_n_sum' },
        { fn: 'mean_if', column: 'n', where: { column: 'flag', op: 'eq', value: true }, as: 'flag_n_mean' },
      ],
      orderBy: [{ column: 'group', direction: 'asc' }],
    });
    // levels order: b, a — but orderBy group asc uses level order (b before a)
    const a = byGroup.find((r) => r.group === 'a')!;
    const b = byGroup.find((r) => r.group === 'b')!;
    // group a: r1 flag T, r3 F, r4 T → share 2/3, flag_n 2, sum 10+40=50, mean 25
    expect(a.flag_share).toBeCloseTo(2 / 3);
    expect(a.flag_n).toBe(2);
    expect(a.flag_n_sum).toBe(50);
    expect(a.flag_n_mean).toBe(25);
    // group b: r2 F, r1(dup id) T → share 1/2
    expect(b.flag_share).toBeCloseTo(0.5);
    expect(b.flag_n).toBe(1);
  });

  it('computes share with where as matching-row proportion', () => {
    const rows = runQuery(table, {
      groupBy: ['group'],
      aggregate: [{ fn: 'share', where: { column: 'n', op: 'gte', value: 30 }, as: 'big_share' }],
    });
    const a = rows.find((r) => r.group === 'a')!;
    // a: n 10,30,40 → 2 of 3 ≥ 30
    expect(a.big_share).toBeCloseTo(2 / 3);
  });
});

