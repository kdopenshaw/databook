import type { ReactNode } from 'react';
import type { TabSection } from '../../data/types';

type Props = {
  tabs: TabSection[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  children: ReactNode;
};

/**
 * Geist-styled tabs primitive.
 * Public npm `geist` is fonts only (@vercel/geistcn 404s), so this implements
 * Geist Tabs visual language (underline list + active border) on Geist tokens.
 */
export function BookTabs({ tabs, activeTabId, onSelect, children }: Props) {
  const sorted = [...tabs].sort((a, b) => a.order - b.order);
  return (
    <div className="cb-tabs">
      <div className="cb-tabs-list" role="tablist" aria-label="Book tabs">
        {sorted.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              className="cb-tabs-trigger"
              data-state={active ? 'active' : 'inactive'}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className="cb-tabs-panel"
        role="tabpanel"
        id={`panel-${activeTabId}`}
        aria-labelledby={`tab-${activeTabId}`}
      >
        {children}
      </div>
    </div>
  );
}
