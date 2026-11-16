import { describe, expect, it } from 'vitest';
import {
  insertMarkdownBlock,
  removeMarkdownBlock,
  updateMarkdownBody,
} from './insertMarkdown';
import type { BookDocument } from './types';

const book = (): BookDocument => ({
  title: 'T',
  experimentId: 'exp',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 1,
      sourceFile: '01-overview.md',
      blocks: [
        { id: 'md-1', type: 'markdown', body: 'A' },
        { id: 'charts-1', type: 'charts', charts: [{ name: 'MonthlyRevenue' }] },
        { id: 'md-2', type: 'markdown', body: 'B' },
      ],
    },
  ],
});

describe('insertMarkdownBlock', () => {
  it('inserts at start, between, and end', () => {
    const start = insertMarkdownBlock(book(), 'overview', null, 'start');
    expect(start.block.type).toBe('markdown');
    expect(start.book.tabs[0].blocks[0].id).toBe(start.block.id);
    expect(start.block.body).toBe('start');

    const mid = insertMarkdownBlock(book(), 'overview', 'md-1', 'mid');
    const ids = mid.book.tabs[0].blocks.map((r) => r.id);
    expect(ids.indexOf(mid.block.id)).toBe(1);

    const end = insertMarkdownBlock(book(), 'overview', 'end', 'end');
    expect(end.book.tabs[0].blocks.at(-1)?.id).toBe(end.block.id);
  });

  it('updateMarkdownBody replaces body', () => {
    const next = updateMarkdownBody(book(), 'overview', 'md-1', 'updated');
    expect(next.tabs[0].blocks[0]).toMatchObject({ id: 'md-1', body: 'updated' });
  });

  it('removeMarkdownBlock drops a block', () => {
    const next = removeMarkdownBlock(book(), 'overview', 'md-1');
    expect(next.tabs[0].blocks.some((r) => r.id === 'md-1')).toBe(false);
  });
});
