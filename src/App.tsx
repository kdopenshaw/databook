import { useEffect, useMemo, useState } from 'react';
import { useThemeKey } from './components/charts/ResponsiveFrame';
import { PageLayout } from './components/layout/PageLayout';
import { RowRenderer } from './components/rows/RowRenderer';
import { getCanonicalMeta, loadCanonical } from './data/loadCanonical';
import type { BookDocument, BookPage } from './data/types';
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
  const book = rowsJson as BookDocument;
  const table = useMemo(() => loadCanonical(), []);
  const meta = useMemo(() => getCanonicalMeta(), []);
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

  const tabs = useMemo(() => {
    if (!pages.length) return allTabs;
    const page = pages.find((p) => p.id === activePageId) ?? pages[0];
    const idSet = new Set(page?.tabIds ?? []);
    return allTabs.filter((t) => idSet.has(t.id));
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

  return (
    <PageLayout
      title={book.title}
      experimentId={book.experimentId}
      tabs={tabs}
      activeTabId={activeTab?.id ?? defaultId}
      onSelectTab={selectTab}
      pages={pages}
      activePageId={activePageId}
      onSelectPage={pages.length ? selectPage : undefined}
      footer={
        <>
          canonical {meta.hash ?? '—'} · {meta.rowCount.toLocaleString('en-US')} rows
          {meta.builtAt ? ` · built ${meta.builtAt.slice(0, 16).replace('T', ' ')} UTC` : ''}
          {book.generatedAt ? ` · book ${book.generatedAt.slice(0, 10)}` : ''}
        </>
      }
    >
      {activeTab ? <RowRenderer key={themeKey} rows={activeTab.rows} table={table} book={book} /> : null}
    </PageLayout>
  );
}
