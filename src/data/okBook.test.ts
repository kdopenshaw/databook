import { describe, expect, it } from 'vitest';
import type { BookDocument, ChartMeta, Table } from './types';
import { allowsEmptyQuery, checkLiveBook, smokeChartQueries } from './okBook';

const table: Table = {
  schema: [
    { name: 'x', type: 'quantitative' },
    { name: 'y', type: 'quantitative' },
  ],
  rows: [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 8 },
  ],
};

const emptyMeta: ChartMeta = {
  title: 'Empty',
  notes: 'empty ok for this cut',
  query: { filter: [{ column: 'x', op: 'eq', value: 999 }] },
};

describe('okBook', () => {
  it('allowsEmptyQuery recognizes notes opt-in', () => {
    expect(allowsEmptyQuery(emptyMeta)).toBe(true);
    expect(allowsEmptyQuery({ title: 'B', query: {} })).toBe(false);
  });

  it('checkLiveBook reports unused charts when book references none of disk', () => {
    const book: BookDocument = {
      title: 't',
      conventions: { notes: ['test'] },
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          order: 1,
          sourceFile: '01-overview.md',
          blocks: [{ type: 'markdown', id: 'm0', body: 'hi' }],
        },
      ],
    };
    const result = checkLiveBook(book, table);
    expect(result.issues.some((i) => i.code === 'unused-chart')).toBe(true);
  });

  it('smokeChartQueries is empty when no charts referenced', () => {
    const book: BookDocument = {
      title: 't',
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          order: 1,
          sourceFile: '01-overview.md',
          blocks: [],
        },
      ],
    };
    expect(smokeChartQueries(book, table)).toEqual([]);
  });
});
