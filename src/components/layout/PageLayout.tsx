import { useState, type ReactNode } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Sidebar } from './Sidebar';
import { BookTabs } from './BookTabs';
import type { BookPage, TabSection } from '../../data/types';
import { InlineRename } from './InlineRename';

type Props = {
  title: string;
  experimentId?: string;
  tabs: TabSection[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab?: () => void;
  onRenameTab?: (tabId: string, label: string) => void;
  pages?: BookPage[];
  activePageId?: string;
  onSelectPage?: (pageId: string) => void;
  onAddPage?: () => void;
  onRenamePage?: (pageId: string, label: string) => void;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Tabs are the primary section nav. Sidebar appears only when `pages` are defined
 * (page groups), so it never duplicates the tab strip 1:1. On narrow viewports the
 * sidebar is hidden and a sticky horizontal page switcher takes its place.
 * With a single page, the sidebar stays hidden until toggled open.
 */
export function PageLayout({
  title,
  experimentId,
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onRenameTab,
  pages = [],
  activePageId = '',
  onSelectPage,
  onAddPage,
  onRenamePage,
  footer,
  children,
}: Props) {
  const hasPages = pages.length > 0 && Boolean(onSelectPage);
  const [sidebarOpen, setSidebarOpen] = useState(pages.length > 1);
  const showSidebar = hasPages && (pages.length > 1 || sidebarOpen);
  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  return (
    <div
      className={`dbk-shell${
        showSidebar ? ' dbk-shell-with-sidebar' : hasPages ? ' dbk-shell-pages-collapsed' : ' dbk-shell-tabs-only'
      }`}
    >
      {showSidebar ? (
        <Sidebar
          pages={pages}
          activePageId={activePageId}
          onSelectPage={onSelectPage!}
          onAddPage={onAddPage}
          onRenamePage={onRenamePage}
        />
      ) : null}
      <div className="dbk-main-column">
        <header className="dbk-header">
          <div className="dbk-title">
            {title}
            {experimentId ? (
              <>
                <span className="dbk-title-sep"> · </span>
                <span className="dbk-experiment">{experimentId}</span>
              </>
            ) : null}
          </div>
          <div className="dbk-header-actions">
            {!hasPages && onAddPage ? (
              <button type="button" className="dbk-sidebar-toggle" onClick={onAddPage}>
                Add page
              </button>
            ) : null}
            {hasPages && pages.length === 1 ? (
              <button
                type="button"
                className="dbk-sidebar-toggle"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((v) => !v)}
              >
                Pages
              </button>
            ) : null}
            <ThemeToggle />
          </div>
        </header>
        {hasPages ? (
          <div className="dbk-page-switcher" role="navigation" aria-label="Book pages">
            <div className="dbk-page-switcher-scroll">
              {sortedPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="dbk-page-chip"
                  aria-current={page.id === activePageId ? 'page' : undefined}
                  onClick={() => onSelectPage?.(page.id)}
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
              {onAddPage ? (
                <button
                  type="button"
                  className="dbk-page-chip dbk-page-chip-add"
                  onClick={onAddPage}
                  aria-label="Add page"
                  title="Add page"
                >
                  <span className="dbk-insert-gap-plus" aria-hidden="true">
                    +
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <main className="dbk-content">
          <BookTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={onSelectTab}
            onAddTab={onAddTab}
            onRenameTab={onRenameTab}
          >
            {children}
          </BookTabs>
        </main>
        {footer ? <footer className="dbk-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}