/**
 * Vitest entry for `npm run ok` — not part of the default `npm test` include
 * (see vitest.ok.config.ts).
 */
import { describe, expect, it } from 'vitest';
import { checkLiveBook, formatOkIssues } from './okBook';
import { loadBook } from './loadBook';
import { loadCanonical } from './loadCanonical';

describe('ok book (live)', () => {
  it('passes structure + nonempty query smoke', () => {
    const book = loadBook();
    const table = loadCanonical();
    const result = checkLiveBook(book, table);
    if (!result.ok) {
      console.error('ok FAILED:\n' + formatOkIssues(result.issues));
    }
    expect(result.issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});
