import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  deltaPct?: number
}

export default function KpiCard({ icon: Icon, label, value, sub, deltaPct }: KpiCardProps) {
  const hasDelta = typeof deltaPct === 'number'
  const up = (deltaPct ?? 0) >= 0
  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-[var(--chip)] flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        {hasDelta && (
          <span
            className={`inline-flex items-center gap-1 ${
              up ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {up ? '+' : ''}
            {deltaPct}%
          </span>
        )}
        {sub && <span className="text-[var(--faint)]">{sub}</span>}
      </div>
    </div>
  )
}
