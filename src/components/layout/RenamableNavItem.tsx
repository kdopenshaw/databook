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
  wrapClassName?: string;
  selectButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  children?: ReactNode;
};

function wrapClassFor(className: string, wrapClassName: string | undefined, active: boolean) {
  const activeClass = active ? ' dbk-nav-item-active' : '';
  if (wrapClassName) return `${wrapClassName}${activeClass}`;
  if (className.includes('dbk-tabs-trigger')) return `dbk-tabs-trigger-wrap${activeClass}`;
  if (className.includes('dbk-page-chip')) return `dbk-page-chip-wrap${activeClass}`;
  return `dbk-sidebar-row${activeClass}`;
}

function CloseGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 2.5l7 7M9.5 2.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RenamableNavItem({
  label,
  active,
  onSelect,
  onCommit,
  onDelete,
  deleteLabel = 'Delete',
  className = 'dbk-sidebar-item',
  wrapClassName,
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
    <div className={wrapClassFor(className, wrapClassName, Boolean(active))}>
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
            {...selectButtonProps}
            className={`${className}${onDelete ? ' dbk-nav-has-close' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={onSelect}
            onDoubleClick={
              onCommit
                ? (e) => {
                    e.preventDefault();
                    setEditing(true);
                  }
                : undefined
            }
            data-state={className.includes('dbk-tabs-trigger') ? (active ? 'active' : 'inactive') : undefined}
            title={onCommit ? 'Double-click to rename' : undefined}
          >
            <span className="dbk-nav-label">{children ?? label}</span>
          </button>
          {active && onDelete ? (
            <button
              type="button"
              className="dbk-nav-delete"
              aria-label={deleteLabel}
              title={deleteLabel}
              onClick={onDelete}
            >
              <CloseGlyph />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}