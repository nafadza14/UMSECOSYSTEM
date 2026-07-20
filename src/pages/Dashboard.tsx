import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Truck, Gauge, ArrowLeftRight, ArrowLeft } from 'lucide-react'
import type { Weighing } from '../lib/types'
import {
  fetchWeighings,
  computeKpi,
  computeTrend,
  computeProductShare,
  formatKg,
  formatRefDate,
} from '../lib/data'
import { DATA_SOURCE } from '../lib/supabase'
import ThemeToggle from '../components/ThemeToggle'
import KpiCard from '../components/dashboard/KpiCard'
import TonnageChart from '../components/dashboard/TonnageChart'
import ProductBreakdown from '../components/dashboard/ProductBreakdown'
import LiveFeedTable from '../components/dashboard/LiveFeedTable'

export default function Dashboard() {
  const [rows, setRows] = useState<Weighing[]>([])
  const [loading, setLoading] = useState(true)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    let mounted = true
    fetchWeighings().then((data) => {
      if (!mounted) return
      setRows(data)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Jam realtime di header
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Simulasi "live": tiap 12 dtk, salah satu tiket in_progress jadi selesai
  useEffect(() => {
    const t = setInterval(() => {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.status === 'in_progress')
        if (idx === -1) return prev
        const r = prev[idx]
        const netto = 1500 + Math.floor(Math.random() * 12000)
        const updated: Weighing = {
          ...r,
          status: 'completed',
          netto_kg: netto,
          gross_kg: r.tare_kg + netto,
          date_out: r.date_in,
          time_out: new Date().toTimeString().slice(0, 8),
        }
        const next = [...prev]
        next[idx] = updated
        setFlashIds((f) => new Set(f).add(r.id))
        return next
      })
    }, 12000)
    return () => clearInterval(t)
  }, [])

  const kpi = useMemo(() => computeKpi(rows), [rows])
  const trend = useMemo(() => computeTrend(rows), [rows])
  const products = useMemo(() => computeProductShare(rows), [rows])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="px-4 md:px-8 lg:px-12 pt-6">
        <div className="glass rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-8 h-8 rounded-lg bg-[var(--chip)] flex items-center justify-center hover:bg-[var(--chip-strong)] transition-colors"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-lg font-semibold tracking-tight leading-none">UMS</div>
              <div className="text-[11px] text-[var(--muted)]">Truck Scale Live</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm tabular-nums">{clock.toLocaleTimeString('id-ID')}</div>
              <div className="text-[11px] text-[var(--muted)]">
                {clock.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
            <ThemeToggle className="text-[var(--text)] hover:bg-[var(--chip)]" />
          </div>
        </div>
      </header>

      <main className="px-4 md:px-8 lg:px-12 py-6 space-y-6">
        {/* Title row */}
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              style={{ letterSpacing: '-0.03em' }}
            >
              Dashboard Penimbangan
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Ringkasan hari terakhir ({formatRefDate(kpi.refDate)}) · sumber:{' '}
              <span className="text-[var(--muted2)]">
                {DATA_SOURCE === 'supabase'
                  ? 'Supabase'
                  : DATA_SOURCE === 'dummy'
                    ? 'Dummy (demo)'
                    : 'Data asli (ekstrak .mdb)'}
              </span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-[var(--faint)] py-20 text-center">Memuat data…</div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Scale}
                label="Total Netto"
                value={formatKg(kpi.totalNettoToday)}
                deltaPct={kpi.vsYesterdayPct}
                sub="vs hari sebelumnya"
              />
              <KpiCard
                icon={Truck}
                label="Jumlah Truk"
                value={String(kpi.truckCountToday)}
                sub="tiket selesai"
              />
              <KpiCard
                icon={Gauge}
                label="Rata-rata / Truk"
                value={formatKg(kpi.avgNettoToday)}
                sub="netto"
              />
              <KpiCard
                icon={ArrowLeftRight}
                label="Masuk / Keluar"
                value={`${formatKg(kpi.inboundToday)}`}
                sub={`keluar ${formatKg(kpi.outboundToday)}`}
              />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TonnageChart data={trend} />
              </div>
              <ProductBreakdown data={products} />
            </div>

            {/* Live feed */}
            <LiveFeedTable rows={rows} flashIds={flashIds} />
          </>
        )}
      </main>

      <footer className="px-4 md:px-8 lg:px-12 py-8 text-xs text-[var(--faint)] border-t border-[var(--border)] mt-6">
        UMS Ecosystem · Truck Scale Live — fitur pertama. Data asli hasil ekstrak database Truck Scale (30 hari terakhir).
      </footer>
    </div>
  )
}
