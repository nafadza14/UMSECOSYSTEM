import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Weighing } from '../../lib/types'
import { formatKgFull } from '../../lib/data'

type Filter = 'all' | 'customer' | 'supplier'
type Period = 'day' | 'week' | 'month'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Hari' },
  { key: 'week', label: 'Minggu' },
  { key: 'month', label: 'Bulan' },
]

// Ambang tanggal (YYYY-MM-DD) berdasarkan tanggal terbaru di data.
function threshold(period: Period, maxDate: string): string {
  if (!maxDate) return ''
  if (period === 'day') return maxDate
  const d = new Date(maxDate)
  d.setDate(d.getDate() - (period === 'week' ? 6 : 29))
  return d.toISOString().slice(0, 10)
}

export default function LiveFeedTable({
  rows,
  flashIds,
}: {
  rows: Weighing[]
  flashIds: Set<string>
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [period, setPeriod] = useState<Period>('day')
  const [q, setQ] = useState('')

  const maxDate = useMemo(
    () => rows.reduce((m, r) => (r.date_in > m ? r.date_in : m), ''),
    [rows],
  )

  const filtered = useMemo(() => {
    const thr = threshold(period, maxDate)
    return rows.filter((r) => {
      if (thr && r.date_in < thr) return false
      if (filter !== 'all' && r.type !== filter) return false
      if (q) {
        const s = q.toLowerCase()
        return (
          r.truck_no.toLowerCase().includes(s) ||
          r.ticket_no.includes(s) ||
          r.partner_name.toLowerCase().includes(s) ||
          r.product_name.toLowerCase().includes(s)
        )
      }
      return true
    })
  }, [rows, filter, period, q, maxDate])

  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-medium flex items-center gap-2">
            Live Feed
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live
            </span>
          </h3>
          <p className="text-sm text-[var(--muted)]">
            {filtered.length} tiket ·{' '}
            {period === 'day' ? 'hari terakhir' : period === 'week' ? '7 hari' : '30 hari'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Periode: Hari / Minggu / Bulan */}
          <div className="flex rounded-lg bg-[var(--chip)] p-0.5 text-xs">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  period === p.key
                    ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)]'
                    : 'text-[var(--muted2)] hover:text-[var(--text)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Tipe: Semua / Customer / Supplier */}
          <div className="flex rounded-lg bg-[var(--chip)] p-0.5 text-xs">
            {(['all', 'customer', 'supplier'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filter === f
                    ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)]'
                    : 'text-[var(--muted2)] hover:text-[var(--text)]'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'customer' ? 'Customer' : 'Supplier'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari truk / tiket"
              className="bg-[var(--chip)] rounded-lg pl-8 pr-3 py-1.5 text-sm placeholder-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-[var(--border)] w-44"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto thin-scroll -mx-2">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="font-normal py-2 px-2">Tanggal</th>
              <th className="font-normal py-2 px-2">Waktu</th>
              <th className="font-normal py-2 px-2">Tiket</th>
              <th className="font-normal py-2 px-2">Tipe</th>
              <th className="font-normal py-2 px-2">Partner</th>
              <th className="font-normal py-2 px-2">Produk</th>
              <th className="font-normal py-2 px-2">No. Truk</th>
              <th className="font-normal py-2 px-2 text-right">Netto</th>
              <th className="font-normal py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((r) => (
              <tr
                key={r.id}
                className={`border-b border-[var(--border-soft)] hover:bg-[var(--hover)] ${
                  flashIds.has(r.id) ? 'row-flash' : ''
                }`}
              >
                <td className="py-2.5 px-2 text-[var(--muted)] whitespace-nowrap">
                  {r.date_in.slice(5).replace('-', '/')}
                </td>
                <td className="py-2.5 px-2 text-[var(--muted2)] whitespace-nowrap">
                  {r.time_in.slice(0, 5)}
                </td>
                <td className="py-2.5 px-2 text-[var(--muted)]">{r.ticket_no}</td>
                <td className="py-2.5 px-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      r.type === 'supplier'
                        ? 'border-sky-400/40 text-sky-500'
                        : 'border-amber-400/40 text-amber-500'
                    }`}
                  >
                    {r.type === 'supplier' ? 'Supplier' : 'Customer'}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-[var(--muted2)] whitespace-nowrap">{r.partner_name}</td>
                <td className="py-2.5 px-2 text-[var(--muted2)] whitespace-nowrap">{r.product_name}</td>
                <td className="py-2.5 px-2 text-[var(--muted2)] whitespace-nowrap">{r.truck_no}</td>
                <td className="py-2.5 px-2 text-right whitespace-nowrap">
                  {r.status === 'in_progress' ? (
                    <span className="text-[var(--faint)]">—</span>
                  ) : (
                    formatKgFull(r.netto_kg)
                  )}
                </td>
                <td className="py-2.5 px-2">
                  {r.status === 'in_progress' ? (
                    <span className="text-xs text-amber-500">In progress</span>
                  ) : (
                    <span className="text-xs text-emerald-500">Selesai</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-[var(--faint)] py-10 text-sm">Tidak ada data.</div>
        )}
      </div>
    </div>
  )
}
