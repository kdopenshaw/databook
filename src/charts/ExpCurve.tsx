import { Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { BookChartProps } from './registry';

/** Init-sample chart: y = e^x. Agents add sibling files in `src/charts/` the same way. */
export default function ExpCurve({ data }: BookChartProps) {
  const colors = chartColors();
  return (
    <ResponsiveFrame height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
        <XAxis dataKey="x" stroke={colors.border} tick={{ fill: colors.muted, fontSize: 12 }} />
        <YAxis stroke={colors.border} tick={{ fill: colors.muted, fontSize: 12 }} width={40} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="y"
          name="e^x"
          stroke={colors.series[0]}
          strokeWidth={2}
          dot
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveFrame>
  );
}
