import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThemeKey } from './components/charts/ResponsiveFrame';
import { ConfirmDialog } from './components/layout/ConfirmDialog';
import { PageLayout } from './components/layout/PageLayout';
import { RowRenderer } from './components/rows/RowRenderer';
import {
  addPage,
  addTab,
  deletePage,
  deleteTab,
  ensureDefaultPage,
  moveBlockInTab,
  normalizePageTabIds,
  renamePage,
  renameTab,
  reorderBlocksBefore,
} from './data/bookEdits';
import { deleteTabFile, writeBookYaml, writeTabFile } from './data/bookPersist';
import {
  insertMarkdownBlock,
  removeMarkdownBlock,
  tabFileContents,
  updateMarkdownBody,
} from './data/insertMarkdown';
import { loadBook } from './data/loadBook';
import { loadCanonical } from './data/loadCanonical';
import {
  adjacentPageAfterDelete,
  pageForTab,
  pickTabForPage,
  pickTabOnPageAfterDelete,
  syncTabToPage,
  tabsForPage,
  validatePageId,
  validateTabId,
} from './data/navBook';
import { serializeBookYaml } from './data/serializeMeta';
import type { BookDocument, TabSection } from './data/types';

function readTabFromUrl(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const q = new URLSearchParams(window.location.search).get('tab');
  if (q) return q;
  const fromHash = window.location.hash.replace(/^#/, '');
  return fromHash || fallback;
}

function readPageFromUrl(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get('page') || fallback;
}

function writeNavToUrl(tabId: string, pageId?: string, replace = true) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tabId);
  if (pageId) url.searchParams.set('page', pageId);
  else url.searchParams.delete('page');
  url.hash = '';
  const next = url.pathname + url.search;
  const cur = window.location.pathname + window.location.search;
  if (next === cur) return;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', next);
}

type ConfirmState = {
  title: string;
  message: string;
  onResolve: (ok: boolean) => void;
};

async function persistTab(tab: TabSection): Promise<string | null> {
  const r = await writeTabFile(tab.sourceFile, tabFileContents(tab));
  return r.ok ? null : r.error ?? 'Save failed';
}

async function persistMeta(book: BookDocument): Promise<string | null> {
  const r = await writeBookYaml(serializeBookYaml(book));
  return r.ok ? null : r.error ?? 'Save failed';
}

export default function App() {
  const [book, setBook] = useState<BookDocument>(() => loadBook());
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const userNavRef = useRef(false);
  const table = useMemo(() => loadCanonical(), []);
  const allTabs = useMemo(() => [...book.tabs].sort((a, b) => a.order - b.order), [book.tabs]);
  const pages = useMemo(() => [...(book.pages ?? [])].sort((a, b) => a.order - b.order), [book.pages]);
  const defaultId = book.defaultTabId ?? allTabs[0]?.id ?? '';

  const [activeTabId, setActiveTabId] = useState(() =>
    validateTabId(loadBook(), readTabFromUrl(defaultId)) ?? defaultId,
  );
  const [activePageId, setActivePageId] = useState(() => {
    const loaded = loadBook();
    const pgs = loaded.pages ?? [];
    const fromUrl = validatePageId(loaded, readPageFromUrl('')) ?? '';
    if (fromUrl) return fromUrl;
    const tab = validateTabId(loaded, readTabFromUrl(defaultId)) ?? defaultId;
    return pageForTab(pgs, tab)?.id ?? pgs[0]?.id ?? '';
  });

  const themeKey = useThemeKey();
  const canEdit = import.meta.env.DEV;

  // Hot reload when agents edit book files on disk.
  useEffect(() => {
    if (!import.meta.hot) return;
    const reload = () => setBook(loadBook());
    import.meta.hot.accept(() => reload());
    import.meta.hot.on('vite:beforeUpdate', reload);
  }, []);

  const applyBook = useCallback((next: BookDocument) => {
    const normalized = ensureDefaultPage(normalizePageTabIds(next));
    setBook(normalized);
    return normalized;
  }, []);

  const tabs = useMemo(
    () => (pages.length ? tabsForPage(book, activePageId) : allTabs),
    [allTabs, book, pages.length, activePageId],
  );

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const requestConfirm = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ title, message, onResolve: resolve });
    });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = book.title || 'DataBook';
  }, [book.title]);

  useEffect(() => {
    if (!pages.length) return;
    const synced = syncTabToPage(pages, activePageId, activeTabId);
    if (synced.pageId !== activePageId) setActivePageId(synced.pageId);
    if (synced.tabId !== activeTabId) setActiveTabId(synced.tabId);
  }, [pages, activePageId, activeTabId]);

  useEffect(() => {
    writeNavToUrl(activeTabId, pages.length ? activePageId : undefined, !userNavRef.current);
    userNavRef.current = false;
  }, [activeTabId, activePageId, pages.length]);

  useEffect(() => {
    const onPop = () => {
      const tab = validateTabId(book, readTabFromUrl(defaultId)) ?? defaultId;
      setActiveTabId(tab);
      if (pages.length) {
        const page = validatePageId(book, readPageFromUrl(pages[0]?.id ?? '')) ?? pages[0]?.id;
        if (page) setActivePageId(page);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [book, defaultId, pages]);

  const selectTab = (tabId: string) => {
    userNavRef.current = true;
    setActiveTabId(tabId);
    const page = pageForTab(pages, tabId);
    if (page) setActivePageId(page.id);
    writeNavToUrl(tabId, page?.id ?? activePageId, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectPage = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    userNavRef.current = true;
    setActivePageId(pageId);
    const nextTab = pickTabForPage(page.tabIds, activeTabId);
    if (nextTab) setActiveTabId(nextTab);
    writeNavToUrl(nextTab ?? activeTabId, pageId, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const insertMarkdown = (afterBlockId: string | null) => {
    if (!activeTab || !canEdit) return;
    const { book: next, block, tab } = insertMarkdownBlock(book, activeTab.id, afterBlockId, '');
    applyBook(next);
    setEditingBlockId(block.id);
    void persistTab(tab).then((err) => setPersistError(err));
  };

  const saveMarkdown = (blockId: string, body: string) => {
    if (!activeTab || !canEdit) return;
    const next = updateMarkdownBody(book, activeTab.id, blockId, body);
    const normalized = applyBook(next);
    const tab = normalized.tabs.find((t) => t.id === activeTab.id)!;
    setEditingBlockId(null);
    void persistTab(tab).then((err) => setPersistError(err));
  };

  const cancelMarkdown = (blockId: string) => {
    if (!activeTab || !canEdit) return;
    const block = activeTab.blocks.find((b) => b.id === blockId);
    if (block?.type === 'markdown' && !block.body.trim()) {
      const next = removeMarkdownBlock(book, activeTab.id, blockId);
      const normalized = applyBook(next);
      const tab = normalized.tabs.find((t) => t.id === activeTab.id)!;
      void persistTab(tab).then((err) => setPersistError(err));
    }
    setEditingBlockId(null);
  };

  const handleAddTab = () => {
    if (!canEdit) return;
    const pageId = pages.length ? activePageId : undefined;
    const { book: next, tab } = addTab(book, { pageId });
    const normalized = applyBook(next);
    userNavRef.current = true;
    setActiveTabId(tab.id);
    void (async () => {
      const errTab = await persistTab(tab);
      const errMeta = await persistMeta(normalized);
      setPersistError(errTab ?? errMeta);
    })();
  };

  const handleAddPage = () => {
    if (!canEdit) return;
    const { book: next, page } = addPage(book);
    const normalized = applyBook(next);
    userNavRef.current = true;
    setActivePageId(page.id);
    setActiveTabId(page.tabIds[0] ?? next.defaultTabId ?? '');
    void (async () => {
      const newTabs = normalized.tabs.filter((t) => page.tabIds.includes(t.id));
      for (const t of newTabs) {
        const err = await persistTab(t);
        if (err) {
          setPersistError(err);
          return;
        }
      }
      setPersistError(await persistMeta(normalized));
    })();
  };

  const handleRenameTab = (tabId: string, label: string) => {
    if (!canEdit) return;
    const normalized = applyBook(renameTab(book, tabId, label));
    const tab = normalized.tabs.find((t) => t.id === tabId);
    if (tab) void persistTab(tab).then((err) => setPersistError(err));
  };

  const handleRenamePage = (pageId: string, label: string) => {
    if (!canEdit) return;
    const normalized = applyBook(renamePage(book, pageId, label));
    void persistMeta(normalized).then((err) => setPersistError(err));
  };

  const handleReorderBlocks = (movedId: string, beforeId: string) => {
    if (!activeTab || !canEdit) return;
    const normalized = applyBook(reorderBlocksBefore(book, activeTab.id, movedId, beforeId));
    const tab = normalized.tabs.find((t) => t.id === activeTab.id)!;
    void persistTab(tab).then((err) => setPersistError(err));
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!activeTab || !canEdit) return;
    const normalized = applyBook(moveBlockInTab(book, activeTab.id, blockId, direction));
    const tab = normalized.tabs.find((t) => t.id === activeTab.id)!;
    void persistTab(tab).then((err) => setPersistError(err));
  };

  const handleDeleteTab = async (tabId: string) => {
    if (!canEdit) return;
    const tab = book.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    const ok = await requestConfirm(
      'Delete tab',
      `Delete tab “${tab.label}” and its markdown file? This cannot be undone.`,
    );
    if (!ok) return;
    const pageTabs = pages.length
      ? (pages.find((p) => p.id === activePageId)?.tabIds ?? [])
      : allTabs.map((t) => t.id);
    const fallback = pickTabOnPageAfterDelete(pageTabs, tabId);
    const file = tab.sourceFile;
    const normalized = applyBook(deleteTab(book, tabId));
    if (fallback) setActiveTabId(fallback);
    const errDel = await deleteTabFile(file);
    const errMeta = await persistMeta(normalized);
    setPersistError(errDel.error ?? errMeta);
  };

  const handleDeletePage = async (pageId: string) => {
    if (!canEdit) return;
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const tabCount = page.tabIds.length;
    const ok = await requestConfirm(
      'Delete page',
      `Delete page “${page.label}” and ${tabCount} tab${tabCount === 1 ? '' : 's'} on it? This cannot be undone.`,
    );
    if (!ok) return;
    const neighbor = adjacentPageAfterDelete(pages, pageId);
    const doomed = book.tabs.filter((t) => page.tabIds.includes(t.id));
    const next = deletePage(book, pageId);
    const normalized = applyBook(next);
    if (neighbor) {
      setActivePageId(neighbor.id);
      setActiveTabId(neighbor.tabIds[0] ?? next.defaultTabId ?? '');
    } else if (next.tabs[0]) {
      setActiveTabId(next.tabs[0].id);
    }
    for (const t of doomed) {
      const err = await deleteTabFile(t.sourceFile);
      if (!err.ok) {
        setPersistError(err.error ?? 'Delete failed');
        return;
      }
    }
    setPersistError(await persistMeta(normalized));
  };

  return (
    <>
      <PageLayout
        title={book.title}
        tabs={tabs}
        activeTabId={activeTab?.id ?? ''}
        onSelectTab={selectTab}
        onAddTab={canEdit ? handleAddTab : undefined}
        onRenameTab={canEdit ? handleRenameTab : undefined}
        onDeleteTab={canEdit ? handleDeleteTab : undefined}
        pages={pages}
        activePageId={activePageId}
        onSelectPage={selectPage}
        onAddPage={canEdit ? handleAddPage : undefined}
        onRenamePage={canEdit ? handleRenamePage : undefined}
        onDeletePage={canEdit ? handleDeletePage : undefined}
        banner={
          persistError ? (
            <div className="dbk-persist-banner dbk-persist-banner-error" role="status">
              Could not save: {persistError}
            </div>
          ) : null
        }
      >
        {activeTab ? (
          <RowRenderer
            key={themeKey}
            blocks={activeTab.blocks}
            table={table}
            editableMarkdown={canEdit}
            onInsertMarkdown={canEdit ? insertMarkdown : undefined}
            onSaveMarkdown={canEdit ? saveMarkdown : undefined}
            onCancelMarkdown={canEdit ? cancelMarkdown : undefined}
            editingBlockId={editingBlockId}
            onReorderBlocks={canEdit ? handleReorderBlocks : undefined}
            onMoveBlock={canEdit ? handleMoveBlock : undefined}
          />
        ) : (
          <p className="dbk-empty-tab">
            No tabs on this page.{' '}
            {canEdit ? (
              <button type="button" className="dbk-link-btn" onClick={handleAddTab}>
                Add a tab
              </button>
            ) : null}
          </p>
        )}
      </PageLayout>
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        onCancel={() => {
          confirmState?.onResolve(false);
          setConfirmState(null);
        }}
        onConfirm={() => {
          confirmState?.onResolve(true);
          setConfirmState(null);
        }}
      />
    </>
  );
}
