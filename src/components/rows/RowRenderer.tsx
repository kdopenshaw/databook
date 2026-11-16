import { useState, type DragEvent } from 'react';
import type { ContentBlock, Table } from '../../data/types';
import { InsertGap } from './InsertGap';
import { MarkdownRow } from './MarkdownRow';
import { ComponentRow } from './ComponentRow';

type Props = {
  blocks: ContentBlock[];
  table: Table;
  editableMarkdown?: boolean;
  onInsertMarkdown?: (afterBlockId: string | null) => void;
  onSaveMarkdown?: (blockId: string, body: string) => void;
  onCancelMarkdown?: (blockId: string) => void;
  editingBlockId?: string | null;
  onReorderBlocks?: (movedId: string, beforeId: string) => void;
  onMoveBlock?: (blockId: string, direction: 'up' | 'down') => void;
};

function blockLabel(block: ContentBlock, index: number): string {
  if (block.type === 'markdown') return block.body.trim().slice(0, 40) || `Note ${index + 1}`;
  return `Chart row ${index + 1}`;
}

export function RowRenderer({
  blocks,
  table,
  editableMarkdown = false,
  onInsertMarkdown,
  onSaveMarkdown,
  onCancelMarkdown,
  editingBlockId = null,
  onReorderBlocks,
  onMoveBlock,
}: Props) {
  const canInsert = Boolean(onInsertMarkdown);
  const canReorder = Boolean(onReorderBlocks);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const onDragStart = (e: DragEvent, blockId: string) => {
    if (!canReorder) return;
    e.dataTransfer.setData('text/plain', blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverRow = (e: DragEvent, blockId: string) => {
    if (!canReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(blockId);
  };

  const onDropRow = (e: DragEvent, targetId: string) => {
    if (!canReorder) return;
    e.preventDefault();
    const movedId = e.dataTransfer.getData('text/plain');
    setDragOverId(null);
    if (movedId && movedId !== targetId) onReorderBlocks!(movedId, targetId);
  };

  return (
    <>
      {canInsert ? <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown at start" /> : null}
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className={`dbk-row-stack${dragOverId === block.id ? ' dbk-row-stack-drag-over' : ''}`}
          onDragOver={(e) => onDragOverRow(e, block.id)}
          onDrop={(e) => onDropRow(e, block.id)}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOverId((id) => (id === block.id ? null : id));
          }}
        >
          {canReorder || onMoveBlock ? (
            <div className="dbk-row-move-col">
              {canReorder ? (
                <div
                  className="dbk-row-drag"
                  draggable
                  onDragStart={(e) => onDragStart(e, block.id)}
                  onDragEnd={() => setDragOverId(null)}
                  aria-label={`Drag to reorder ${blockLabel(block, index)}`}
                  title="Drag to reorder"
                >
                  <span className="dbk-row-drag-grip" aria-hidden="true">
                    ⋮⋮
                  </span>
                </div>
              ) : null}
              {onMoveBlock ? (
                <div className="dbk-row-keyboard-move">
                  <button
                    type="button"
                    className="dbk-row-move-btn"
                    disabled={index === 0}
                    aria-label="Move block up"
                    onClick={() => onMoveBlock(block.id, 'up')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="dbk-row-move-btn"
                    disabled={index === blocks.length - 1}
                    aria-label="Move block down"
                    onClick={() => onMoveBlock(block.id, 'down')}
                  >
                    ↓
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="dbk-row-stack-body">
            {block.type === 'markdown' ? (
              <MarkdownRow
                block={block}
                editable={editableMarkdown}
                onSave={onSaveMarkdown ? (body) => onSaveMarkdown(block.id, body) : undefined}
                onCancel={onCancelMarkdown ? () => onCancelMarkdown(block.id) : undefined}
                startEditing={editingBlockId === block.id || Boolean(block.editing)}
              />
            ) : (
              <ComponentRow block={block} table={table} />
            )}
            {canInsert ? (
              <InsertGap onInsert={() => onInsertMarkdown!(block.id)} label={`Insert markdown after block ${index + 1}`} />
            ) : null}
          </div>
        </div>
      ))}
      {!blocks.length && canInsert ? (
        <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown" />
      ) : null}
    </>
  );
}
