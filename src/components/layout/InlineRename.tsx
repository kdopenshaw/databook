import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Props = {
  value: string;
  onCommit: (next: string) => void;
  className?: string;
  ariaLabel?: string;
};

/** Double-click label to edit; Enter commits, Escape cancels. */
export function InlineRename({ value, onCommit, className = '', ariaLabel }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className={`dbk-inline-rename-input ${className}`.trim()}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel ?? 'Rename'}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`dbk-inline-rename-label ${className}`.trim()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Double-click to rename"
    >
      {value}
    </span>
  );
}