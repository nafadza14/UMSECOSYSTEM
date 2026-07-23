import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Scale, Truck, Gauge, ArrowLeftRight, CalendarDays, Clock, Printer, Download } from 'lucide-react'
import type { Weighing } from '../../lib/types'
import {
  computeRecap,
  computeTrend,
  computeProductShare,
  computePartnerShare,
  formatKg,
  formatShortDate,
} from '../../lib/data'
import { printReport, downloadReport, type ReportData } from '../../lib/report'
import { usePrices, valueOf as priceValueOf } from '../../lib/prices'
import { useTheme } from '../../lib/theme'
import KpiCard from './KpiCard'
import TonnageChart from './TonnageChart'
import ProductBreakdown from './ProductBreakdown'
import RankTable from './RankTable'

function ExportButtons({ makeData, filename }: { makeData: () => ReportData; filename: string }) {
  const btn =
    'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] hover:bg-[var(--chip-strong)] transition-colors'
  return (
    <div className="flex items-center gap-2">
      <button className={btn} onClick={() => printReport(makeData())} title="Cetak PDF">
        <Printer className="w-4 h-4" /> Print
      </button>
      <button className={btn} onClick={() => downloadReport(makeData(), filename)} title="Unduh PDF">
        <Download className="w-4 h-4" /> PDF
      </button>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-medium">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function KpiRow({ recap }: { recap: ReturnType<typeof computeRecap> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard icon={Scale} label="Total Netto" value={formatKg(recap.totalNetto)} sub={`${recap.dayCount} hari`} />
      <KpiCard icon={Truck} label="Jumlah Truk" value={String(recap.truckCount)} sub="tiket selesai" />
      <KpiCard icon={Gauge} label="Rata-rata / Truk" value={formatKg(recap.avgNetto)} sub="netto" />
      <KpiCard icon={ArrowLeftRight} label="Masuk / Keluar" value={formatKg(recap.inbound)} sub={`keluar ${formatKg(recap.outbound)}`} />
    </div>
  )
}

export default function OverviewView({ rows }: { rows: Weighing[] }) {
  const { theme } = useTheme()
  const { prices } = usePrices()

  const dates = useMemo(
    () => Array.from(new Set(rows.map((r) => r.date_in))).sort(),
    [rows],
  )
  const minDate = dates[0] ?? ''
  const maxDate = dates[dates.length - 1] ?? ''

  // ---- SECTION ATAS: hari terakhir (tetap, tanpa filter) ----
  const dayRows = useMemo(() => rows.filter((r) => r.date_in === maxDate), [rows, maxDate])
  const recapDay = useMemo(() => computeRecap(dayRows), [dayRows])
  const productsDay = useMemo(() => computeProductShare(dayRows, 6), [dayRows])
  const custDay = useMemo(() => computePartnerShare(dayRows, 'customer'), [dayRows])
  const suppDay = useMemo(() => computePartnerShare(dayRows, 'supplier'), [dayRows])

  // ---- SECTION BAWAH: bisa difilter (default = Semua) ----
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  useEffect(() => {
    if (minDate && maxDate) {
      setFrom(minDate)
      setTo(maxDate)
    }
  }, [minDate, maxDate])

  const lo = from && to ? (from <= to ? from : to) : from || to
  const hi = from && to ? (from <= to ? to : from) : from || to

  const rangeRows = useMemo(
    () => rows.filter((r) => (!lo || r.date_in >= lo) && (!hi || r.date_in <= hi)),
    [rows, lo, hi],
  )
  const recapR = useMemo(() => computeRecap(rangeRows), [rangeRows])
  const trendR = useMemo(() => computeTrend(rangeRows), [rangeRows])
  const productsR = useMemo(() => computeProductShare(rangeRows, 6), [rangeRows])
  const custR = useMemo(() => computePartnerShare(rangeRows, 'customer'), [rangeRows])
  const suppR = useMemo(() => computePartnerShare(rangeRows, 'supplier'), [rangeRows])

  const makeTopReport = (): ReportData => ({
    title: 'Laporan Data Terbaru Harian',
    period: formatShortDate(maxDate),
    recap: recapDay,
    products: computeProductShare(dayRows, 50),
    customers: custDay,
    suppliers: suppDay,
    transactions: dayRows,
    valueOf: (r) => priceValueOf(r, prices),
  })
  const makeBottomReport = (): ReportData => ({
    title: 'Laporan Data Penimbangan',
    period: lo === hi ? formatShortDate(lo) : `${formatShortDate(lo)} - ${formatShortDate(hi)}`,
    recap: recapR,
    products: computeProductShare(rangeRows, 50),
    customers: custR,
    suppliers: suppR,
    transactions: rangeRows,
    valueOf: (r) => priceValueOf(r, prices),
  })

  const preset = (kind: 'day' | 'week' | 'month') => {
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

  const inputCls =
    'bg-[var(--chip)] rounded-lg px-3 py-1.5 text-sm border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--border)]'
  const presetCls = (active: boolean) =>
    `px-3 py-1.5 rounded-md transition-colors ${
      active
        ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)]'
        : 'text-[var(--muted2)] hover:text-[var(--text)]'
    }`

  const isDay = lo === maxDate && hi === maxDate
  const isMonth = lo === minDate && hi === maxDate

  return (
    <div className="space-y-10">
      {/* ============ SECTION ATAS: DATA TERBARU HARIAN (tetap) ============ */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--muted)]" />
              Data Terbaru Harian
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {formatShortDate(maxDate)} · {recapDay.truckCount} tiket
            </p>
          </div>
          <ExportButtons makeData={makeTopReport} filename="laporan-harian.pdf" />
        </div>

        <KpiRow recap={recapDay} />

        <div className="grid gap-6 lg:grid-cols-3">
          <ProductBreakdown data={productsDay} />
          <Panel title="Top Customer" subtitle="Keluar hari ini">
            <RankTable data={custDay.slice(0, 5)} unitLabel="tiket" />
          </Panel>
          <Panel title="Top Supplier" subtitle="Masuk hari ini">
            <RankTable data={suppDay.slice(0, 5)} unitLabel="tiket" />
          </Panel>
        </div>
      </section>

      {/* ============ SECTION BAWAH: DATA (BISA DIFILTER TANGGAL) ============ */}
      <section className="space-y-6">
        <div className="border-t border-[var(--border)] pt-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[var(--muted)]" />
              Data — Pilih Rentang Tanggal
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {lo === hi ? formatShortDate(lo) : `${formatShortDate(lo)} – ${formatShortDate(hi)}`}
              {' '}· {recapR.truckCount} tiket
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-[var(--chip)] p-0.5 text-xs">
              <button className={presetCls(isDay)} onClick={() => preset('day')}>Hari terakhir</button>
              <button className={presetCls(!isDay && !isMonth)} onClick={() => preset('week')}>7 hari</button>
              <button className={presetCls(isMonth)} onClick={() => preset('month')}>Semua</button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--muted)]">Dari</span>
              <input
                type="date"
                value={from}
                min={minDate}
                max={maxDate}
                onChange={(e) => setFrom(e.target.value)}
                style={{ colorScheme: theme }}
                className={inputCls}
              />
              <span className="text-xs text-[var(--muted)]">Sampai</span>
              <input
                type="date"
                value={to}
                min={minDate}
                max={maxDate}
                onChange={(e) => setTo(e.target.value)}
                style={{ colorScheme: theme }}
                className={inputCls}
              />
            </div>
            <ExportButtons makeData={makeBottomReport} filename="laporan-data.pdf" />
          </div>
        </div>

        <KpiRow recap={recapR} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TonnageChart data={trendR} />
          </div>
          <ProductBreakdown data={productsR} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Top Customer" subtitle="Barang keluar terbanyak">
            <RankTable data={custR.slice(0, 5)} unitLabel="tiket" />
          </Panel>
          <Panel title="Top Supplier" subtitle="Barang masuk terbanyak">
            <RankTable data={suppR.slice(0, 5)} unitLabel="tiket" />
          </Panel>
        </div>
      </section>
    </div>
  )
}
