import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ProductShare } from '../../lib/data'
import { formatKg } from '../../lib/data'
import { useTheme } from '../../lib/theme'

// Gradasi monokrom — mengikuti gaya UI. Light = gradasi hitam, dark = gradasi putih.
const SHADES_LIGHT = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1']
const SHADES_DARK = ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155']

export default function ProductBreakdown({ data }: { data: ProductShare[] }) {
  const { theme } = useTheme()
  const light = theme === 'light'
  const shades = light ? SHADES_LIGHT : SHADES_DARK
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
                <Cell key={i} fill={shades[i % shades.length]} />
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

      <div className="mt-3 space-y-1.5">
        {data.map((p, i) => (
          <div key={p.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: shades[i % shades.length] }}
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
