import { describe, expect, it } from 'vitest';
import { ensureDefaultPage, deleteTab, normalizePageTabIds } from './bookEdits';
import { pickTabForPage, pickTabOnPageAfterDelete, tabsForPage, validateTabId } from './navBook';
import type { BookDocument } from './types';

const bookWithDupPages = (): BookDocument => ({
  title: 'T',
  tabs: [
    { id: 't1', label: 'A', order: 1, sourceFile: '01-t1.md', blocks: [] },
    { id: 't2', label: 'B', order: 2, sourceFile: '02-t2.md', blocks: [] },
  ],
  pages: [
    { id: 'p1', label: 'P1', order: 0, tabIds: ['t1', 't2'] },
    { id: 'p2', label: 'P2', order: 1, tabIds: ['t2'] },
  ],
});

describe('navBook', () => {
  it('tabsForPage only returns tabs owned by page after normalize', () => {
    const book = normalizePageTabIds(bookWithDupPages());
    expect(tabsForPage(book, 'p1').map((t) => t.id)).toEqual(['t1']);
    expect(tabsForPage(book, 'p2').map((t) => t.id)).toEqual(['t2']);
  });

  it('pickTabForPage keeps preferred when on page', () => {
    expect(pickTabForPage(['a', 'b'], 'b')).toBe('b');
    expect(pickTabForPage(['a', 'b'], 'z')).toBe('a');
  });

  it('pickTabOnPageAfterDelete skips removed tab', () => {
    expect(pickTabOnPageAfterDelete(['a', 'b', 'c'], 'b')).toBe('a');
  });

  it('validateTabId falls back when invalid', () => {
    const book = ensureDefaultPage({
      title: 'T',
      tabs: [{ id: 'x', label: 'X', order: 1, sourceFile: '01-x.md', blocks: [] }],
    });
    expect(validateTabId(book, 'missing')).toBe('x');
  });

  it('deleteTab on last tab leaves empty page without cross-page fallback', () => {
    let book = ensureDefaultPage({
      title: 'T',
      tabs: [{ id: 'only', label: 'Only', order: 1, sourceFile: '01-only.md', blocks: [] }],
      pages: [{ id: 'page-home', label: 'Home', order: 0, tabIds: ['only'] }],
    });
    book = deleteTab(book, 'only');
    expect(tabsForPage(book, 'page-home')).toHaveLength(0);
  });
});
