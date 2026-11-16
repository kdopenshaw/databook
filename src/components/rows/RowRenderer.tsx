import { useState, type DragEvent } from 'react';
import type { BookDocument, BookRow, Table } from '../../data/types';
import { InsertGap } from './InsertGap';
import { MarkdownRow } from './MarkdownRow';
import { ComponentRow } from './ComponentRow';

type Props = {
  rows: BookRow[];
  table: Table;
  book: BookDocument;
  onInsertMarkdown?: (afterRowId: string | null) => void;
  onSaveMarkdown?: (rowId: string, body: string) => void;
  onCancelMarkdown?: (rowId: string) => void;
  editingRowId?: string | null;
  onReorderRows?: (movedId: string, beforeId: string) => void;
  onMoveRow?: (rowId: string, direction: 'up' | 'down') => void;
};

function rowLabel(row: BookRow, index: number): string {
  if (row.type === 'markdown') return row.body.trim().slice(0, 40) || `Note ${index + 1}`;
  return `Chart row ${index + 1}`;
}

export function RowRenderer({
  rows,
  table,
  book,
  onInsertMarkdown,
  onSaveMarkdown,
  onCancelMarkdown,
  editingRowId = null,
  onReorderRows,
  onMoveRow,
}: Props) {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const canInsert = Boolean(onInsertMarkdown);
  const canReorder = Boolean(onReorderRows);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const onDragStart = (e: DragEvent, rowId: string) => {
    if (!canReorder) return;
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverRow = (e: DragEvent, rowId: string) => {
    if (!canReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(rowId);
  };

  const onDropRow = (e: DragEvent, targetId: string) => {
    if (!canReorder) return;
    e.preventDefault();
    const movedId = e.dataTransfer.getData('text/plain');
    setDragOverId(null);
    if (movedId && movedId !== targetId) onReorderRows!(movedId, targetId);
  };

  return (
    <>
      {canInsert ? <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown at start" /> : null}
      {sorted.map((row, index) => (
        <div
          key={row.id}
          className={`dbk-row-stack${dragOverId === row.id ? ' dbk-row-stack-drag-over' : ''}`}
          onDragOver={(e) => onDragOverRow(e, row.id)}
          onDrop={(e) => onDropRow(e, row.id)}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOverId((id) => (id === row.id ? null : id));
          }}
        >
          {canReorder || onMoveRow ? (
            <div className="dbk-row-move-col">
              {canReorder ? (
                <div
                  className="dbk-row-drag"
                  draggable
                  onDragStart={(e) => onDragStart(e, row.id)}
                  onDragEnd={() => setDragOverId(null)}
                  aria-label={`Drag to reorder ${rowLabel(row, index)}`}
                  title="Drag to reorder"
                >
                  <span className="dbk-row-drag-grip" aria-hidden="true">
                    ⋮⋮
                  </span>
                </div>
              ) : null}
              {onMoveRow ? (
                <div className="dbk-row-keyboard-move">
                  <button
                    type="button"
                    className="dbk-row-move-btn"
                    disabled={index === 0}
                    aria-label="Move block up"
                    onClick={() => onMoveRow(row.id, 'up')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="dbk-row-move-btn"
                    disabled={index === sorted.length - 1}
                    aria-label="Move block down"
                    onClick={() => onMoveRow(row.id, 'down')}
                  >
                    ↓
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="dbk-row-stack-body">
            {row.type === 'markdown' ? (
              <MarkdownRow
                row={row}
                onSave={onSaveMarkdown ? (body) => onSaveMarkdown(row.id, body) : undefined}
                onCancel={onCancelMarkdown ? () => onCancelMarkdown(row.id) : undefined}
                startEditing={editingRowId === row.id}
              />
            ) : (
              <ComponentRow row={row} table={table} book={book} />
            )}
            {canInsert ? (
              <InsertGap onInsert={() => onInsertMarkdown!(row.id)} label={`Insert markdown after block ${index + 1}`} />
            ) : null}
          </div>
        </div>
      ))}
      {!sorted.length && canInsert ? (
        <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown" />
      ) : null}
    </>
  );
}