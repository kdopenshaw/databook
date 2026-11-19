import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { BookTooltip, ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { BookChartProps } from './registry';

export default function ExponentialCurve({ data }: BookChartProps) {
  const c = chartColors();
  return (
    <ResponsiveFrame height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="x" tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} />
        <YAxis tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} width={44} domain={[0, 'auto']} />
        <BookTooltip formatter={(v) => [String(v), 'y']} />
        <Line
          type="monotone"
          dataKey="y"
          name="y"
          stroke={c.series[0]}
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveFrame>
  );
}
