import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

type Props = {
  label: string;
  active?: boolean;
  onSelect: () => void;
  onCommit?: (label: string) => void;
  onDelete?: () => void;
  deleteLabel?: string;
  className?: string;
  selectButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  children?: ReactNode;
};

export function RenamableNavItem({
  label,
  active,
  onSelect,
  onCommit,
  onDelete,
  deleteLabel = 'Delete',
  className = 'dbk-sidebar-item',
  selectButtonProps,
  children,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(label), [label]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) onCommit?.(trimmed);
    else setDraft(label);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(label);
      setEditing(false);
    }
  };

  return (
    <div
      className={
        className.includes('dbk-tabs-trigger')
          ? `dbk-tabs-trigger-wrap${active ? ' dbk-nav-item-active' : ''}`
          : `dbk-sidebar-row${active ? ' dbk-nav-item-active' : ''}`
      }
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="dbk-inline-rename-input dbk-nav-rename-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          aria-label={`Rename ${label}`}
        />
      ) : (
        <>
          <button
            type="button"
            className={className}
            aria-current={active ? 'page' : undefined}
            onClick={onSelect}
            data-state={className.includes('dbk-tabs-trigger') ? (active ? 'active' : 'inactive') : undefined}
            {...selectButtonProps}
          >
            <span className="dbk-nav-label">{children ?? label}</span>
          </button>
          {onCommit ? (
            <button
              type="button"
              className="dbk-nav-rename-btn"
              aria-label={`Rename ${label}`}
              title="Rename"
              onClick={() => setEditing(true)}
            >
              ✎
            </button>
          ) : null}
          {active && onDelete ? (
            <button
              type="button"
              className="dbk-nav-delete"
              aria-label={deleteLabel}
              title={deleteLabel}
              onClick={onDelete}
            >
              ×
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}