import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ProductShare } from '../../lib/data'
import { formatKg } from '../../lib/data'
import { useTheme } from '../../lib/theme'

const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#0ea5e9', // sky
  '#a855f7', // purple
]

export default function ProductBreakdown({ data }: { data: ProductShare[] }) {
  const { theme } = useTheme()
  const light = theme === 'light'
  const total = data.reduce((s, d) => s + d.netto, 0)
  const tipBg = light ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.85)'
  const tipBorder = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'
  const tipText = light ? '#111827' : '#ffffff'

  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="mb-2">
        <h3 className="text-base font-medium">Per Produk</h3>
        <p className="text-sm text-[var(--muted)]">Kontribusi netto</p>
      </div>

      {/* Donut chart dengan total di tengah */}
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="netto"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: tipBg,
                border: `1px solid ${tipBorder}`,
                borderRadius: 12,
                color: tipText,
                fontSize: 13,
              }}
              itemStyle={{ color: tipText }}
              formatter={(v: number, n: string) => [formatKg(v), n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] text-[var(--muted)]">Total</span>
          <span className="text-lg font-semibold tracking-tight">{formatKg(total)}</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-3 space-y-1.5">
        {data.map((p, i) => (
          <div key={p.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-[var(--muted2)] truncate">{p.name}</span>
            </span>
            <span className="text-[var(--muted)] shrink-0 ml-2">
              {formatKg(p.netto)} · {p.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
