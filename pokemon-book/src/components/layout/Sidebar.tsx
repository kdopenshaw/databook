import type { BookPage, TabSection } from '../../data/types';

type Props = {
  /** When pages exist, sidebar lists pages (primary IA). Otherwise hidden by parent. */
  pages: BookPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  /** Fallback: section jump when no pages — kept for rare single-mode use. */
  tabs?: TabSection[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
};

export function Sidebar({ pages, activePageId, onSelectPage, tabs, activeTabId, onSelectTab }: Props) {
  if (pages.length) {
    const sorted = [...pages].sort((a, b) => a.order - b.order);
    return (
      <aside className="cb-sidebar" aria-label="Book pages">
        <p className="cb-sidebar-label">Pages</p>
        <nav className="cb-sidebar-nav">
          {sorted.map((page) => (
            <button
              key={page.id}
              type="button"
              className="cb-sidebar-item"
              aria-current={page.id === activePageId ? 'page' : undefined}
              onClick={() => onSelectPage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  // Tabs-only books: sidebar is not mounted (PageLayout). This branch is unused.
  if (!tabs?.length || !onSelectTab) return null;
  const sorted = [...tabs].sort((a, b) => a.order - b.order);
  return (
    <aside className="cb-sidebar" aria-label="Book sections">
      <p className="cb-sidebar-label">Sections</p>
      <nav className="cb-sidebar-nav">
        {sorted.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="cb-sidebar-item"
            aria-current={tab.id === activeTabId ? 'page' : undefined}
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
