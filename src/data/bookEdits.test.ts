import { describe, expect, it } from 'vitest';
import {
  addPage,
  addTab,
  applyStructureOverlay,
  extractStructureOverlay,
  reorderRowsBefore,
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

  it('addPage wraps existing tabs on first page', () => {
    const { book, page } = addPage(base());
    expect(page.tabIds).toEqual(['overview']);
    expect(book.pages).toHaveLength(1);
  });

  it('renameTab updates label', () => {
    expect(renameTab(base(), 'overview', 'Intro').tabs[0].label).toBe('Intro');
  });

  it('reorderRowsBefore moves a row', () => {
    const next = reorderRowsBefore(base(), 'overview', 'b', 'a');
    const ids = next.tabs[0].rows
      .slice()
      .sort((x, y) => x.order - y.order)
      .map((r) => r.id);
    expect(ids).toEqual(['b', 'a']);
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