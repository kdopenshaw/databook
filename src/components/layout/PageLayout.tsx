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
 * (page groups), so it never duplicates the tab strip 1:1.
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

  return (
    <div className={`cb-shell${showSidebar ? ' cb-shell-with-sidebar' : ' cb-shell-tabs-only'}`}>
      {showSidebar ? (
        <Sidebar pages={pages} activePageId={activePageId} onSelectPage={onSelectPage!} />
      ) : null}
      <div className="cb-main-column">
        <header className="cb-header">
          <div className="cb-title">
            {title}
            {experimentId ? (
              <>
                <span className="cb-title-sep"> · </span>
                <span className="cb-experiment">{experimentId}</span>
              </>
            ) : null}
          </div>
          <ThemeToggle />
        </header>
        <main className="cb-content">
          <BookTabs tabs={tabs} activeTabId={activeTabId} onSelect={onSelectTab}>
            {children}
          </BookTabs>
        </main>
        {footer ? <footer className="cb-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
