import type { ProductShare } from '../../lib/data'
import { formatKg } from '../../lib/data'

const OPACITY = [1, 0.75, 0.55, 0.4, 0.28, 0.2]

export default function ProductBreakdown({ data }: { data: ProductShare[] }) {
  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-medium">Per Produk</h3>
        <p className="text-sm text-[var(--muted)]">Kontribusi netto</p>
      </div>
      <div className="space-y-4">
        {data.map((p, i) => (
          <div key={p.name}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-[var(--muted2)]">{p.name}</span>
              <span className="text-[var(--muted)]">
                {formatKg(p.netto)} · {p.pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--chip)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${p.pct}%`,
                  background: 'var(--chart-line)',
                  opacity: OPACITY[i % OPACITY.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
