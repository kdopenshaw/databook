import type { BookDocument, BookPage, ContentBlock, TabSection } from './types';

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

export const DEFAULT_HOME_PAGE_ID = 'page-home';

function nextTabFilename(book: BookDocument, id: string): string {
  const max = book.tabs.reduce((m, t) => Math.max(m, t.order), 0);
  const pad = String(max + 1).padStart(2, '0');
  const slug = id.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'tab';
  return `${pad}-${slug}.md`;
}

/** Each tab id appears on at most one page; later pages win ties; orphans attach to the first page. */
export function normalizePageTabIds(book: BookDocument): BookDocument {
  if (!book.pages?.length) return book;
  const sorted = [...book.pages].sort((a, b) => a.order - b.order);
  const owner = new Map<string, string>();
  for (const p of sorted) {
    for (const id of p.tabIds) {
      if (book.tabs.some((t) => t.id === id)) owner.set(id, p.id);
    }
  }
  const pages = sorted.map((p) => ({
    ...p,
    tabIds: p.tabIds.filter((id) => owner.get(id) === p.id),
  }));
  const orphans = book.tabs.filter((t) => !owner.has(t.id)).map((t) => t.id);
  if (orphans.length && pages[0]) {
    pages[0] = { ...pages[0], tabIds: [...pages[0].tabIds, ...orphans] };
  }
  return { ...book, pages };
}

export function addTab(
  book: BookDocument,
  opts?: { label?: string; pageId?: string; attachToPage?: boolean },
): { book: BookDocument; tab: TabSection } {
  const id = newUserTabId();
  const order = book.tabs.reduce((m, t) => Math.max(m, t.order), 0) + 1;
  const tab: TabSection = {
    id,
    label: opts?.label ?? 'New tab',
    order,
    sourceFile: nextTabFilename({ ...book, tabs: [...book.tabs, { id, label: '', order, sourceFile: '', blocks: [] }] }, id),
    blocks: [],
    page: opts?.pageId,
  };
  // Fix sourceFile with correct order padding
  const pad = String(order).padStart(2, '0');
  tab.sourceFile = `${pad}-${id.replace(/[^a-zA-Z0-9_-]+/g, '-')}.md`;

  let pages = book.pages;
  const attach = opts?.attachToPage !== false;
  if (pages?.length && attach) {
    const pageId = opts?.pageId ?? pages[0]?.id;
    tab.page = pageId;
    pages = pages.map((p) => ({
      ...p,
      tabIds:
        p.id === pageId
          ? [...p.tabIds.filter((tid) => tid !== id), id]
          : p.tabIds.filter((tid) => tid !== id),
    }));
  }
  const next = normalizePageTabIds({ ...book, tabs: [...book.tabs, tab], pages });
  return { book: next, tab };
}

/** Tabs-only books get a single home page so the page sidebar is never empty. */
export function ensureDefaultPage(book: BookDocument, label = 'Home'): BookDocument {
  if (book.pages?.length) return normalizePageTabIds(book);
  if (!book.tabs.length) {
    const { book: withTab, tab } = addTab(book, { label: 'Overview', attachToPage: false });
    const page: BookPage = {
      id: DEFAULT_HOME_PAGE_ID,
      label,
      order: 0,
      tabIds: [tab.id],
    };
    return normalizePageTabIds({
      ...withTab,
      pages: [page],
      defaultTabId: tab.id,
      tabs: withTab.tabs.map((t) => (t.id === tab.id ? { ...t, page: page.id } : t)),
    });
  }
  const page: BookPage = {
    id: DEFAULT_HOME_PAGE_ID,
    label,
    order: 0,
    tabIds: book.tabs.map((t) => t.id),
  };
  return normalizePageTabIds({
    ...book,
    pages: [page],
    tabs: book.tabs.map((t) => ({ ...t, page: t.page ?? page.id })),
  });
}

export function addPage(book: BookDocument, label = 'New page'): { book: BookDocument; page: BookPage } {
  const existingPages = book.pages ?? [];
  const id = newUserPageId();
  const order = existingPages.reduce((m, p) => Math.max(m, p.order), -1) + 1;

  if (!existingPages.length && book.tabs.length) {
    const page: BookPage = {
      id: DEFAULT_HOME_PAGE_ID,
      label,
      order: 0,
      tabIds: book.tabs.map((t) => t.id),
    };
    return { book: normalizePageTabIds({ ...book, pages: [page] }), page };
  }

  const { book: withTab, tab } = addTab(book, { label: 'New tab', attachToPage: false });
  const page: BookPage = { id, label, order, tabIds: [tab.id] };
  const tabs = withTab.tabs.map((t) => (t.id === tab.id ? { ...t, page: id } : t));
  const pages = [...(withTab.pages ?? []), page];
  return {
    book: normalizePageTabIds({ ...withTab, pages, tabs }),
    page,
  };
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

export function reorderBlocksBefore(
  book: BookDocument,
  tabId: string,
  movedId: string,
  targetId: string,
): BookDocument {
  if (movedId === targetId) return book;
  const tabIndex = book.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex < 0) return book;

  const tab = book.tabs[tabIndex];
  const from = tab.blocks.findIndex((b) => b.id === movedId);
  const to = tab.blocks.findIndex((b) => b.id === targetId);
  if (from < 0 || to < 0) return book;

  const next = [...tab.blocks];
  const [moved] = next.splice(from, 1);
  const targetIdx = next.findIndex((b) => b.id === targetId);
  next.splice(targetIdx, 0, moved);

  const tabs = book.tabs.map((t, i) => (i === tabIndex ? { ...t, blocks: next } : t));
  return { ...book, tabs };
}

export function reorderBlocksAfter(
  book: BookDocument,
  tabId: string,
  movedId: string,
  afterBlockId: string,
): BookDocument {
  if (movedId === afterBlockId) return book;
  const tabIndex = book.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex < 0) return book;

  const tab = book.tabs[tabIndex];
  const from = tab.blocks.findIndex((b) => b.id === movedId);
  const afterIdx = tab.blocks.findIndex((b) => b.id === afterBlockId);
  if (from < 0 || afterIdx < 0) return book;

  const next = [...tab.blocks];
  const [moved] = next.splice(from, 1);
  const insertAt = next.findIndex((b) => b.id === afterBlockId) + 1;
  next.splice(insertAt, 0, moved);

  const tabs = book.tabs.map((t, i) => (i === tabIndex ? { ...t, blocks: next } : t));
  return { ...book, tabs };
}

export function moveBlockInTab(
  book: BookDocument,
  tabId: string,
  blockId: string,
  direction: 'up' | 'down',
): BookDocument {
  const tab = book.tabs.find((t) => t.id === tabId);
  if (!tab) return book;
  const i = tab.blocks.findIndex((b) => b.id === blockId);
  if (i < 0) return book;
  if (direction === 'up' && i > 0) return reorderBlocksBefore(book, tabId, blockId, tab.blocks[i - 1].id);
  if (direction === 'down' && i < tab.blocks.length - 1) {
    return reorderBlocksAfter(book, tabId, blockId, tab.blocks[i + 1].id);
  }
  return book;
}

/** @deprecated aliases for older call sites */
export const reorderRowsBefore = reorderBlocksBefore;
export const moveRowInTab = moveBlockInTab;

export function deleteTab(book: BookDocument, tabId: string): BookDocument {
  const tabs = book.tabs.filter((t) => t.id !== tabId);
  const pages = book.pages?.map((p) => ({
    ...p,
    tabIds: p.tabIds.filter((id) => id !== tabId),
  }));
  let defaultTabId = book.defaultTabId;
  if (defaultTabId === tabId) defaultTabId = tabs[0]?.id;
  return normalizePageTabIds({ ...book, tabs, pages, defaultTabId });
}

/** Deletes the page and every tab listed on it. */
export function deletePage(book: BookDocument, pageId: string): BookDocument {
  const pages = book.pages ?? [];
  const victim = pages.find((p) => p.id === pageId);
  if (!victim) return book;

  const removeIds = new Set(victim.tabIds);
  const tabs = book.tabs.filter((t) => !removeIds.has(t.id));
  const nextPages = pages.filter((p) => p.id !== pageId);
  let defaultTabId = book.defaultTabId;
  if (defaultTabId && removeIds.has(defaultTabId)) defaultTabId = tabs[0]?.id;

  const partial = { ...book, tabs, pages: nextPages.length ? nextPages : undefined, defaultTabId };
  if (!nextPages.length) return ensureDefaultPage(partial);
  return normalizePageTabIds(partial);
}

export function reindexBlockIds(blocks: ContentBlock[], prefix: string): ContentBlock[] {
  return blocks.map((b, i) => ({ ...b, id: `${prefix}-${i}` }));
}
