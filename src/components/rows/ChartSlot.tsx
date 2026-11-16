import { useMemo } from 'react';
import { resolveBookChart, resolveChartMeta } from '../../charts/registry';
import type { ChartRef, Table } from '../../data/types';
import { QueryError, runQuery } from '../../data/runQuery';

type Props = {
  chart: ChartRef;
  table: Table;
};

export function ChartSlot({ chart, table }: Props) {
  const flex = chart.flex ?? 1;
  const meta = resolveChartMeta(chart.name);
  const Comp = resolveBookChart(chart.name);

  const result = useMemo(() => {
    if (!meta?.query) return { rows: [], error: meta ? null : `Unknown chart "${chart.name}"` };
    try {
      const rows = runQuery(table, meta.query);
      return { rows, error: null as string | null };
    } catch (err) {
      if (err instanceof QueryError) return { rows: [], error: err.message };
      return { rows: [], error: err instanceof Error ? err.message : String(err) };
    }
  }, [table, meta, chart.name]);

  const title = meta?.title ?? chart.name;
  const subtitle = meta?.subtitle;
  const header = (
    <div className="dbk-chart-header">
      <h3 className="dbk-chart-title">{title}</h3>
      {subtitle ? (
        <p className="dbk-chart-subtitle">{subtitle}</p>
      ) : (
        <p className="dbk-chart-subtitle dbk-chart-subtitle-spacer" aria-hidden />
      )}
    </div>
  );

  const style = { flex: `${flex} 1 240px` };

  if (!meta || !Comp) {
    return (
      <div className="dbk-chart-slot" style={style} role="alert" data-chart={chart.name}>
        {header}
        <div className="dbk-chart-error">
          Unknown chart component "{chart.name}". Add src/charts/{chart.name}.tsx with meta + default export.
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="dbk-chart-slot" style={style} role="alert" data-chart={chart.name}>
        {header}
        <div className="dbk-chart-error">{result.error}</div>
      </div>
    );
  }

  if (!result.rows.length) {
    return (
      <div className="dbk-chart-slot" style={style} data-empty="true" data-chart={chart.name}>
        {header}
        <p className="dbk-chart-empty">No rows for this chart’s query.</p>
      </div>
    );
  }

  return (
    <div className="dbk-chart-slot" style={style} data-chart={chart.name}>
      {header}
      <Comp data={result.rows} />
      {meta.notes ? <p className="dbk-chart-notes">{meta.notes}</p> : null}
    </div>
  );
}
