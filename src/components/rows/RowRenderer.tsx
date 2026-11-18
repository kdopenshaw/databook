import { useEffect, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
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
  onFinishMarkdown?: () => void;
  onCancelMarkdown?: (rowId: string, originalBody: string) => void;
  editingRowId?: string | null;
  onReorderRows?: (movedId: string, beforeId: string) => void;
  onDeleteRow?: (rowId: string) => void;
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
  onFinishMarkdown,
  onCancelMarkdown,
  editingRowId = null,
  onReorderRows,
  onDeleteRow,
}: Props) {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const canInsert = Boolean(onInsertMarkdown);
  const canReorder = Boolean(onReorderRows);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && !sorted.some((r) => r.id === selectedId)) setSelectedId(null);
  }, [selectedId, sorted]);

  useEffect(() => {
    const onDocMouseDown = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.dbk-row-stack')) return;
      setSelectedId(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!onDeleteRow) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (editingRowId === selectedId) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('[contenteditable="true"], input, textarea')) return;
      e.preventDefault();
      onDeleteRow(selectedId);
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingRowId, onDeleteRow, selectedId]);

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

  const onStackKeyDown = (e: KeyboardEvent<HTMLDivElement>, rowId: string) => {
    if (e.target !== e.currentTarget) return;
    if ((e.key === 'Backspace' || e.key === 'Delete') && onDeleteRow) {
      e.preventDefault();
      onDeleteRow(rowId);
      setSelectedId(null);
    }
    if (e.key === 'Escape') setSelectedId(null);
  };

  const onStackMouseDown = (e: MouseEvent<HTMLDivElement>, rowId: string) => {
    if ((e.target as HTMLElement).closest('.dbk-insert-gap')) return;
    setSelectedId(rowId);
  };

  return (
    <>
      {canInsert ? <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown at start" /> : null}
      {sorted.map((row, index) => (
        <div
          key={row.id}
          className={`dbk-row-stack${dragOverId === row.id ? ' dbk-row-stack-drag-over' : ''}${selectedId === row.id ? ' dbk-row-stack-selected' : ''}`}
          tabIndex={0}
          aria-label={rowLabel(row, index)}
          aria-selected={selectedId === row.id}
          onMouseDown={(e) => onStackMouseDown(e, row.id)}
          onKeyDown={(e) => onStackKeyDown(e, row.id)}
          onDragOver={(e) => onDragOverRow(e, row.id)}
          onDrop={(e) => onDropRow(e, row.id)}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOverId((id) => (id === row.id ? null : id));
          }}
        >
          {canReorder ? (
            <div className="dbk-row-move-col">
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
            </div>
          ) : null}
          <div className="dbk-row-stack-main">
            <div className="dbk-row-stack-body">
              {row.type === 'markdown' ? (
                <MarkdownRow
                  row={row}
                  onSave={onSaveMarkdown ? (body) => onSaveMarkdown(row.id, body) : undefined}
                  onFinish={onFinishMarkdown}
                  onDeselect={() => setSelectedId((id) => (id === row.id ? null : id))}
                  onCancel={onCancelMarkdown ? (original) => onCancelMarkdown(row.id, original) : undefined}
                  startEditing={editingRowId === row.id}
                />
              ) : (
                <ComponentRow row={row} table={table} book={book} />
              )}
            </div>
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