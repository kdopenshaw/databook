import { orderBetween } from './insertMarkdown';
import type { BookDocument, BookPage, BookRow, TabSection } from './types';

export type TabCatalogEntry = { id: string; label: string; order: number };

export type BookStructureOverlay = {
  tabCatalog?: TabCatalogEntry[];
  pages?: BookPage[];
  rowOrders?: Record<string, string[]>;
};

function newSuffix(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export function newUserTabId(): string {
  return `tab-user-${newSuffix()}`;
}

export function newUserPageId(): string {
  return `page-user-${newSuffix()}`;
}

export function sortedRowIds(rows: BookRow[]): string[] {
  return [...rows].sort((a, b) => a.order - b.order).map((r) => r.id);
}

export function extractStructureOverlay(book: BookDocument, base: BookDocument): BookStructureOverlay | undefined {
  const tabCatalogChanged =
    book.tabs.length !== base.tabs.length ||
    book.tabs.some((t) => {
      const b = base.tabs.find((x) => x.id === t.id);
      return !b || b.label !== t.label || b.order !== t.order;
    });

  const pagesChanged =
    JSON.stringify(book.pages ?? null) !== JSON.stringify(base.pages ?? null);

  const rowOrders: Record<string, string[]> = {};
  for (const tab of book.tabs) {
    const baseTab = base.tabs.find((t) => t.id === tab.id);
    if (!baseTab) continue;
    const a = sortedRowIds(tab.rows).join('\0');
    const b = sortedRowIds(baseTab.rows).join('\0');
    if (a !== b) rowOrders[tab.id] = sortedRowIds(tab.rows);
  }

  const overlay: BookStructureOverlay = {};
  if (tabCatalogChanged) {
    overlay.tabCatalog = book.tabs.map(({ id, label, order }) => ({ id, label, order }));
  }
  if (pagesChanged && book.pages) overlay.pages = book.pages;
  if (Object.keys(rowOrders).length) overlay.rowOrders = rowOrders;

  return Object.keys(overlay).length ? overlay : undefined;
}

export function applyStructureOverlay(base: BookDocument, overlay?: BookStructureOverlay | null): BookDocument {
  if (!overlay) return base;

  let book = base;
  if (overlay.tabCatalog?.length) {
    const baseById = new Map(base.tabs.map((t) => [t.id, t]));
    const tabs: TabSection[] = [...overlay.tabCatalog]
      .sort((a, b) => a.order - b.order)
      .map((meta) => {
        const skill = baseById.get(meta.id);
        if (skill) return { ...skill, label: meta.label, order: meta.order };
        return { id: meta.id, label: meta.label, order: meta.order, rows: [] };
      });
    book = { ...book, tabs };
  }

  if (overlay.pages) {
    book = { ...book, pages: overlay.pages };
  }

  if (overlay.rowOrders) {
    const tabs = book.tabs.map((tab) => {
      const order = overlay.rowOrders![tab.id];
      if (!order?.length) return tab;
      return applyRowOrder(tab, order);
    });
    book = { ...book, tabs };
  }

  return book;
}

export function applyRowOrder(tab: TabSection, ids: string[]): TabSection {
  const byId = new Map(tab.rows.map((r) => [r.id, r]));
  const used = new Set<string>();
  const rows: BookRow[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || used.has(id)) continue;
    used.add(id);
    rows.push({ ...row, order: rows.length });
  }
  const rest = [...tab.rows]
    .filter((r) => !used.has(r.id))
    .sort((a, b) => a.order - b.order);
  for (const row of rest) {
    rows.push({ ...row, order: rows.length });
  }
  return { ...tab, rows };
}

export function addTab(
  book: BookDocument,
  opts?: { label?: string; pageId?: string; activate?: boolean },
): { book: BookDocument; tab: TabSection } {
  const id = newUserTabId();
  const order = book.tabs.reduce((m, t) => Math.max(m, t.order), -1) + 1;
  const tab: TabSection = {
    id,
    label: opts?.label ?? 'New tab',
    order,
    rows: [],
  };
  let pages = book.pages;
  if (pages?.length) {
    const pageId = opts?.pageId ?? pages[0]?.id;
    pages = pages.map((p) =>
      p.id === pageId ? { ...p, tabIds: [...p.tabIds, id] } : p,
    );
  }
  const next = { ...book, tabs: [...book.tabs, tab], pages };
  return { book: next, tab };
}

export function addPage(book: BookDocument, label = 'New page'): { book: BookDocument; page: BookPage } {
  const existingPages = book.pages ?? [];
  const id = newUserPageId();
  const order = existingPages.reduce((m, p) => Math.max(m, p.order), -1) + 1;

  if (!existingPages.length && book.tabs.length) {
    const page: BookPage = {
      id,
      label,
      order: 0,
      tabIds: book.tabs.map((t) => t.id),
    };
    return { book: { ...book, pages: [page] }, page };
  }

  const { book: withTab, tab } = addTab(book, { label: 'Overview' });
  const page: BookPage = { id, label, order, tabIds: [tab.id] };
  const pages = [...(withTab.pages ?? []), page];
  return { book: { ...withTab, pages, tabs: withTab.tabs }, page };
}

export function renameTab(book: BookDocument, tabId: string, label: string): BookDocument {
  const tabs = book.tabs.map((t) => (t.id === tabId ? { ...t, label } : t));
  return { ...book, tabs };
}

export function renamePage(book: BookDocument, pageId: string, label: string): BookDocument {
  if (!book.pages?.length) return book;
  const pages = book.pages.map((p) => (p.id === pageId ? { ...p, label } : p));
  return { ...book, pages };
}

/** Move `movedId` before `targetId` within a tab (recomputes fractional orders). */
export function reorderRowsBefore(
  book: BookDocument,
  tabId: string,
  movedId: string,
  targetId: string,
): BookDocument {
  if (movedId === targetId) return book;
  const tabIndex = book.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex < 0) return book;

  const tab = book.tabs[tabIndex];
  const sorted = [...tab.rows].sort((a, b) => a.order - b.order);
  const from = sorted.findIndex((r) => r.id === movedId);
  const to = sorted.findIndex((r) => r.id === targetId);
  if (from < 0 || to < 0) return book;

  const next = sorted.filter((r) => r.id !== movedId);
  const targetIdx = next.findIndex((r) => r.id === targetId);
  if (targetIdx < 0) return book;

  const before = targetIdx > 0 ? next[targetIdx - 1].order : undefined;
  const after = next[targetIdx].order;
  const moved = { ...sorted[from], order: orderBetween(before, after) };
  next.splice(targetIdx, 0, moved);

  const tabs = book.tabs.map((t, i) => (i === tabIndex ? { ...t, rows: next } : t));
  return { ...book, tabs };
}