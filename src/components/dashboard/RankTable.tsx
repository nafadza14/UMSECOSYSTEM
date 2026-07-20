import { formatKg } from '../../lib/data'
import { useTheme } from '../../lib/theme'

interface RankRow {
  name: string
  netto: number
  count: number
  pct: number
}

/** Daftar ranking (customer/supplier/produk) dengan mini-bar monokrom.
 *  Bila onSelect diberikan, tiap baris bisa diklik untuk lihat detail. */
export default function RankTable({
  data,
  unitLabel = 'tiket',
  onSelect,
}: {
  data: RankRow[]
  unitLabel?: string
  onSelect?: (name: string) => void
}) {
  const { theme } = useTheme()
  const bar = theme === 'light' ? '#0f172a' : '#e2e8f0'
  const max = data.reduce((m, d) => Math.max(m, d.netto), 0) || 1

  if (data.length === 0) {
    return <div className="text-sm text-[var(--faint)] py-8 text-center">Tidak ada data.</div>
  }

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div
          key={d.name}
          onClick={onSelect ? () => onSelect(d.name) : undefined}
          className={`flex items-center gap-3 ${
            onSelect ? 'cursor-pointer -mx-2 px-2 py-1 rounded-lg hover:bg-[var(--hover)]' : ''
          }`}
        >
          <span className="w-5 text-xs text-[var(--faint)] shrink-0 text-right">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-[var(--text)] truncate">{d.name}</span>
              <span className="text-[var(--muted)] shrink-0 ml-2 tabular-nums">
                {formatKg(d.netto)} · {d.count} {unitLabel} · {d.pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--chip)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, Math.round((d.netto / max) * 100))}%`,
                  background: bar,
                  opacity: Math.max(0.35, 0.9 - i * 0.07),
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
