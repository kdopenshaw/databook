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
};

export function RowRenderer({
  rows,
  table,
  book,
  onInsertMarkdown,
  onSaveMarkdown,
  editingRowId = null,
}: Props) {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const canInsert = Boolean(onInsertMarkdown);

  return (
    <>
      {canInsert ? <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown at start" /> : null}
      {sorted.map((row) => (
        <div key={row.id} className="cb-row-stack">
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
      ))}
      {!sorted.length && canInsert ? (
        <InsertGap onInsert={() => onInsertMarkdown!(null)} label="Insert markdown" />
      ) : null}
    </>
  );
}
