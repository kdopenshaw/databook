import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveFrame, chartColors } from '../components/charts/ResponsiveFrame';
import type { BookChartProps } from './registry';

export default function TicketSizeHist({ data }: BookChartProps) {
  const c = chartColors();
  const step = 2;
  const plot = data.map((r) => ({
    ...r,
    mid: typeof r.amount_bin === 'number' ? r.amount_bin + step / 2 : r.amount_bin,
    label: `${r.amount_bin}–${r.amount_bin_end}`,
  }));
  return (
    <ResponsiveFrame height={280}>
      <BarChart data={plot} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="mid"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fill: c.muted, fontSize: 12 }}
          stroke={c.border}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis tick={{ fill: c.muted, fontSize: 12 }} stroke={c.border} width={40} allowDecimals={false} />
        <Tooltip
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as { label?: string } | undefined;
            return p?.label ? `$${p.label}` : '';
          }}
          formatter={(v) => [v, 'Tickets']}
        />
        <Bar dataKey="n" name="Tickets" fill={c.series[3] ?? c.series[0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveFrame>
  );
}
