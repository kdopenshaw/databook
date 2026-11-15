import { useMemo } from 'react';
import type { BookDocument, ChartBlock, Table } from '../../data/types';
import { resolveChartBlock } from '../../data/resolveChartBlock';
import { QueryError, runQuery } from '../../data/runQuery';
import { RechartsRenderer } from '../charts/RechartsRenderer';

type Props = {
  block: ChartBlock;
  table: Table;
  book: BookDocument;
  flex?: number;
};

export function ChartSlot({ block, table, book, flex = 1 }: Props) {
  const resolved = useMemo(() => {
    try {
      return { block: resolveChartBlock(book, block), error: null as string | null };
    } catch (err) {
      return { block: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [book, block]);

  const result = useMemo(() => {
    if (!resolved.block?.query) return { rows: [], error: resolved.error };
    try {
      const rows = runQuery(table, resolved.block.query);
      return { rows, error: null as string | null };
    } catch (err) {
      if (err instanceof QueryError) return { rows: [], error: err.message };
      return { rows: [], error: err instanceof Error ? err.message : String(err) };
    }
  }, [table, resolved]);

  const live = resolved.block;
  const title = live?.title ?? block.title;
  const subtitle = live?.subtitle;
  const header = (
    <div className="cb-chart-header">
      <h3 className="cb-chart-title">{title}</h3>
      {subtitle ? <p className="cb-chart-subtitle">{subtitle}</p> : <p className="cb-chart-subtitle cb-chart-subtitle-spacer" aria-hidden />}
    </div>
  );

  const style = { flex: `${flex} 1 240px` };

  if (resolved.error || !live) {
    return (
      <div className="cb-chart-slot" style={style} role="alert">
        {header}
        <div className="cb-chart-error">{resolved.error ?? 'Invalid chart'}</div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="cb-chart-slot" style={style} role="alert">
        {header}
        <div className="cb-chart-error">{result.error}</div>
      </div>
    );
  }

  if (!result.rows.length) {
    return (
      <div className="cb-chart-slot" style={style} data-empty="true">
        {header}
        <p className="cb-chart-empty">No rows for this chart’s query.</p>
      </div>
    );
  }

  return (
    <div className="cb-chart-slot" style={style}>
      {header}
      <RechartsRenderer data={result.rows} spec={live.recharts!} />
      {live.notes ? <p className="cb-chart-notes">{live.notes}</p> : null}
    </div>
  );
}
