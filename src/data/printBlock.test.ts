import { describe, expect, it } from 'vitest';
import type { Table } from './types';
import {
  formatRowsCsv,
  formatRowsTable,
  printChartBlock,
  PrintBlockError,
} from './printBlock';
import { loadCanonical } from './loadCanonical';

const table: Table = loadCanonical();

describe('printBlock', () => {
  it('formats CSV compactly', () => {
    expect(formatRowsCsv([{ x: 1, y: 2 }, { x: 3, y: 4 }], ['x', 'y'])).toBe('x,y\n1,2\n3,4');
  });

  it('formats aligned text table', () => {
    const out = formatRowsTable(
      [
        { name: 'a', n: 1 },
        { name: 'bb', n: 10 },
      ],
      ['name', 'n'],
    );
    expect(out).toContain('name  n');
    expect(out).toContain('a     1');
    expect(out).toContain('bb    10');
  });

  it('prints MonthlyRevenue via meta.query', () => {
    const result = printChartBlock(table, 'MonthlyRevenue');
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.columns).toEqual(expect.arrayContaining(['month', 'revenue']));
    expect(result.body.split('\n')[0]).toContain('month');
    expect(result.summary).toMatch(/^MonthlyRevenue\s+Monthly revenue/);
  });

  it('supports table format and limit', () => {
    const result = printChartBlock(table, 'MonthlyRevenue', { format: 'table', limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.body).toMatch(/^month\s+revenue/);
    expect(result.summary).toContain('2/');
  });

  it('throws for unknown chart name', () => {
    expect(() => printChartBlock(table, 'Nope')).toThrow(PrintBlockError);
  });
});
