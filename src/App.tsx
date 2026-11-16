import { useEffect, useMemo, useState } from 'react';
import { useThemeKey } from './components/charts/ResponsiveFrame';
import { PageLayout } from './components/layout/PageLayout';
import { RowRenderer } from './components/rows/RowRenderer';
import {
  addPage,
  addTab,
  deletePage,
  deleteTab,
  ensureDefaultPage,
  normalizePageTabIds,
  renamePage,
  renameTab,
  reorderRowsBefore,
} from './data/bookEdits';
import { insertMarkdownRow, updateMarkdownBody } from './data/insertMarkdown';
import { loadCanonical } from './data/loadCanonical';
import type { BookDocument, BookPage } from './data/types';
import { persistBookToSource } from './data/persistBook';
import { loadBookWithUserRows } from './data/userBookStore';
import rowsJson from './data/rows.json';

function readTabFromUrl(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const q = new URLSearchParams(window.location.search).get('tab');
  if (q) return q;
  // Legacy hash support (one-time read); new writes use ?tab= only.
  const fromHash = window.location.hash.replace(/^#/, '');
  return fromHash || fallback;
}

function readPageFromUrl(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get('page') || fallback;
}

function writeNavToUrl(tabId: string, pageId?: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tabId);
  if (pageId) url.searchParams.set('page', pageId);
  else url.searchParams.delete('page');
  url.hash = '';
  const next = url.pathname + url.search;
  const cur = window.location.pathname + window.location.search;
  if (next !== cur) {
    window.history.pushState(null, '', next);
  }
}

function pageForTab(pages: BookPage[], tabId: string): BookPage | undefined {
  return pages.find((p) => p.tabIds.includes(tabId));
}

export default function App() {
  const [book, setBook] = useState<BookDocument>(() =>
    ensureDefaultPage(normalizePageTabIds(loadBookWithUserRows(rowsJson as BookDocument))),
  );
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const table = useMemo(() => loadCanonical(), []);
  const allTabs = useMemo(() => [...book.tabs].sort((a, b) => a.order - b.order), [book.tabs]);
  const pages = useMemo(() => [...(book.pages ?? [])].sort((a, b) => a.order - b.order), [book.pages]);
  const defaultId = book.defaultTabId ?? allTabs[0]?.id ?? '';
  const [activeTabId, setActiveTabId] = useState(() => readTabFromUrl(defaultId));
  const defaultPageId = pages[0]?.id ?? '';
  const [activePageId, setActivePageId] = useState(() => {
    const fromUrl = readPageFromUrl('');
    if (fromUrl && pages.some((p) => p.id === fromUrl)) return fromUrl;
    const tab = readTabFromUrl(defaultId);
    return pageForTab(pages, tab)?.id ?? defaultPageId;
  });
  const themeKey = useThemeKey();

  const persist = (next: BookDocument) => {
    const normalized = ensureDefaultPage(normalizePageTabIds(next));
    setBook(normalized);
    void persistBookToSource(normalized);
  };

  const tabs = useMemo(() => {
    if (!pages.length) return allTabs;
    const page = pages.find((p) => p.id === activePageId) ?? pages[0];
  const byId = new Map(allTabs.map((t) => [t.id, t]));
    return (page?.tabIds ?? [])
      .map((id) => byId.get(id))
      .filter((t): t is (typeof allTabs)[number] => Boolean(t));
  }, [allTabs, pages, activePageId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = book.title || 'DataBook';
  }, [book.title]);

  useEffect(() => {
    if (!allTabs.some((t) => t.id === activeTabId) && defaultId) {
      setActiveTabId(defaultId);
    }
  }, [allTabs, activeTabId, defaultId]);

  useEffect(() => {
    if (!pages.length) return;
    const page = pages.find((p) => p.id === activePageId);
    if (!page) {
      setActivePageId(pages[0].id);
      return;
    }
    if (!page.tabIds.includes(activeTabId)) {
      setActiveTabId(page.tabIds[0] ?? defaultId);
    }
  }, [pages, activePageId, activeTabId, defaultId]);

  useEffect(() => {
    writeNavToUrl(activeTabId, pages.length ? activePageId : undefined);
  }, [activeTabId, activePageId, pages.length]);

  useEffect(() => {
    const onPop = () => {
      setActiveTabId(readTabFromUrl(defaultId));
      if (pages.length) setActivePageId(readPageFromUrl(defaultPageId));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [defaultId, defaultPageId, pages.length]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? allTabs[0];

  const selectTab = (tabId: string) => {
    setActiveTabId(tabId);
    const page = pageForTab(pages, tabId);
    if (page) setActivePageId(page.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectPage = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    setActivePageId(pageId);
    const nextTab = page.tabIds.includes(activeTabId) ? activeTabId : page.tabIds[0];
    if (nextTab) setActiveTabId(nextTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const insertMarkdown = (afterRowId: string | null) => {
    if (!activeTab) return;
    const { book: next, row } = insertMarkdownRow(book, activeTab.id, afterRowId, '');
    persist(next);
    setEditingRowId(row.id);
  };

  const saveMarkdown = (rowId: string, body: string) => {
    if (!activeTab) return;
    const next = updateMarkdownBody(book, activeTab.id, rowId, body);
    persist(next);
    setEditingRowId(null);
  };

  const handleAddTab = () => {
    const pageId = pages.length ? activePageId : undefined;
    const { book: next, tab } = addTab(book, { pageId });
    persist(next);
    setActiveTabId(tab.id);
  };

  const handleAddPage = () => {
    const { book: next, page } = addPage(book);
    persist(next);
    setActivePageId(page.id);
    setActiveTabId(page.tabIds[0] ?? next.defaultTabId ?? '');
  };

  const handleRenameTab = (tabId: string, label: string) => {
    persist(renameTab(book, tabId, label));
  };

  const handleRenamePage = (pageId: string, label: string) => {
    persist(renamePage(book, pageId, label));
  };

  const handleReorderRows = (movedId: string, beforeId: string) => {
    if (!activeTab) return;
    persist(reorderRowsBefore(book, activeTab.id, movedId, beforeId));
  };

  const handleDeleteTab = (tabId: string) => {
    const pageTabs = pages.length
      ? (pages.find((p) => p.id === activePageId)?.tabIds ?? [])
      : allTabs.map((t) => t.id);
    const idx = pageTabs.indexOf(tabId);
    const fallback = pageTabs[idx + 1] ?? pageTabs[idx - 1] ?? allTabs.find((t) => t.id !== tabId)?.id;
    persist(deleteTab(book, tabId));
    if (fallback) setActiveTabId(fallback);
  };

  const handleDeletePage = (pageId: string) => {
    const next = deletePage(book, pageId);
    persist(next);
    const remaining = next.pages ?? [];
    if (remaining.length) {
      setActivePageId(remaining[0].id);
      setActiveTabId(remaining[0].tabIds[0] ?? next.defaultTabId ?? '');
    } else if (next.tabs[0]) {
      setActiveTabId(next.tabs[0].id);
    }
  };

  return (
    <PageLayout
      title={book.title}
      tabs={tabs}
      activeTabId={activeTab?.id ?? defaultId}
      onSelectTab={selectTab}
      onAddTab={handleAddTab}
      onRenameTab={handleRenameTab}
      onDeleteTab={handleDeleteTab}
      pages={pages}
      activePageId={activePageId}
      onSelectPage={selectPage}
      onAddPage={handleAddPage}
      onRenamePage={handleRenamePage}
      onDeletePage={handleDeletePage}
    >
      {activeTab ? (
        <RowRenderer
          key={themeKey}
          rows={activeTab.rows}
          table={table}
          book={book}
          onInsertMarkdown={insertMarkdown}
          onSaveMarkdown={saveMarkdown}
          editingRowId={editingRowId}
          onReorderRows={handleReorderRows}
        />
      ) : null}
    </PageLayout>
  );
}