import type { ComponentRow as ComponentRowModel, Table } from '../../data/types';
import { ChartSlot } from './ChartSlot';

type Props = {
  row: ComponentRowModel;
  table: Table;
};

export function ComponentRow({ row, table }: Props) {
  const gap = row.layout?.gap ?? 0;
  const align = row.layout?.align ?? 'stretch';
  const wrap = row.layout?.wrap ?? false;

  return (
    <div
      className="cb-row cb-component-row"
      style={{
        gap,
        alignItems: align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'stretch',
        flexWrap: wrap ? 'wrap' : 'nowrap',
      }}
    >
      {row.components.map((block) => (
        <ChartSlot key={block.id} block={block} table={table} flex={block.flex ?? 1} />
      ))}
    </div>
  );
}
