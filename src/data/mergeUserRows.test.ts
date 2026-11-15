import { describe, expect, it } from 'vitest';
import { mergeUserRows } from './mergeUserRows';
import type { BookDocument } from './types';

const base = (): BookDocument => ({
  title: 'T',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      order: 0,
      rows: [
        { id: 'md-1', order: 0, createdBy: 'skill', type: 'markdown', body: 'Skill' },
        { id: 'md-user', order: 1.5, createdBy: 'user', type: 'markdown', body: 'Human note' },
      ],
    },
  ],
});

describe('mergeUserRows', () => {
  it('reinserts user rows by order after regeneration', () => {
    const prev = base();
    const next: BookDocument = {
      title: 'T',
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          order: 0,
          rows: [
            { id: 'md-1', order: 0, createdBy: 'skill', type: 'markdown', body: 'Skill v2' },
            { id: 'md-2', order: 2, createdBy: 'skill', type: 'markdown', body: 'More' },
          ],
        },
      ],
    };
    const merged = mergeUserRows(prev, next);
    expect(merged.tabs[0].rows.map((r) => r.id)).toEqual(['md-1', 'md-user', 'md-2']);
    expect(merged.tabs[0].rows[1]).toMatchObject({ createdBy: 'user', body: 'Human note' });
  });

  it('throws if the user tab disappeared', () => {
    const prev = base();
    const next: BookDocument = {
      title: 'T',
      tabs: [{ id: 'other', label: 'Other', order: 0, rows: [] }],
    };
    expect(() => mergeUserRows(prev, next)).toThrow(/overview/);
  });
});
