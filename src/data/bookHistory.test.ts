import { describe, expect, it } from 'vitest';
import {
  emptyBookHistory,
  isRedoKey,
  isUndoKey,
  recordBookChange,
  redoBook,
  undoBook,
} from './bookHistory';
import type { BookDocument } from './types';

const book = (body: string): BookDocument => ({
  title: 'T',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 0,
      rows: [{ id: 'a', order: 0, createdBy: 'skill', type: 'markdown', body }],
    },
  ],
});

describe('bookHistory', () => {
  it('undo restores the previous book and redo restores the later one', () => {
    const a = book('A');
    const b = book('B');
    const c = book('C');
    let h = emptyBookHistory();
    h = recordBookChange(h, a, b);
    h = recordBookChange(h, b, c);
    const undone = undoBook(h, c);
    expect(undone?.book.tabs[0].rows[0]).toMatchObject({ type: 'markdown', body: 'B' });
    const redone = redoBook(undone!.history, undone!.book);
    expect(redone?.book.tabs[0].rows[0]).toMatchObject({ type: 'markdown', body: 'C' });
  });

  it('skips recording when the book did not change', () => {
    const a = book('A');
    const h = recordBookChange(emptyBookHistory(), a, book('A'));
    expect(h.past).toHaveLength(0);
  });

  it('recognizes undo and redo chords', () => {
    expect(isUndoKey({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBe(true);
    expect(isRedoKey({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false })).toBe(true);
    expect(isRedoKey({ key: 'y', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe(true);
  });
});
