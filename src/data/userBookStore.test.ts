import { describe, expect, it } from 'vitest';
import { insertMarkdownRow } from './insertMarkdown';
import {
  loadBookWithUserRows,
  saveUserRows,
  userRowsStorageKey,
  type KvStore,
} from './userBookStore';
import type { BookDocument } from './types';

function memoryStore(): KvStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

const base = (): BookDocument => ({
  title: 'T',
  experimentId: 'exp-1',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 0,
      rows: [
        { id: 'md-1', order: 0, createdBy: 'skill', type: 'markdown', body: 'Skill' },
        { id: 'comp-1', order: 1, createdBy: 'skill', type: 'component', components: [] },
      ],
    },
  ],
});

describe('userBookStore', () => {
  it('keys by experimentId', () => {
    expect(userRowsStorageKey(base())).toBe('databook:user-rows:v1:exp-1');
  });

  it('round-trips inserted markdown across load', () => {
    const store = memoryStore();
    const { book } = insertMarkdownRow(base(), 'overview', 'md-1', '## Finding\n\nPersisted.');
    saveUserRows(book, store);

    const reloaded = loadBookWithUserRows(base(), store);
    const user = reloaded.tabs[0].rows.find((r) => r.createdBy === 'user');
    expect(user).toMatchObject({
      type: 'markdown',
      body: '## Finding\n\nPersisted.',
    });
    expect(reloaded.tabs[0].rows.map((r) => r.id)).toEqual([
      'md-1',
      user!.id,
      'comp-1',
    ]);
  });

  it('returns base when store is empty', () => {
    expect(loadBookWithUserRows(base(), memoryStore())).toEqual(base());
  });

});
