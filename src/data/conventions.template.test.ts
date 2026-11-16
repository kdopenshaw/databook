/**
 * Light convention checks — copy into a target book if useful.
 * Chart shape/honesty is the agent's job inside `src/charts/*.tsx`.
 */
import { describe, expect, it } from 'vitest';
import type { BookDocument } from './types';
import bookJson from './rows.json';
import understanding from './understanding.md?raw';

const book = bookJson as BookDocument;

describe('book conventions (template)', () => {
  it('documents book-level conventions for the next editor', () => {
    expect(book.conventions, 'set BookDocument.conventions before shipping').toBeTruthy();
  });

  it('keeps understanding.md next to the book (extend-path)', () => {
    expect(understanding.trim().length, 'src/data/understanding.md is required for extend').toBeGreaterThan(0);
  });
});
