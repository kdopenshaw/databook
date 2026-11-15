import type { ReactNode } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Sidebar } from './Sidebar';
import { BookTabs } from './BookTabs';
import type { BookPage, TabSection } from '../../data/types';

type Props = {
  title: string;
  experimentId?: string;
  tabs: TabSection[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  pages?: BookPage[];
  activePageId?: string;
  onSelectPage?: (pageId: string) => void;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Tabs are the primary section nav. Sidebar appears only when `pages` are defined
 * (page groups), so it never duplicates the tab strip 1:1. On narrow viewports the
 * sidebar is hidden and a sticky horizontal page switcher takes its place.
 */
export function PageLayout({
  title,
  experimentId,
  tabs,
  activeTabId,
  onSelectTab,
  pages = [],
  activePageId = '',
  onSelectPage,
  footer,
  children,
}: Props) {
  const showSidebar = pages.length > 0 && Boolean(onSelectPage);
  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  return (
    <div className={`dbk-shell${showSidebar ? ' dbk-shell-with-sidebar' : ' dbk-shell-tabs-only'}`}>
      {showSidebar ? (
        <Sidebar pages={pages} activePageId={activePageId} onSelectPage={onSelectPage!} />
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
          <ThemeToggle />
        </header>
        {showSidebar ? (
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
                  {page.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <main className="dbk-content">
          <BookTabs tabs={tabs} activeTabId={activeTabId} onSelect={onSelectTab}>
            {children}
          </BookTabs>
        </main>
        {footer ? <footer className="dbk-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
