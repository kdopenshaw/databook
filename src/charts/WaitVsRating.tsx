import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { BookChartProps } from './registry';

const CAFES = ['Harbor', 'Market', 'Campus'] as const;

export default function WaitVsRating({ data }: BookChartProps) {
  const c = chartColors();
  return (
    <ResponsiveFrame height={320}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 12, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="wait_min"
          name="Wait"
          unit=" min"
          tick={{ fill: c.muted, fontSize: 12 }}
          stroke={c.border}
        />
        <YAxis
          type="number"
          dataKey="rating"
          name="Rating"
          domain={[1, 5]}
          tick={{ fill: c.muted, fontSize: 12 }}
          stroke={c.border}
          width={36}
        />
        <ZAxis range={[40, 40]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        {CAFES.map((cafe, i) => (
          <Scatter
            key={cafe}
            name={cafe}
            data={data.filter((r) => r.cafe === cafe)}
            fill={c.series[i % c.series.length]}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ResponsiveFrame>
  );
}
