import type { BookDocument } from './types';
import { clearUserRowsOverlay } from './userBookStore';

const PERSIST_PATH = '/api/book';

/**
 * Write the full BookDocument to `src/data/rows.json` (dev server only).
 * This is the canonical, committable book — not localStorage.
 */
export async function persistBookToSource(book: BookDocument): Promise<boolean> {
  if (!import.meta.env.DEV) {
    if (import.meta.env.MODE !== 'test') {
      console.warn('persistBookToSource: only available under `npm run dev`');
    }
    return false;
  }

  try {
    const res = await fetch(PERSIST_PATH, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      console.error('persistBookToSource failed:', body?.error ?? res.statusText);
      return false;
    }
    clearUserRowsOverlay(book);
    return true;
  } catch (err) {
    console.error('persistBookToSource failed:', err);
    return false;
  }
}