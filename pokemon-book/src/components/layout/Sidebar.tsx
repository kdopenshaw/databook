import type { TabSection } from '../../data/types';

type Props = {
  tabs: TabSection[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
};

export function Sidebar({ tabs, activeTabId, onSelect }: Props) {
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
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
