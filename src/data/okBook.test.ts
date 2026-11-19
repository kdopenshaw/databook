import { describe, expect, it } from 'vitest';
import type { BookDocument, ComponentRow, Table } from './types';
import { allowsEmptyQuery, checkLiveBook, smokeQueries } from './okBook';

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

function bookOf(row: ComponentRow): BookDocument {
  return {
    title: 't',
    conventions: { notes: ['test'] },
    tabs: [{ id: 'overview', label: 'Overview', order: 0, rows: [row] }],
  };
}

describe('okBook', () => {
  it('allowsEmptyQuery recognizes notes opt-in', () => {
    expect(allowsEmptyQuery({ id: 'a', title: 'A', notes: 'empty ok for this cut' })).toBe(true);
    expect(allowsEmptyQuery({ id: 'b', title: 'B' })).toBe(false);
  });

  it('smokeQueries fails on empty results', () => {
    const book = bookOf({
      id: 'r1',
      order: 1,
      createdBy: 'skill',
      type: 'component',
      components: [
        {
          id: 'empty',
          title: 'Empty',
          component: 'ExponentialCurve',
          query: { filter: [{ column: 'x', op: 'eq', value: 999 }] },
        },
      ],
    });
    const issues = smokeQueries(book, table);
    expect(issues.some((i) => i.code === 'query-empty')).toBe(true);
  });

  it('checkLiveBook passes a healthy sample chart', () => {
    const book = bookOf({
      id: 'r1',
      order: 1,
      createdBy: 'skill',
      type: 'component',
      components: [
        {
          id: 'curve',
          title: 'Curve',
          component: 'ExponentialCurve',
          query: {},
        },
      ],
    });
    const result = checkLiveBook(book, table);
    expect(result.ok).toBe(true);
  });
});
