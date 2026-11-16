import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MarkdownRow as MarkdownRowModel } from '../../data/types';

type Props = {
  row: MarkdownRowModel;
  onSave?: (body: string) => void;
  onCancel?: () => void;
  startEditing?: boolean;
};

export function MarkdownRow({ row, onSave, onCancel, startEditing = false }: Props) {
  const editable = Boolean(onSave) && row.createdBy === 'user';
  const [editing, setEditing] = useState(editable && (startEditing || row.body === ''));
  const [draft, setDraft] = useState(row.body);

  useEffect(() => {
    setDraft(row.body);
  }, [row.body, row.id]);

  useEffect(() => {
    if (startEditing && editable) setEditing(true);
  }, [startEditing, editable, row.id]);

  const save = () => {
    onSave?.(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(row.body);
    setEditing(false);
    onCancel?.();
  };

  const showBody = row.body.trim().length > 0;

  return (
    <article className={`dbk-row dbk-markdown${editable ? ' dbk-markdown-user' : ''}`}>
      {editable && !editing ? (
        <div className="dbk-markdown-toolbar">
          <button type="button" className="dbk-markdown-edit-btn" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      ) : null}

      {editing ? (
        <div className="dbk-markdown-editor">
          <textarea
            className="dbk-markdown-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, draft.split('\n').length + 1)}
            placeholder="Write markdown…"
            aria-label="Markdown body"
            autoFocus
          />
          <div className="dbk-markdown-editor-actions">
            <button type="button" className="dbk-btn dbk-btn-primary" onClick={save}>
              Save
            </button>
            <button type="button" className="dbk-btn" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : showBody ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.body}</ReactMarkdown>
      ) : editable ? null : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.body}</ReactMarkdown>
      )}
    </article>
  );
}