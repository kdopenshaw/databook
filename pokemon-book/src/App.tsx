import { useEffect, useMemo, useState } from 'react';
import { useThemeKey } from './components/charts/ResponsiveFrame';
import { PageLayout } from './components/layout/PageLayout';
import { RowRenderer } from './components/rows/RowRenderer';
import { getCanonicalMeta, loadCanonical } from './data/loadCanonical';
import type { BookDocument } from './data/types';
import rowsJson from './data/rows.json';

function readTabFromUrl(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const fromHash = window.location.hash.replace(/^#/, '');
  if (fromHash) return fromHash;
  const q = new URLSearchParams(window.location.search).get('tab');
  return q || fallback;
}

function writeTabToUrl(tabId: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tabId);
  url.hash = tabId;
  window.history.replaceState(null, '', url.toString());
}

export default function App() {
  const book = rowsJson as BookDocument;
  const table = useMemo(() => loadCanonical(), []);
  const meta = useMemo(() => getCanonicalMeta(), []);
  const tabs = useMemo(() => [...book.tabs].sort((a, b) => a.order - b.order), [book.tabs]);
  const defaultId = book.defaultTabId ?? tabs[0]?.id ?? '';
  const [activeTabId, setActiveTabId] = useState(() => readTabFromUrl(defaultId));
  const themeKey = useThemeKey();

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId) && defaultId) {
      setActiveTabId(defaultId);
    }
  }, [tabs, activeTabId, defaultId]);

  useEffect(() => {
    writeTabToUrl(activeTabId);
  }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const selectTab = (tabId: string) => {
    setActiveTabId(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PageLayout
      title={book.title}
      experimentId={book.experimentId}
      tabs={tabs}
      activeTabId={activeTab?.id ?? defaultId}
      onSelectTab={selectTab}
      footer={
        <>
          canonical {meta.hash ?? '—'} · {meta.rowCount.toLocaleString('en-US')} rows
          {meta.builtAt ? ` · built ${meta.builtAt.slice(0, 16).replace('T', ' ')} UTC` : ''}
          {book.generatedAt ? ` · book ${book.generatedAt.slice(0, 10)}` : ''}
        </>
      }
    >
      {activeTab ? <RowRenderer key={themeKey} rows={activeTab.rows} table={table} /> : null}
    </PageLayout>
  );
}
