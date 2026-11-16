import { ensureDefaultPage, normalizePageTabIds } from './bookEdits';
import { loadFullBookOverlay } from './bookOverlay';
import type { BookDocument } from './types';
import { loadBookWithUserRows } from './userBookStore';

export function loadBookForApp(base: BookDocument): BookDocument {
  const overlay = loadFullBookOverlay(base);
  const merged = overlay ?? loadBookWithUserRows(base);
  return ensureDefaultPage(normalizePageTabIds(merged));
}