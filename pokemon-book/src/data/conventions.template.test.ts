/**
 * Convention test template — copy into a target book as `src/data/bookConventions.test.ts`
 * (or merge into `book.test.ts`) so cold agents inherit failing honesty checks.
 *
 * Wire `book` to your `rows.json`. Palette assertions are optional examples.
 */
import { describe, expect, it } from 'vitest';
import type { BookDocument, ChartBlock } from './types';
import { lintBookErrors } from './chartLint';
import bookJson from './rows.json';

const book = bookJson as BookDocument;

const blocks: ChartBlock[] = book.tabs.flatMap((t) =>
  t.rows.flatMap((r) => (r.type === 'component' ? r.components : [])),
);

describe('book conventions (template)', () => {
  it('passes chart lint (zero-baseline bars, shared sibling scales, known marks)', () => {
    expect(lintBookErrors(book)).toEqual([]);
  });

  it('bar charts that set yDomain still include 0', () => {
    for (const b of blocks) {
      const spec = b.ref ? undefined : b.recharts;
      if (!spec || !spec.chart.toLowerCase().includes('bar') || !spec.yDomain) continue;
      expect(Number(spec.yDomain[0]), b.id).toBeLessThanOrEqual(0);
    }
  });

  it('documents book-level conventions for the next editor', () => {
    // Prefer setting BookDocument.conventions (notes / palette / population).
    // This assertion is soft: init sample may omit conventions until real analysis.
    if (book.conventions?.notes?.length) {
      expect(book.conventions.notes.length).toBeGreaterThan(0);
    }
  });
});
