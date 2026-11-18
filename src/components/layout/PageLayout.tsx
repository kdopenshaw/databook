import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Sidebar } from './Sidebar';
import { BookTabs } from './BookTabs';
import { PanelToggle } from './PanelToggle';
import type { BookPage, TabSection } from '../../data/types';
import { RenamableNavItem } from './RenamableNavItem';

type Props = {
  title: string;
  tabs: TabSection[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab?: () => void;
  onRenameTab?: (tabId: string, label: string) => void;
  onDeleteTab?: (tabId: string) => void;
  pages?: BookPage[];
  activePageId?: string;
  onSelectPage?: (pageId: string) => void;
  onAddPage?: () => void;
  onRenamePage?: (pageId: string, label: string) => void;
  onDeletePage?: (pageId: string) => void;
  banner?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function PageLayout({
  title,
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  pages = [],
  activePageId = '',
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  banner,
  footer,
  children,
}: Props) {
  const hasPages = pages.length > 0 && Boolean(onSelectPage);
  const pageNav = Boolean(onAddPage);
  const [sidebarOpen, setSidebarOpen] = useState(pages.length > 1);
  const showSidebar = pageNav && sidebarOpen;
  const sortedPages = [...pages].sort((a, b) => a.order - b.order);
  const showMobileSwitcher = hasPages && pages.length > 1;

  useEffect(() => {
    if (!showSidebar) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSidebar]);

  return (
    <div
      className={`dbk-shell${showSidebar ? ' dbk-shell-sidebar-open' : ''}${
        pages.length > 1 ? ' dbk-shell-multi-page' : ''
      }`}
    >
      {showSidebar ? (
        <>
          <button
            type="button"
            className="dbk-sidebar-backdrop"
            aria-label="Close pages sidebar"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar
            pages={pages}
            activePageId={activePageId}
            onSelectPage={(id) => onSelectPage?.(id)}
            onAddPage={onAddPage}
            onRenamePage={onRenamePage}
            onDeletePage={onDeletePage}
          />
        </>
      ) : null}
      <div className="dbk-main-column">
        {banner}
        <header className="dbk-header">
          {pageNav ? (
            <PanelToggle expanded={showSidebar} onClick={() => setSidebarOpen((v) => !v)} />
          ) : null}
          <div className="dbk-title">{title}</div>
          <div className="dbk-header-actions">
            <ThemeToggle />
          </div>
        </header>
        {showMobileSwitcher ? (
          <div className="dbk-page-switcher" role="navigation" aria-label="Book pages">
            <div className="dbk-page-switcher-scroll">
              {sortedPages.map((page) => (
                <RenamableNavItem
                  key={page.id}
                  label={page.label}
                  active={page.id === activePageId}
                  className="dbk-page-chip"
                  wrapClassName="dbk-page-chip-wrap"
                  onSelect={() => onSelectPage?.(page.id)}
                  onCommit={onRenamePage ? (label) => onRenamePage(page.id, label) : undefined}
                />
              ))}
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
            onDeleteTab={onDeleteTab}
          >
            {children}
          </BookTabs>
        </main>
        {footer ? <footer className="dbk-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}