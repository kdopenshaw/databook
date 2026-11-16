/**
 * Vitest entry for `npm run ok` — not part of the default `npm test` include
 * (see vitest.ok.config.ts).
 */
import { describe, expect, it } from 'vitest';
import type { BookDocument } from './types';
import { checkLiveBook, formatOkIssues } from './okBook';
import { loadCanonical } from './loadCanonical';
import bookJson from './rows.json';

const book = bookJson as BookDocument;

describe('ok book (live)', () => {
  it('passes nonempty query smoke', () => {
    const table = loadCanonical();
    const result = checkLiveBook(book, table);
    if (!result.ok) {
      console.error('ok FAILED:\n' + formatOkIssues(result.issues));
    }
    expect(result.issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});
