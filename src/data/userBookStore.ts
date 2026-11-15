import { mergeUserRows } from './mergeUserRows';
import type { BookDocument, BookRow, MarkdownRow } from './types';

export type KvStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

const PREFIX = 'databook:user-rows:v1:';

/** Stable key for a book’s in-browser user-row overlay. */
export function userRowsStorageKey(book: BookDocument): string {
  const id = book.experimentId || book.title || 'book';
  return `${PREFIX}${id}`;
}

function memoryFallback(): KvStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

export function defaultKvStore(): KvStore {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryFallback();
}

type StoredOverlay = {
  version: 1;
  tabs: Record<string, BookRow[]>;
};

function extractUserRows(book: BookDocument): StoredOverlay {
  const tabs: Record<string, BookRow[]> = {};
  for (const tab of book.tabs) {
    const users = tab.rows.filter((r) => r.createdBy === 'user');
    if (users.length) tabs[tab.id] = users;
  }
  return { version: 1, tabs };
}

function overlayAsBook(base: BookDocument, overlay: StoredOverlay): BookDocument {
  const tabs = base.tabs.map((tab) => {
    const users = overlay.tabs[tab.id] ?? [];
    return { ...tab, rows: users };
  });
  // Include orphan tabs from overlay so mergeUserRows can throw if skill dropped them.
  for (const tabId of Object.keys(overlay.tabs)) {
    if (!tabs.some((t) => t.id === tabId)) {
      tabs.push({
        id: tabId,
        label: tabId,
        order: tabs.length,
        rows: overlay.tabs[tabId],
      });
    }
  }
  return { ...base, tabs };
}

/** Persist all `createdBy: "user"` rows for this book. */
export function saveUserRows(book: BookDocument, store: KvStore = defaultKvStore()): void {
  const key = userRowsStorageKey(book);
  const overlay = extractUserRows(book);
  store.setItem(key, JSON.stringify(overlay));
}

/**
 * Load skill-authored `base` and merge any browser-persisted user rows
 * (same shape as rows.json markdown rows; survives refresh).
 */
export function loadBookWithUserRows(
  base: BookDocument,
  store: KvStore = defaultKvStore(),
): BookDocument {
  const raw = store.getItem(userRowsStorageKey(base));
  if (!raw) return base;
  let overlay: StoredOverlay;
  try {
    overlay = JSON.parse(raw) as StoredOverlay;
  } catch {
    return base;
  }
  if (!overlay || overlay.version !== 1 || !overlay.tabs) return base;
  if (!Object.keys(overlay.tabs).length) return base;

  const previous = overlayAsBook(base, overlay);
  try {
    return mergeUserRows(previous, base);
  } catch {
    // Tab vanished under user rows — keep base rather than crash the book.
    return base;
  }
}

/** Convenience: replace one user markdown body and persist. */
export function persistMarkdownUpdate(
  book: BookDocument,
  tabId: string,
  rowId: string,
  body: string,
  store: KvStore = defaultKvStore(),
): BookDocument {
  const tabs = book.tabs.map((tab) => {
    if (tab.id !== tabId) return tab;
    return {
      ...tab,
      rows: tab.rows.map((r) => {
        if (r.id !== rowId || r.type !== 'markdown') return r;
        const next: MarkdownRow = { ...r, body, createdBy: 'user' };
        return next;
      }),
    };
  });
  const next = { ...book, tabs };
  saveUserRows(next, store);
  return next;
}
