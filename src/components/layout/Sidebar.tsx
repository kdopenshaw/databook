import type { BookPage } from '../../data/types';
import { RenamableNavItem } from './RenamableNavItem';

type Props = {
  pages: BookPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage?: () => void;
  onRenamePage?: (pageId: string, label: string) => void;
  onDeletePage?: (pageId: string) => void;
};

export function Sidebar({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
}: Props) {
  const sorted = [...pages].sort((a, b) => a.order - b.order);
  return (
    <aside className="dbk-sidebar" aria-label="Book pages">
      <nav className="dbk-sidebar-nav">
        {sorted.map((page) => (
          <RenamableNavItem
            key={page.id}
            label={page.label}
            active={page.id === activePageId}
            onSelect={() => onSelectPage(page.id)}
            onCommit={onRenamePage ? (label) => onRenamePage(page.id, label) : undefined}
            onDelete={onDeletePage ? () => onDeletePage(page.id) : undefined}
            deleteLabel={`Delete page ${page.label}`}
          />
        ))}
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