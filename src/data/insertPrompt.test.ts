import { describe, expect, it } from 'vitest';
import { insertPromptRow, updatePromptRow } from './insertPrompt';
import type { BookDocument } from './types';

const book = (): BookDocument => ({
  title: 'T',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 0,
      rows: [{ id: 'md-1', order: 0, createdBy: 'skill', type: 'markdown', body: 'A' }],
    },
  ],
});

describe('insertPromptRow', () => {
  it('inserts a draft prompt after a row', () => {
    const { book: next, row } = insertPromptRow(book(), 'overview', 'md-1', '');
    expect(row.type).toBe('prompt');
    expect(row.createdBy).toBe('user');
    expect(row.status).toBe('draft');
    expect(next.tabs[0].rows[1].id).toBe(row.id);
    expect(row.order).toBeGreaterThan(0);
  });

  it('updatePromptRow patches fields', () => {
    const { book: withRow, row } = insertPromptRow(book(), 'overview', 'md-1');
    const next = updatePromptRow(withRow, 'overview', row.id, { prompt: 'bar chart', status: 'running' });
    const updated = next.tabs[0].rows.find((r) => r.id === row.id);
    expect(updated).toMatchObject({ type: 'prompt', prompt: 'bar chart', status: 'running' });
  });
});
