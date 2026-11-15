import type { BookDocument, BookRow, Table } from '../../data/types';
import { MarkdownRow } from './MarkdownRow';
import { ComponentRow } from './ComponentRow';

type Props = {
  rows: BookRow[];
  table: Table;
  book: BookDocument;
};

export function RowRenderer({ rows, table, book }: Props) {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  return (
    <>
      {sorted.map((row) => {
        if (row.type === 'markdown') return <MarkdownRow key={row.id} row={row} />;
        return <ComponentRow key={row.id} row={row} table={table} book={book} />;
      })}
    </>
  );
}
