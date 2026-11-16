import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { ChartMeta } from '../data/types';
import type { BookChartProps } from './registry';

/** Demo of the two-edit authoring loop: new chart file + name in a ```chart block. */
export const meta: ChartMeta = {
  title: 'Top items by revenue',
  subtitle: 'H1 · top 8 SKUs',
  query: {
    groupBy: ['item'],
    aggregate: [{ fn: 'sum', column: 'amount', as: 'revenue' }],
    orderBy: [{ column: 'revenue', direction: 'desc' }],
    limit: 8,
  },
};

export default function TopItems({ data }: BookChartProps) {
  const c = chartColors();
  const fmt = (v: number) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return (
    <ResponsiveFrame height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} />
        <YAxis
          type="category"
          dataKey="item"
          width={88}
          tick={{ fill: c.muted, fontSize: 12 }}
          stroke={c.border}
        />
        <Tooltip formatter={(v) => [fmt(Number(v)), 'Revenue']} />
        <Bar dataKey="revenue" name="Revenue" fill={c.series[0]} radius={[0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveFrame>
  );
}
