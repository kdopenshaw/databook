import type { BookPage, TabSection } from '../../data/types';
import { InlineRename } from './InlineRename';
import { confirmAction } from './confirmAction';

type Props = {
  pages: BookPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage?: () => void;
  onRenamePage?: (pageId: string, label: string) => void;
  onDeletePage?: (pageId: string) => void;
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
  onDeletePage,
  tabs,
  activeTabId,
  onSelectTab,
}: Props) {
  if (pages.length || onAddPage) {
    const sorted = [...pages].sort((a, b) => a.order - b.order);
    return (
      <aside className="dbk-sidebar" aria-label="Book pages">
        <nav className="dbk-sidebar-nav">
          {sorted.map((page) => {
            const active = page.id === activePageId;
            return (
              <div key={page.id} className="dbk-sidebar-row">
                <button
                  type="button"
                  className="dbk-sidebar-item"
                  aria-current={active ? 'page' : undefined}
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
                {active && onDeletePage ? (
                  <button
                    type="button"
                    className="dbk-nav-delete"
                    aria-label={`Delete page ${page.label}`}
                    title="Delete page"
                    onClick={() => {
                      if (
                        confirmAction(
                          `Delete page “${page.label}” and all tabs on it? This cannot be undone.`,
                        )
                      ) {
                        onDeletePage(page.id);
                      }
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          })}
          {onAddPage ? (
            <button
              type="button"
              className="dbk-sidebar-item dbk-sidebar-add-inline"
              onClick={onAddPage}
              aria-label="Add page"
              title="Add page"
            >
              +
            </button>
          ) : null}
        </nav>
      </aside>
    );
  }

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