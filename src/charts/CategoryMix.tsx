import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { ChartMeta } from '../data/types';
import type { BookChartProps } from './registry';

export const meta: ChartMeta = {
  title: 'Category mix by month',
  subtitle: 'Stacked revenue · Drink / Food / Merch',
  query: {
    groupBy: ['month', 'category'],
    aggregate: [{ fn: 'sum', column: 'amount', as: 'revenue' }],
    orderBy: [
      { column: 'month', direction: 'asc' },
      { column: 'category', direction: 'asc' },
    ],
  },
};

/** Expects rows with month + category + revenue; pivots for stacked bars. */
export default function CategoryMix({ data }: BookChartProps) {
  const c = chartColors();
  const byMonth = new Map<string, Record<string, string | number>>();
  for (const r of data) {
    const m = String(r.month);
    const row = byMonth.get(m) ?? { month: m, Drink: 0, Food: 0, Merch: 0 };
    const cat = String(r.category);
    row[cat] = Number(row[cat] ?? 0) + Number(r.revenue ?? 0);
    byMonth.set(m, row);
  }
  const pivoted = [...byMonth.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)));
  const fmt = (v: number) => `$${(v / 1000).toFixed(1)}k`;
  return (
    <ResponsiveFrame height={300}>
      <BarChart data={pivoted} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} />
        <YAxis tickFormatter={fmt} tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} width={48} />
        <Tooltip formatter={(v, name) => [fmt(Number(v)), String(name)]} />
        <Legend />
        <Bar dataKey="Drink" stackId="a" fill={c.series[0]} isAnimationActive={false} />
        <Bar dataKey="Food" stackId="a" fill={c.series[1]} isAnimationActive={false} />
        <Bar dataKey="Merch" stackId="a" fill={c.series[2]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveFrame>
  );
}
