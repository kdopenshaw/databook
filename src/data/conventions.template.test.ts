/**
 * Light convention checks — copy into a target book if useful.
 * Chart shape/honesty is the agent's job inside `src/charts/*.tsx`.
 */
import { describe, expect, it } from 'vitest';
import { loadBook } from './loadBook';
import understanding from './understanding.md?raw';

describe('book conventions (template)', () => {
  it('documents book-level conventions for the next editor', () => {
    const book = loadBook();
    expect(book.conventions, 'set book.yaml conventions before shipping').toBeTruthy();
  });

  it('keeps understanding.md next to the book (extend-path)', () => {
    expect(understanding.trim().length, 'src/data/understanding.md is required for extend').toBeGreaterThan(0);
  });
});
