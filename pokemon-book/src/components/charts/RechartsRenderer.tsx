import type { ReactElement } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DataRow, RechartsSpec, RechartsSeriesSpec, Value } from '../../data/types';
import { ResponsiveFrame, chartColors } from './ResponsiveFrame';

type Props = {
  data: DataRow[];
  spec: RechartsSpec;
};

function normalizeSeries(spec: RechartsSpec): RechartsSeriesSpec[] {
  if (spec.series?.length) return spec.series;
  const keys = spec.yKeys ?? [];
  const chart = spec.chart.toLowerCase();
  const mark = chart.includes('bar') ? 'Bar' : chart.includes('area') ? 'Area' : chart.includes('scatter') ? 'Scatter' : 'Line';
  return keys.map((dataKey) => ({ mark, dataKey, name: dataKey }));
}

function valueFormatter(spec: RechartsSpec) {
  const decimals = spec.decimals ?? (spec.valueFormat === 'percent' ? 0 : 2);
  return (v: unknown): string => {
    if (typeof v !== 'number') return String(v ?? '—');
    if (spec.valueFormat === 'percent') return `${(v * 100).toFixed(decimals)}%`;
    return v.toLocaleString('en-US', { maximumFractionDigits: decimals });
  };
}

/**
 * Thin flexible Recharts renderer.
 * Accepts a declarative `recharts` spec (chart root + series marks).
 * Not a closed starter catalog — extend marks/roots as the skill emits them.
 */
export function RechartsRenderer({ data, spec }: Props) {
  const colors = chartColors();
  const series = normalizeSeries(spec);
  const chartName = spec.chart.replace(/\s+/g, '').toLowerCase();
  const isScatter = chartName.includes('scatter');
  const vertical = spec.layout === 'vertical' && !isScatter;
  const showGrid = spec.showGrid !== false;
  const showTooltip = spec.showTooltip !== false;
  const showLegend = spec.showLegend === true || series.length > 1;
  const fmt = valueFormatter(spec);
  const colorOf = (s: RechartsSeriesSpec, i: number) =>
    s.stroke ?? s.fill ?? colors.series[(s.colorIndex ?? i) % colors.series.length];
  const seriesOrder = new Map(series.map((s, i) => [s.dataKey, i]));
  const bySeriesOrder = (item: { dataKey?: unknown }) => seriesOrder.get(String(item.dataKey)) ?? 0;

  const margin = spec.margin ?? { top: 8, right: 16, bottom: spec.xLabel ? 28 : 8, left: spec.yLabel ? 12 : 8 };
  const axisTick = { fill: colors.muted, fontSize: 12 };
  const axisProps = { stroke: colors.border, tick: axisTick, tickLine: false, axisLine: { stroke: colors.border } };
  const xLabel = spec.xLabel
    ? { value: spec.xLabel, position: 'insideBottom' as const, offset: -16, fill: colors.muted, fontSize: 12 }
    : undefined;
  const yLabel = spec.yLabel
    ? { value: spec.yLabel, angle: -90, position: 'insideLeft' as const, style: { textAnchor: 'middle' as const }, fill: colors.muted, fontSize: 12 }
    : undefined;

  let axes: ReactElement;
  if (isScatter) {
    axes = (
      <>
        <XAxis type="number" dataKey={spec.xKey} name={spec.xLabel ?? spec.xKey} label={xLabel} {...axisProps} />
        <YAxis type="number" dataKey={series[0]?.dataKey} name={spec.yLabel ?? series[0]?.dataKey} label={yLabel} width={48} domain={spec.yDomain} {...axisProps} />
      </>
    );
  } else if (vertical) {
    axes = (
      <>
        <XAxis type="number" label={xLabel} tickFormatter={fmt} domain={spec.yDomain} {...axisProps} />
        <YAxis type="category" dataKey={spec.xKey} width={spec.categoryWidth ?? 96} interval={0} label={yLabel} {...axisProps} />
      </>
    );
  } else {
    axes = (
      <>
        <XAxis
          dataKey={spec.xKey}
          type={spec.xType ?? 'category'}
          domain={spec.xDomain}
          ticks={spec.xTicks}
          allowDataOverflow={Boolean(spec.xDomain)}
          label={xLabel}
          {...axisProps}
        />
        <YAxis width={48} label={yLabel} tickFormatter={fmt} domain={spec.yDomain} allowDataOverflow={Boolean(spec.yDomain)} {...axisProps} />
      </>
    );
  }

  const tooltipStyle = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    fontSize: 12,
    color: colors.fg,
  };
  const scatterTooltip = ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: DataRow }> }) => {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    const keys = spec.tooltipKeys ?? [spec.xKey, series[0]?.dataKey].filter(Boolean);
    return (
      <div style={{ ...tooltipStyle, padding: '6px 10px' }}>
        {keys.map((k) => (
          <div key={k}>
            <span style={{ color: colors.muted }}>{k}: </span>
            {fmt(row[k] as Value)}
          </div>
        ))}
      </div>
    );
  };

  const extras = (
    <>
      {showGrid ? <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={vertical || isScatter} horizontal={!vertical} /> : null}
      {showTooltip ? (
        isScatter ? (
          <Tooltip content={scatterTooltip} cursor={{ stroke: colors.border }} />
        ) : (
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: colors.muted }}
            formatter={(v) => fmt(v)}
            itemSorter={bySeriesOrder}
            cursor={{ fill: colors.grid }}
          />
        )
      ) : null}
      {showLegend ? (
        <Legend wrapperStyle={{ fontSize: 12, color: colors.muted, paddingTop: spec.xLabel ? 16 : 0 }} itemSorter={bySeriesOrder} />
      ) : null}
    </>
  );

  const renderMark = (s: RechartsSeriesSpec, i: number, fallback: 'line' | 'bar' | 'area') => {
    const color = colorOf(s, i);
    const key = `${s.mark}-${s.dataKey}-${i}`;
    const mark = s.mark ? s.mark.toLowerCase() : fallback;
    if (mark === 'bar') {
      return <Bar key={key} dataKey={s.dataKey} name={s.name ?? s.dataKey} fill={color} stackId={s.stackId} isAnimationActive={false} />;
    }
    if (mark === 'area') {
      return (
        <Area
          key={key}
          type={s.type ?? 'monotone'}
          dataKey={s.dataKey}
          name={s.name ?? s.dataKey}
          stroke={color}
          fill={s.fill ?? color}
          fillOpacity={0.2}
          strokeWidth={s.strokeWidth ?? 2}
          stackId={s.stackId}
          isAnimationActive={false}
        />
      );
    }
    return (
      <Line
        key={key}
        type={s.type ?? 'monotone'}
        dataKey={s.dataKey}
        name={s.name ?? s.dataKey}
        stroke={color}
        strokeWidth={s.strokeWidth ?? 2}
        strokeDasharray={s.strokeDasharray}
        dot={s.dot ?? false}
        isAnimationActive={false}
      />
    );
  };

  const layout = vertical ? 'vertical' : 'horizontal';
  let chart: ReactElement;
  if (isScatter && spec.colorBy) {
    const { key, levels } = spec.colorBy;
    chart = (
      <ScatterChart margin={margin}>
        {axes}
        {extras}
        {levels.map((level, i) => (
          <Scatter
            key={`${key}-${level.value}`}
            name={level.label ?? level.value}
            data={data.filter((r) => r[key] === level.value)}
            fill={colors.series[(level.colorIndex ?? i) % colors.series.length]}
            fillOpacity={0.75}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    );
  } else if (isScatter) {
    chart = (
      <ScatterChart margin={margin}>
        {axes}
        {extras}
        {series.map((s, i) => (
          <Scatter key={`${s.dataKey}-${i}`} name={s.name ?? s.dataKey} data={data} fill={colorOf(s, i)} fillOpacity={0.7} isAnimationActive={false} />
        ))}
      </ScatterChart>
    );
  } else if (chartName.includes('bar')) {
    chart = (
      <BarChart data={data} margin={margin} layout={layout} barCategoryGap={spec.barCategoryGap}>
        {axes}
        {extras}
        {series.map((s, i) => renderMark(s, i, 'bar'))}
      </BarChart>
    );
  } else if (chartName.includes('area')) {
    chart = (
      <AreaChart data={data} margin={margin} layout={layout}>
        {axes}
        {extras}
        {series.map((s, i) => renderMark(s, i, 'area'))}
      </AreaChart>
    );
  } else {
    // Default / LineChart and any unrecognized root that still has line-like series
    chart = (
      <LineChart data={data} margin={margin} layout={layout}>
        {axes}
        {extras}
        {series.map((s, i) => renderMark(s, i, 'line'))}
      </LineChart>
    );
  }

  return <ResponsiveFrame height={spec.height}>{chart}</ResponsiveFrame>;
}
