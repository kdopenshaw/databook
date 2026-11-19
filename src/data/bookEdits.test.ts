import { describe, expect, it } from 'vitest';
import {
  addPage,
  addTab,
  applyStructureOverlay,
  deletePage,
  deleteTab,
  ensureDefaultPage,
  extractStructureOverlay,
  normalizePageTabIds,
  reorderRowsBefore,
  renameBookTitle,
  renameTab,
} from './bookEdits';
import type { BookDocument } from './types';

const base = (): BookDocument => ({
  title: 'T',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 0,
      rows: [
        { id: 'a', order: 0, createdBy: 'skill', type: 'markdown', body: 'A' },
        { id: 'b', order: 1, createdBy: 'skill', type: 'markdown', body: 'B' },
      ],
    },
  ],
});

describe('bookEdits', () => {
  it('addTab appends a user tab', () => {
    const { book, tab } = addTab(base());
    expect(tab.id).toMatch(/^tab-user-/);
    expect(book.tabs).toHaveLength(2);
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
    expect(renameTab(base(), 'overview', 'Intro').tabs[0].label).toBe('Intro');
  });

  it('renameBookTitle updates title', () => {
    expect(renameBookTitle(base(), ' Cafe Q2 ').title).toBe('Cafe Q2');
    expect(renameBookTitle(base(), '   ').title).toBe('T');
  });

  it('reorderRowsBefore moves a row', () => {
    const next = reorderRowsBefore(base(), 'overview', 'b', 'a');
    const ids = next.tabs[0].rows
      .slice()
      .sort((x, y) => x.order - y.order)
      .map((r) => r.id);
    expect(ids).toEqual(['b', 'a']);
  });

  it('normalizePageTabIds keeps each tab on one page', () => {
    const book: BookDocument = {
      title: 'T',
      tabs: [
        { id: 't1', label: 'A', order: 0, rows: [] },
        { id: 't2', label: 'B', order: 1, rows: [] },
      ],
      pages: [
        { id: 'p1', label: 'P1', order: 0, tabIds: ['t1', 't2'] },
        { id: 'p2', label: 'P2', order: 1, tabIds: ['t2'] },
      ],
    };
    const next = normalizePageTabIds(book);
    expect(next.pages![0].tabIds).toEqual(['t1']);
    expect(next.pages![1].tabIds).toEqual(['t2']);
  });

  it('deleteTab removes tab and membership', () => {
    const book = addPage(base()).book;
    const tabId = book.tabs[0].id;
    const next = deleteTab(book, tabId);
    expect(next.tabs).toHaveLength(0);
    expect(next.pages![0].tabIds).toEqual([]);
  });

  it('deletePage removes listed tabs and recovers a home page', () => {
    const book = addPage(base()).book;
    const pageId = book.pages![0].id;
    const next = deletePage(book, pageId);
    expect(next.pages).toHaveLength(1);
    expect(next.tabs.length).toBeGreaterThan(0);
  });

  it('round-trips structure overlay', () => {
    let book = renameTab(base(), 'overview', 'Home');
    book = reorderRowsBefore(book, 'overview', 'b', 'a');
    const overlay = extractStructureOverlay(book, base());
    const restored = applyStructureOverlay(base(), overlay);
    expect(restored.tabs[0].label).toBe('Home');
    const ids = restored.tabs[0].rows
      .slice()
      .sort((x, y) => x.order - y.order)
      .map((r) => r.id);
    expect(ids).toEqual(['b', 'a']);
  });
});