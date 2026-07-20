import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { TrendPoint } from '../../lib/data'
import { useTheme } from '../../lib/theme'

export default function TonnageChart({ data }: { data: TrendPoint[] }) {
  const { theme } = useTheme()
  const light = theme === 'light'
  const line = light ? '#111827' : '#ffffff'
  const grid = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const tick = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.55)'
  const tipBg = light ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.85)'
  const tipBorder = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'
  const tipText = light ? '#111827' : '#ffffff'

  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-medium">Tren Tonase</h3>
        <p className="text-sm text-[var(--muted)]">Total netto per hari</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="tonnage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line} stopOpacity={0.35} />
                <stop offset="100%" stopColor={line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: tick, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: tick, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}t`}
            />
            <Tooltip
              contentStyle={{
                background: tipBg,
                border: `1px solid ${tipBorder}`,
                borderRadius: 12,
                color: tipText,
                fontSize: 13,
              }}
              labelStyle={{ color: tipText }}
              itemStyle={{ color: tipText }}
              formatter={(v: number) => [`${(v / 1000).toLocaleString('id-ID')} t`, 'Netto']}
            />
            <Area
              type="monotone"
              dataKey="netto"
              stroke={line}
              strokeWidth={2}
              fill="url(#tonnage)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
