import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { BookChartProps } from './registry';

export default function RevenueByCafe({ data }: BookChartProps) {
  const c = chartColors();
  const sorted = [...data].sort((a, b) => Number(b.revenue) - Number(a.revenue));
  const fmt = (v: number) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return (
    <ResponsiveFrame height={280}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} />
        <YAxis
          type="category"
          dataKey="cafe"
          width={72}
          tick={{ fill: c.muted, fontSize: 12 }}
          stroke={c.border}
        />
        <Tooltip formatter={(v) => [fmt(Number(v)), 'Revenue']} />
        <Bar dataKey="revenue" name="Revenue" fill={c.series[1]} radius={[0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveFrame>
  );
}
