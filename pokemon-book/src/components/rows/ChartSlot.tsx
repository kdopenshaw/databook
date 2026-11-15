import { useMemo } from 'react';
import type { ChartBlock, Table } from '../../data/types';
import { QueryError, runQuery } from '../../data/runQuery';
import { RechartsRenderer } from '../charts/RechartsRenderer';

type Props = {
  block: ChartBlock;
  table: Table;
  flex?: number;
};

export function ChartSlot({ block, table, flex = 1 }: Props) {
  const result = useMemo(() => {
    try {
      const rows = runQuery(table, block.query);
      return { rows, error: null as string | null };
    } catch (err) {
      if (err instanceof QueryError) return { rows: [], error: err.message };
      return { rows: [], error: err instanceof Error ? err.message : String(err) };
    }
  }, [table, block.query]);

  if (result.error) {
    return (
      <div className="cb-chart-slot" style={{ flex }} role="alert">
        <h3 className="cb-chart-title">{block.title}</h3>
        {block.subtitle ? <p className="cb-chart-subtitle">{block.subtitle}</p> : null}
        <div className="cb-chart-error">{result.error}</div>
      </div>
    );
  }

  if (!result.rows.length) {
    return (
      <div className="cb-chart-slot" style={{ flex }} data-empty="true">
        <h3 className="cb-chart-title">{block.title}</h3>
        {block.subtitle ? <p className="cb-chart-subtitle">{block.subtitle}</p> : null}
        <p className="cb-chart-empty">No rows for this chart’s query.</p>
      </div>
    );
  }

  return (
    <div className="cb-chart-slot" style={{ flex }}>
      <h3 className="cb-chart-title">{block.title}</h3>
      {block.subtitle ? <p className="cb-chart-subtitle">{block.subtitle}</p> : null}
      <RechartsRenderer data={result.rows} spec={block.recharts} />
      {block.notes ? <p className="cb-chart-notes">{block.notes}</p> : null}
    </div>
  );
}
