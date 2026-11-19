import { useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { CloseIcon } from './icons';
import { RenameInput } from './InlineRename';

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

  const startRename = () => {
    if (onCommit) setEditing(true);
  };

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    selectButtonProps?.onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (onCommit && (e.key === 'F2' || (e.key === 'Enter' && active && className.includes('dbk-sidebar-item')))) {
      e.preventDefault();
      startRename();
    }
  };

  return (
    <div className={wrapClassFor(className, wrapClassName, Boolean(active))}>
      {editing && onCommit ? (
        <RenameInput
          value={label}
          className="dbk-nav-rename-input"
          ariaLabel={`Rename ${label}`}
          onCommit={(next) => {
            onCommit(next);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <button
            type="button"
            {...selectButtonProps}
            className={`${className}${onDelete ? ' dbk-nav-has-close' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (active && onCommit) startRename();
              else onSelect();
            }}
            onDoubleClick={
              onCommit
                ? (e) => {
                    e.preventDefault();
                    startRename();
                  }
                : undefined
            }
            onKeyDown={onButtonKeyDown}
            data-state={className.includes('dbk-tabs-trigger') ? (active ? 'active' : 'inactive') : undefined}
            title={onCommit ? 'Click to rename' : undefined}
          >
            <span className="dbk-nav-label">{children ?? label}</span>
          </button>
          {onDelete ? (
            <button
              type="button"
              className="dbk-nav-delete"
              aria-label={deleteLabel}
              title={deleteLabel}
              onClick={onDelete}
            >
              <CloseIcon />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
