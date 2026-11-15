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
import type { DataRow, RechartsSpec, RechartsSeriesSpec } from '../../data/types';
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

/**
 * Thin flexible Recharts renderer.
 * Accepts a declarative `recharts` spec (chart root + series marks).
 * Not a closed starter catalog — extend marks/roots as the skill emits them.
 */
export function RechartsRenderer({ data, spec }: Props) {
  const colors = chartColors();
  const series = normalizeSeries(spec);
  const margin = spec.margin ?? { top: 8, right: 16, bottom: 24, left: 8 };
  const showGrid = spec.showGrid !== false;
  const showTooltip = spec.showTooltip !== false;
  const showLegend = spec.showLegend === true || series.length > 1;

  const axisTick = { fill: colors.muted, fontSize: 12 };
  const commonAxes = (
    <>
      <XAxis dataKey={spec.xKey} stroke={colors.border} tick={axisTick} tickLine={false} axisLine={{ stroke: colors.border }} />
      <YAxis stroke={colors.border} tick={axisTick} tickLine={false} axisLine={{ stroke: colors.border }} width={48} />
    </>
  );
  const commonExtras = (
    <>
      {showGrid ? <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} /> : null}
      {showTooltip ? (
        <Tooltip
          contentStyle={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            fontSize: 12,
            color: colors.fg,
          }}
          labelStyle={{ color: colors.muted }}
        />
      ) : null}
      {showLegend ? <Legend wrapperStyle={{ fontSize: 12, color: colors.muted }} /> : null}
    </>
  );

  const renderMarks = (Mark: typeof Line | typeof Bar | typeof Area) =>
    series.map((s, i) => {
      const color = s.stroke ?? s.fill ?? colors.series[i % colors.series.length];
      const key = `${s.mark}-${s.dataKey}-${i}`;
      if (Mark === Line) {
        return (
          <Line
            key={key}
            type={s.type ?? 'monotone'}
            dataKey={s.dataKey}
            name={s.name ?? s.dataKey}
            stroke={color}
            strokeWidth={s.strokeWidth ?? 2}
            dot={s.dot ?? false}
            isAnimationActive={false}
          />
        );
      }
      if (Mark === Area) {
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
            isAnimationActive={false}
          />
        );
      }
      return (
        <Bar key={key} dataKey={s.dataKey} name={s.name ?? s.dataKey} fill={color} isAnimationActive={false} />
      );
    });

  const chartName = spec.chart.replace(/\s+/g, '').toLowerCase();

  let chart: ReactElement;
  if (chartName.includes('bar')) {
    chart = (
      <BarChart data={data} margin={margin}>
        {commonAxes}
        {commonExtras}
        {renderMarks(Bar)}
      </BarChart>
    );
  } else if (chartName.includes('area')) {
    chart = (
      <AreaChart data={data} margin={margin}>
        {commonAxes}
        {commonExtras}
        {renderMarks(Area)}
      </AreaChart>
    );
  } else if (chartName.includes('scatter')) {
    chart = (
      <ScatterChart margin={margin}>
        {commonAxes}
        {commonExtras}
        {series.map((s, i) => (
          <Scatter
            key={`${s.dataKey}-${i}`}
            name={s.name ?? s.dataKey}
            data={data}
            fill={s.fill ?? colors.series[i % colors.series.length]}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    );
  } else {
    // Default / LineChart and any unrecognized root that still has line-like series
    chart = (
      <LineChart data={data} margin={margin}>
        {commonAxes}
        {commonExtras}
        {series.map((s, i) => {
          const mark = s.mark.toLowerCase();
          const color = s.stroke ?? s.fill ?? colors.series[i % colors.series.length];
          if (mark === 'bar') {
            return <Bar key={`${s.dataKey}-${i}`} dataKey={s.dataKey} name={s.name ?? s.dataKey} fill={color} isAnimationActive={false} />;
          }
          if (mark === 'area') {
            return (
              <Area
                key={`${s.dataKey}-${i}`}
                type={s.type ?? 'monotone'}
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                stroke={color}
                fill={s.fill ?? color}
                fillOpacity={0.2}
                isAnimationActive={false}
              />
            );
          }
          return (
            <Line
              key={`${s.dataKey}-${i}`}
              type={s.type ?? 'monotone'}
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stroke={color}
              strokeWidth={s.strokeWidth ?? 2}
              dot={s.dot ?? false}
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    );
  }

  return <ResponsiveFrame>{chart}</ResponsiveFrame>;
}
