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

  it('prints the stat distribution and covers all retained Pokémon', () => {
    const result = printChartBlock(book, table, 'stat-distribution');
    expect(result.rowCount).toBe(12);
    expect(result.body.split('\n')[0]).toBe('total_bin,total_bin_end,other_count,legendary_count');
    expect(result.rows.reduce((sum, row) => sum + Number(row.legendary_count), 0)).toBe(46);
    expect(result.rows.reduce((sum, row) => sum + Number(row.other_count), 0)).toBe(675);
  });

  it('supports table format and limit', () => {
    const result = printChartBlock(book, table, 'speed-by-type', { format: 'table', limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.type)).toEqual(['Flying', 'Electric']);
    expect(result.body).toMatch(/^type\s+mean_speed\s+count/);
    expect(result.summary).toContain('2/18 rows');
  });

  it('throws for unknown chart id', () => {
    expect(() => printChartBlock(book, table, 'nope')).toThrow(PrintBlockError);
  });
});
