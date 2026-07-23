import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Weighing } from '../../lib/types'
import { formatKgFull, formatShortDate } from '../../lib/data'
import { usePrices, valueKind, formatRp } from '../../lib/prices'
import { useTheme } from '../../lib/theme'

type Filter = 'all' | 'customer' | 'supplier'
type Period = 'day' | 'week' | 'month'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Hari' },
  { key: 'week', label: 'Minggu' },
  { key: 'month', label: 'Bulan' },
]

function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function LiveFeedTable({
  rows,
  flashIds,
}: {
  rows: Weighing[]
  flashIds: Set<string>
}) {
  const { valueOf } = usePrices()
  const { theme } = useTheme()
  const [filter, setFilter] = useState<Filter>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')

  const { minDate, maxDate } = useMemo(() => {
    let mn = ''
    let mx = ''
    rows.forEach((r) => {
      if (!mn || r.date_in < mn) mn = r.date_in
      if (r.date_in > mx) mx = r.date_in
    })
    return { minDate: mn, maxDate: mx }
  }, [rows])

  // Default: hari terakhir
  useEffect(() => {
    if (maxDate) {
      setFrom(maxDate)
      setTo(maxDate)
    }
  }, [maxDate])

  const lo = from && to ? (from <= to ? from : to) : from || to
  const hi = from && to ? (from <= to ? to : from) : from || to

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (lo && r.date_in < lo) return false
      if (hi && r.date_in > hi) return false
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
  }, [rows, filter, lo, hi, q])

  const preset = (kind: Period) => {
    if (!maxDate) return
    if (kind === 'day') {
      setFrom(maxDate)
      setTo(maxDate)
    } else if (kind === 'week') {
      setTo(maxDate)
      const f = addDays(maxDate, -6)
      setFrom(f < minDate ? minDate : f)
    } else {
      setFrom(minDate)
      setTo(maxDate)
    }
  }

  const weekStart = maxDate ? (addDays(maxDate, -6) < minDate ? minDate : addDays(maxDate, -6)) : ''
  const isDay = lo === maxDate && hi === maxDate
  const isMonth = lo === minDate && hi === maxDate
  const isWeek = !isDay && !isMonth && lo === weekStart && hi === maxDate
  const activePeriod: Period | null = isDay ? 'day' : isWeek ? 'week' : isMonth ? 'month' : null

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
            {lo === hi ? formatShortDate(lo) : `${formatShortDate(lo)} – ${formatShortDate(hi)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Periode cepat: Hari / Minggu / Bulan */}
          <div className="flex rounded-lg bg-[var(--chip)] p-0.5 text-xs">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => preset(p.key)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activePeriod === p.key
                    ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)]'
                    : 'text-[var(--muted2)] hover:text-[var(--text)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Kalender: Dari / Sampai */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[var(--muted)]">Dari</span>
            <input
              type="date"
              value={from}
              min={minDate}
              max={maxDate}
              onChange={(e) => setFrom(e.target.value)}
              style={{ colorScheme: theme }}
              className="bg-[var(--chip)] rounded-lg px-2.5 py-1.5 text-sm border border-[var(--border)] focus:outline-none"
            />
            <span className="text-xs text-[var(--muted)]">Sampai</span>
            <input
              type="date"
              value={to}
              min={minDate}
              max={maxDate}
              onChange={(e) => setTo(e.target.value)}
              style={{ colorScheme: theme }}
              className="bg-[var(--chip)] rounded-lg px-2.5 py-1.5 text-sm border border-[var(--border)] focus:outline-none"
            />
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

      <div className="hidden lg:block overflow-x-auto thin-scroll -mx-2">
        <table className="w-full text-sm min-w-[840px]">
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
              <th className="font-normal py-2 px-2 text-right">Nilai</th>
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
                <td className="py-2.5 px-2 text-right whitespace-nowrap tabular-nums">
                  {r.status === 'in_progress' ? (
                    <span className="text-[var(--faint)]">—</span>
                  ) : valueKind(r) === 'nihil' ? (
                    <span className="text-[var(--faint)]">Rp 0</span>
                  ) : (
                    <span>
                      {formatRp(valueOf(r))}
                      {valueKind(r) === 'jasa' && (
                        <span className="text-[10px] text-[var(--faint)] ml-1">jasa</span>
                      )}
                    </span>
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

      {/* Mobile: kartu */}
      <div className="lg:hidden space-y-2">
        {filtered.slice(0, 100).map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border border-[var(--border-soft)] p-3 ${
              flashIds.has(r.id) ? 'row-flash' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{r.truck_no}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                  r.type === 'supplier'
                    ? 'border-sky-400/40 text-sky-500'
                    : 'border-amber-400/40 text-amber-500'
                }`}
              >
                {r.type === 'supplier' ? 'Supplier' : 'Customer'}
              </span>
            </div>
            <div className="text-xs text-[var(--muted)] mt-0.5">
              {r.date_in.slice(5).replace('-', '/')} · {r.time_in.slice(0, 5)} · #{r.ticket_no}
            </div>
            <div className="text-sm mt-1 text-[var(--muted2)] truncate">
              {r.partner_name} · {r.product_name}
            </div>
            <div className="flex items-center justify-between mt-1.5 text-sm">
              <span className="text-[var(--muted2)]">
                {r.status === 'in_progress' ? (
                  <span className="text-amber-500 text-xs">In progress</span>
                ) : (
                  `Netto ${formatKgFull(r.netto_kg)}`
                )}
              </span>
              <span className="font-medium tabular-nums">
                {r.status === 'in_progress'
                  ? '—'
                  : valueKind(r) === 'nihil'
                    ? 'Rp 0'
                    : formatRp(valueOf(r))}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-[var(--faint)] py-10 text-sm">Tidak ada data.</div>
        )}
      </div>
    </div>
  )
}
