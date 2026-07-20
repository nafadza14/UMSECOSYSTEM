import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Truck, Gauge, ArrowLeftRight, Users } from 'lucide-react'
import type { Weighing } from '../lib/types'
import {
  fetchWeighings,
  computeRecap,
  computeTrend,
  computeProductShare,
  computePartnerShare,
  formatKg,
  formatShortDate,
} from '../lib/data'
import { DATA_SOURCE } from '../lib/supabase'
import Sidebar, { NAV, type ViewKey } from '../components/dashboard/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import KpiCard from '../components/dashboard/KpiCard'
import TonnageChart from '../components/dashboard/TonnageChart'
import ProductBreakdown from '../components/dashboard/ProductBreakdown'
import LiveFeedTable from '../components/dashboard/LiveFeedTable'
import RankTable from '../components/dashboard/RankTable'
import DetailTable from '../components/dashboard/DetailTable'

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
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

const SUBTITLE: Record<ViewKey, string> = {
  overview: 'Rekap keseluruhan (bulanan)',
  feed: 'Semua transaksi penimbangan',
  product: 'Distribusi tonase menurut produk',
  customer: 'Barang keluar — penjualan ke customer',
  supplier: 'Barang masuk — pembelian dari supplier',
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Weighing[]>([])
  const [loading, setLoading] = useState(true)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<ViewKey>(user?.role === 'admin' ? 'feed' : 'overview')
  const [detail, setDetail] = useState<{
    kind: 'product' | 'customer' | 'supplier'
    name: string
  } | null>(null)

  const filteredNav = NAV.filter((nav) => {
    if (user?.role === 'admin') {
      return nav.key === 'feed';
    }
    if (user?.role === 'klien') {
      return nav.key === 'overview' || nav.key === 'feed';
    }
    return true; // owner, manager
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  // Simulasi "live": tiap 12 dtk, satu tiket in_progress jadi selesai
  useEffect(() => {
    const t = setInterval(() => {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.status === 'in_progress')
        if (idx === -1) return prev
        const r = prev[idx]
        const netto = 1500 + Math.floor(Math.random() * 12000)
        const next = [...prev]
        next[idx] = {
          ...r,
          status: 'completed',
          netto_kg: netto,
          gross_kg: r.tare_kg + netto,
          date_out: r.date_in,
          time_out: new Date().toTimeString().slice(0, 8),
        }
        setFlashIds((f) => new Set(f).add(r.id))
        return next
      })
    }, 12000)
    return () => clearInterval(t)
  }, [])

  const filteredRows = useMemo(() => {
    if (user?.role === 'klien') {
      return rows.filter((r) => r.partner_code === user.partnerCode)
    }
    return rows
  }, [rows, user])

  const recap = useMemo(() => computeRecap(filteredRows), [filteredRows])
  const trend = useMemo(() => computeTrend(filteredRows), [filteredRows])
  const products6 = useMemo(() => computeProductShare(filteredRows, 6), [filteredRows])
  const productsAll = useMemo(() => computeProductShare(filteredRows, 20), [filteredRows])
  const customers = useMemo(() => computePartnerShare(filteredRows, 'customer'), [filteredRows])
  const suppliers = useMemo(() => computePartnerShare(filteredRows, 'supplier'), [filteredRows])

  const detailRows = useMemo(() => {
    if (!detail) return []
    if (detail.kind === 'product') return filteredRows.filter((r) => r.product_name === detail.name)
    return filteredRows.filter((r) => r.partner_name === detail.name && r.type === detail.kind)
  }, [detail, filteredRows])

  function selectView(v: ViewKey) {
    setView(v)
    setDetail(null)
  }

  const sourceLabel =
    DATA_SOURCE === 'supabase'
      ? 'Supabase'
      : DATA_SOURCE === 'dummy'
        ? 'Dummy (demo)'
        : 'Data asli (.mdb)'

  const title = NAV.find((n) => n.key === view)?.label ?? 'Ringkasan'

  function renderView() {
    switch (view) {
      case 'feed':
        return <LiveFeedTable rows={filteredRows} flashIds={flashIds} />

      case 'product':
        return (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <ProductBreakdown data={products6} />
              <Panel title="Ranking Produk" subtitle="Klik nama produk untuk lihat detail transaksi">
                <RankTable
                  data={productsAll}
                  unitLabel="tiket"
                  onSelect={(name) => setDetail({ kind: 'product', name })}
                />
              </Panel>
            </div>
            {detail?.kind === 'product' && (
              <DetailTable title={detail.name} rows={detailRows} onClose={() => setDetail(null)} />
            )}
          </>
        )

      case 'customer':
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard icon={ArrowLeftRight} label="Total Keluar" value={formatKg(recap.outbound)} sub={`${recap.customerCount} tiket`} />
              <KpiCard icon={Users} label="Jumlah Customer" value={String(customers.length)} sub="partner aktif" />
              <KpiCard icon={Scale} label="Rata-rata / Tiket" value={formatKg(recap.customerCount ? Math.round(recap.outbound / recap.customerCount) : 0)} sub="netto keluar" />
            </div>
            <Panel title="Ranking Customer" subtitle="Klik nama customer untuk lihat detail transaksi">
              <RankTable
                data={customers}
                unitLabel="tiket"
                onSelect={(name) => setDetail({ kind: 'customer', name })}
              />
            </Panel>
            {detail?.kind === 'customer' && (
              <DetailTable title={detail.name} rows={detailRows} onClose={() => setDetail(null)} />
            )}
          </>
        )

      case 'supplier':
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard icon={ArrowLeftRight} label="Total Masuk" value={formatKg(recap.inbound)} sub={`${recap.supplierCount} tiket`} />
              <KpiCard icon={Truck} label="Jumlah Supplier" value={String(suppliers.length)} sub="partner aktif" />
              <KpiCard icon={Scale} label="Rata-rata / Tiket" value={formatKg(recap.supplierCount ? Math.round(recap.inbound / recap.supplierCount) : 0)} sub="netto masuk" />
            </div>
            <Panel title="Ranking Supplier" subtitle="Klik nama supplier untuk lihat detail transaksi">
              <RankTable
                data={suppliers}
                unitLabel="tiket"
                onSelect={(name) => setDetail({ kind: 'supplier', name })}
              />
            </Panel>
            {detail?.kind === 'supplier' && (
              <DetailTable title={detail.name} rows={detailRows} onClose={() => setDetail(null)} />
            )}
          </>
        )

      case 'overview':
      default:
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={Scale} label="Total Netto" value={formatKg(recap.totalNetto)} sub={`${recap.dayCount} hari`} />
              <KpiCard icon={Truck} label="Jumlah Truk" value={String(recap.truckCount)} sub="tiket selesai" />
              <KpiCard icon={Gauge} label="Rata-rata / Truk" value={formatKg(recap.avgNetto)} sub="netto" />
              <KpiCard icon={ArrowLeftRight} label="Masuk / Keluar" value={formatKg(recap.inbound)} sub={`keluar ${formatKg(recap.outbound)}`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TonnageChart data={trend} />
              </div>
              <ProductBreakdown data={products6} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Top Customer" subtitle="Barang keluar terbanyak">
                <RankTable data={customers.slice(0, 5)} unitLabel="tiket" />
              </Panel>
              <Panel title="Top Supplier" subtitle="Barang masuk terbanyak">
                <RankTable data={suppliers.slice(0, 5)} unitLabel="tiket" />
              </Panel>
            </div>
          </>
        )
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      <Sidebar active={view} onSelect={selectView} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top nav */}
        <div className="lg:hidden sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              UMS <span className="text-[11px] text-[var(--muted)] font-normal">Truck Scale</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle className="text-[var(--text)] hover:bg-[var(--chip)]" />
              <button onClick={handleLogout} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto thin-scroll">
            {filteredNav.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => selectView(key)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  view === key
                    ? 'bg-[var(--chip)] text-[var(--text)] font-medium'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="px-4 md:px-8 pt-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              {title}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {SUBTITLE[view]}
              {recap.dateFrom && (
                <>
                  {' '}· {formatShortDate(recap.dateFrom)} – {formatShortDate(recap.dateTo)}
                </>
              )}{' '}
              · sumber: <span className="text-[var(--muted2)]">{sourceLabel}</span>
            </p>
          </div>
        </header>

        <main className="px-4 md:px-8 py-6 space-y-6">
          {loading ? (
            <div className="text-[var(--faint)] py-24 text-center">Memuat data…</div>
          ) : (
            renderView()
          )}
        </main>

        <footer className="px-4 md:px-8 py-8 text-xs text-[var(--faint)] border-t border-[var(--border)] mt-auto">
          UMS Ecosystem · Truck Scale Live — data asli hasil ekstrak database Truck Scale.
        </footer>
      </div>
    </div>
  )
}
