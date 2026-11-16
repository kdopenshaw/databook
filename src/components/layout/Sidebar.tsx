import type { BookPage, TabSection } from '../../data/types';
import { InlineRename } from './InlineRename';

type Props = {
  /** When pages exist, sidebar lists pages (primary IA). Otherwise hidden by parent. */
  pages: BookPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage?: () => void;
  onRenamePage?: (pageId: string, label: string) => void;
  /** Fallback: section jump when no pages — kept for rare single-mode use. */
  tabs?: TabSection[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
};

export function Sidebar({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  tabs,
  activeTabId,
  onSelectTab,
}: Props) {
  if (pages.length || onAddPage) {
    const sorted = [...pages].sort((a, b) => a.order - b.order);
    return (
      <aside className="dbk-sidebar" aria-label="Book pages">
        <nav className="dbk-sidebar-nav">
          {sorted.map((page) => (
            <button
              key={page.id}
              type="button"
              className="dbk-sidebar-item"
              aria-current={page.id === activePageId ? 'page' : undefined}
              onClick={() => onSelectPage(page.id)}
            >
              {onRenamePage ? (
                <InlineRename
                  value={page.label}
                  onCommit={(label) => onRenamePage(page.id, label)}
                  ariaLabel={`Rename page ${page.label}`}
                />
              ) : (
                page.label
              )}
            </button>
          ))}
        </nav>
        {onAddPage ? (
          <button
            type="button"
            className="dbk-sidebar-add-bottom"
            onClick={onAddPage}
            aria-label="Add page"
            title="Add page"
          >
            <span className="dbk-insert-gap-plus" aria-hidden="true">
              +
            </span>
          </button>
        ) : null}
      </aside>
    );
  }

  // Tabs-only books: sidebar is not mounted (PageLayout). This branch is unused.
  if (!tabs?.length || !onSelectTab) return null;
  const sorted = [...tabs].sort((a, b) => a.order - b.order);
  return (
    <aside className="dbk-sidebar" aria-label="Book sections">
      <nav className="dbk-sidebar-nav">
        {sorted.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="dbk-sidebar-item"
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