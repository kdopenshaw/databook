import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MarkdownBlock } from '../../data/types';

type Props = {
  block: MarkdownBlock;
  editable?: boolean;
  onSave?: (body: string) => void;
  onCancel?: () => void;
  startEditing?: boolean;
};

export function MarkdownRow({
  block,
  editable = false,
  onSave,
  onCancel,
  startEditing = false,
}: Props) {
  const canEdit = Boolean(onSave) && editable;
  const [editing, setEditing] = useState(canEdit && (startEditing || block.editing || block.body === ''));
  const [draft, setDraft] = useState(block.body);

  useEffect(() => {
    setDraft(block.body);
  }, [block.body, block.id]);

  useEffect(() => {
    if ((startEditing || block.editing) && canEdit) setEditing(true);
  }, [startEditing, block.editing, canEdit, block.id]);

  const save = () => {
    onSave?.(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(block.body);
    setEditing(false);
    onCancel?.();
  };

  const showBody = block.body.trim().length > 0;

  return (
    <article className={`dbk-row dbk-markdown${canEdit ? ' dbk-markdown-user' : ''}`}>
      {canEdit && !editing ? (
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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.body}</ReactMarkdown>
      ) : canEdit ? null : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.body}</ReactMarkdown>
      )}
    </article>
  );
}
