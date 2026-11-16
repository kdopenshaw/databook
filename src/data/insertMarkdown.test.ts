import { describe, expect, it } from 'vitest';
import { insertMarkdownRow, orderBetween, removeMarkdownRow, updateMarkdownBody } from './insertMarkdown';
import type { BookDocument } from './types';

const book = (): BookDocument => ({
  title: 'T',
  experimentId: 'exp',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 0,
      rows: [
        { id: 'md-1', order: 0, createdBy: 'skill', type: 'markdown', body: 'A' },
        { id: 'comp-1', order: 1, createdBy: 'skill', type: 'component', components: [] },
        { id: 'md-2', order: 2, createdBy: 'skill', type: 'markdown', body: 'B' },
      ],
    },
  ],
});

describe('orderBetween', () => {
  it('midpoint between neighbors', () => {
    expect(orderBetween(0, 2)).toBe(1);
    expect(orderBetween(1, 2)).toBe(1.5);
  });

  it('extends before/after when open-ended', () => {
    expect(orderBetween(undefined, 0)).toBe(-1);
    expect(orderBetween(2, undefined)).toBe(3);
    expect(orderBetween(undefined, undefined)).toBe(0);
  });
});

describe('insertMarkdownRow', () => {
  it('inserts at start, between, and end', () => {
    const start = insertMarkdownRow(book(), 'overview', null, 'start');
    expect(start.row.createdBy).toBe('user');
    expect(start.row.type).toBe('markdown');
    expect(start.book.tabs[0].rows[0].id).toBe(start.row.id);
    expect(start.row.order).toBeLessThan(0);

    const mid = insertMarkdownRow(book(), 'overview', 'md-1', 'mid');
    const ids = mid.book.tabs[0].rows.map((r) => r.id);
    expect(ids.indexOf(mid.row.id)).toBe(1);
    expect(mid.row.order).toBeGreaterThan(0);
    expect(mid.row.order).toBeLessThan(1);

    const end = insertMarkdownRow(book(), 'overview', 'end', 'end');
    expect(end.book.tabs[0].rows.at(-1)?.id).toBe(end.row.id);
    expect(end.row.order).toBeGreaterThan(2);
  });

  it('updateMarkdownBody replaces body', () => {
    const next = updateMarkdownBody(book(), 'overview', 'md-1', 'updated');
    expect(next.tabs[0].rows[0]).toMatchObject({ id: 'md-1', body: 'updated' });
  });

  it('removeMarkdownRow drops a row', () => {
    const next = removeMarkdownRow(book(), 'overview', 'md-1');
    expect(next.tabs[0].rows.some((r) => r.id === 'md-1')).toBe(false);
  });
});
