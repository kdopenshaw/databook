import { describe, expect, it } from 'vitest';
import {
  addPage,
  addTab,
  deletePage,
  deleteTab,
  ensureDefaultPage,
  normalizePageTabIds,
  reorderBlocksBefore,
  renameTab,
} from './bookEdits';
import type { BookDocument } from './types';

const base = (): BookDocument => ({
  title: 'T',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 1,
      sourceFile: '01-overview.md',
      blocks: [
        { id: 'a', type: 'markdown', body: 'A' },
        { id: 'b', type: 'markdown', body: 'B' },
      ],
    },
  ],
});

describe('bookEdits', () => {
  it('addTab appends a user tab', () => {
    const { book, tab } = addTab(base());
    expect(tab.id).toMatch(/^tab-user-/);
    expect(book.tabs).toHaveLength(2);
    expect(tab.sourceFile).toMatch(/\.md$/);
  });

  it('ensureDefaultPage creates a home page when missing', () => {
    const next = ensureDefaultPage(base());
    expect(next.pages).toHaveLength(1);
    expect(next.pages![0].tabIds).toEqual(['overview']);
  });

  it('addPage wraps existing tabs on first page', () => {
    const { book, page } = addPage(base());
    expect(page.tabIds).toEqual(['overview']);
    expect(book.pages).toHaveLength(1);
  });

  it('renameTab updates label', () => {
    const next = renameTab(base(), 'overview', 'Intro');
    expect(next.tabs[0].label).toBe('Intro');
  });

  it('reorderBlocksBefore moves a block', () => {
    const next = reorderBlocksBefore(base(), 'overview', 'b', 'a');
    expect(next.tabs[0].blocks.map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('deleteTab removes tab from pages', () => {
    const withPage = ensureDefaultPage(base());
    const { book: two } = addTab(withPage, { pageId: withPage.pages![0].id });
    const next = deleteTab(two, 'overview');
    expect(next.tabs.some((t) => t.id === 'overview')).toBe(false);
    expect(next.pages![0].tabIds.includes('overview')).toBe(false);
  });

  it('deletePage removes its tabs', () => {
    const withPage = ensureDefaultPage(base());
    const next = deletePage(withPage, withPage.pages![0].id);
    expect(next.tabs).toHaveLength(1); // ensureDefaultPage recreates
    expect(next.pages?.length).toBeGreaterThan(0);
  });

  it('normalizePageTabIds dedupes ownership', () => {
    const book: BookDocument = {
      title: 'T',
      tabs: [
        { id: 'a', label: 'A', order: 1, sourceFile: '01-a.md', blocks: [] },
        { id: 'b', label: 'B', order: 2, sourceFile: '02-b.md', blocks: [] },
      ],
      pages: [
        { id: 'p1', label: 'P1', order: 0, tabIds: ['a', 'b'] },
        { id: 'p2', label: 'P2', order: 1, tabIds: ['b'] },
      ],
    };
    const next = normalizePageTabIds(book);
    expect(next.pages![0].tabIds).toEqual(['a']);
    expect(next.pages![1].tabIds).toEqual(['b']);
  });
});
