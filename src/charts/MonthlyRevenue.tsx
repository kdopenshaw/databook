import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BookTooltip, ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { BookChartProps } from './registry';

export default function MonthlyRevenue({ data }: BookChartProps) {
  const c = chartColors();
  const fmt = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
  return (
    <ResponsiveFrame height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} />
        <YAxis
          tickFormatter={fmt}
          tick={{ fill: c.muted, fontSize: 12 }}
          stroke={c.border}
          width={48}
          domain={[0, 'auto']}
        />
        <BookTooltip formatter={(v) => [fmt(Number(v)), 'Revenue']} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={c.series[0]}
          fill={c.series[0]}
          fillOpacity={0.2}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveFrame>
  );
}
