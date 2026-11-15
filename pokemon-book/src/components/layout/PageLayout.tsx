import type { ReactNode } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Sidebar } from './Sidebar';
import { BookTabs } from './BookTabs';
import type { TabSection } from '../../data/types';

type Props = {
  title: string;
  experimentId?: string;
  tabs: TabSection[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  footer?: ReactNode;
  children: ReactNode;
};

export function PageLayout({ title, experimentId, tabs, activeTabId, onSelectTab, footer, children }: Props) {
  return (
    <div className="cb-shell">
      <Sidebar tabs={tabs} activeTabId={activeTabId} onSelect={onSelectTab} />
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
