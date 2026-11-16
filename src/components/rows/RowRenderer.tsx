import { useState, type DragEvent } from 'react';
import type { BookDocument, BookRow, Table } from '../../data/types';
import { InsertGap } from './InsertGap';
import { MarkdownRow } from './MarkdownRow';
import { ComponentRow } from './ComponentRow';

type Props = {
  rows: BookRow[];
  table: Table;
  book: BookDocument;
  /** Insert a markdown row after `afterRowId` (`null` = before first). */
  onInsertMarkdown?: (afterRowId: string | null) => void;
  onSaveMarkdown?: (rowId: string, body: string) => void;
  /** Row id that should open in edit mode (fresh insert). */
  editingRowId?: string | null;
  onReorderRows?: (movedId: string, beforeId: string) => void;
};

export function RowRenderer({
  rows,
  table,
  book,
  onInsertMarkdown,
  onSaveMarkdown,
  editingRowId = null,
  onReorderRows,
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

  const onDragEnd = () => setDragOverId(null);

  return (
    <>
      {canInsert ? <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown at start" /> : null}
      {sorted.map((row) => (
        <div
          key={row.id}
          className={`dbk-row-stack${dragOverId === row.id ? ' dbk-row-stack-drag-over' : ''}`}
          onDragOver={(e) => onDragOverRow(e, row.id)}
          onDrop={(e) => onDropRow(e, row.id)}
          onDragLeave={() => setDragOverId((id) => (id === row.id ? null : id))}
        >
          {canReorder ? (
            <div
              className="dbk-row-drag"
              draggable
              onDragStart={(e) => onDragStart(e, row.id)}
              onDragEnd={onDragEnd}
              aria-label={`Drag to reorder ${row.id}`}
              title="Drag to reorder"
            >
              <span className="dbk-row-drag-grip" aria-hidden="true">
                ⋮⋮
              </span>
            </div>
          ) : null}
          <div className="dbk-row-stack-body">
            {row.type === 'markdown' ? (
              <MarkdownRow
                row={row}
                onSave={onSaveMarkdown ? (body) => onSaveMarkdown(row.id, body) : undefined}
                startEditing={editingRowId === row.id}
              />
            ) : (
              <ComponentRow row={row} table={table} book={book} />
            )}
            {canInsert ? (
              <InsertGap onInsert={() => onInsertMarkdown!(row.id)} label={`Insert markdown after ${row.id}`} />
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