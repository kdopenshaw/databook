import type { ChartsBlock, Table } from '../../data/types';
import { ChartSlot } from './ChartSlot';

type Props = {
  block: ChartsBlock;
  table: Table;
};

export function ComponentRow({ block, table }: Props) {
  return (
    <div
      className="dbk-row dbk-component-row"
      style={{
        gap: 16,
        alignItems: 'stretch',
        flexWrap: 'wrap',
      }}
    >
      {block.charts.map((chart, i) => (
        <ChartSlot key={`${chart.name}-${i}`} chart={chart} table={table} />
      ))}
    </div>
  );
}
