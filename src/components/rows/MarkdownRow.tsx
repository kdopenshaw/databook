import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MarkdownRow as MarkdownRowModel } from '../../data/types';

type Props = {
  row: MarkdownRowModel;
  /** When set, this row can be edited and saved in place. */
  onSave?: (body: string) => void;
  /** Open the editor immediately (e.g. freshly inserted empty row). */
  startEditing?: boolean;
};

export function MarkdownRow({ row, onSave, startEditing = false }: Props) {
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
  };

  return (
    <article className={`cb-row cb-markdown${editable ? ' cb-markdown-user' : ''}`}>
      {editable && !editing ? (
        <div className="cb-markdown-toolbar">
          <button type="button" className="cb-markdown-edit-btn" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      ) : null}

      {editing ? (
        <div className="cb-markdown-editor">
          <textarea
            className="cb-markdown-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, draft.split('\n').length + 1)}
            placeholder="Write markdown…"
            aria-label="Markdown body"
            autoFocus
          />
          <div className="cb-markdown-editor-actions">
            <button type="button" className="cb-btn cb-btn-primary" onClick={save}>
              Save
            </button>
            <button type="button" className="cb-btn" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {row.body || '*Empty markdown block*'}
        </ReactMarkdown>
      )}
    </article>
  );
}
