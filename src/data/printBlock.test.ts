import { describe, expect, it } from 'vitest';
import type { BookDocument, Table } from './types';
import {
  formatRowsCsv,
  formatRowsTable,
  printChartBlock,
  PrintBlockError,
} from './printBlock';
import bookJson from './rows.json';
import { loadCanonical } from './loadCanonical';

const book = bookJson as BookDocument;
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

  it('prints exponential-curve via runQuery', () => {
    const result = printChartBlock(book, table, 'exponential-curve');
    expect(result.rowCount).toBe(9);
    expect(result.columns).toEqual(expect.arrayContaining(['x', 'y']));
    expect(result.body.split('\n')[0]).toBe('x,y');
    expect(result.summary).toMatch(/^exponential-curve\s+Exponential curve/);
  });

  it('supports table format and limit', () => {
    const result = printChartBlock(book, table, 'exponential-curve', { format: 'table', limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.body).toMatch(/^x\s+y/);
    expect(result.summary).toContain('2/9 rows');
  });

  it('throws for unknown chart id', () => {
    expect(() => printChartBlock(book, table, 'nope')).toThrow(PrintBlockError);
  });
});
