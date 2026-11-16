import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { ChartMeta } from '../data/types';
import type { BookChartProps } from './registry';

export const meta: ChartMeta = {
  title: 'Member share of tickets',
  subtitle: 'Share of line items with is_member',
  query: {
    groupBy: ['month'],
    aggregate: [{ fn: 'share', column: 'is_member', as: 'member_share' }],
    orderBy: [{ column: 'month', direction: 'asc' }],
  },
};

export default function MemberShare({ data }: BookChartProps) {
  const c = chartColors();
  return (
    <ResponsiveFrame height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          tick={{ fill: c.muted, fontSize: 12 }}
          stroke={c.border}
          width={44}
        />
        <Tooltip formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, 'Member share']} />
        <Line
          type="monotone"
          dataKey="member_share"
          name="Member share"
          stroke={c.series[2]}
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveFrame>
  );
}
