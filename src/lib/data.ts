import { supabase, DATA_SOURCE } from './supabase'
import { DUMMY_WEIGHINGS } from './dummyData'
import realDataJson from './realData.json'
import type { Weighing } from './types'

/** Data asli hasil ekstrak dari database.mdb Truck Scale (30 hari terakhir). */
export const REAL_WEIGHINGS = realDataJson as Weighing[]

/**
 * Ambil data timbangan sesuai VITE_DATA_SOURCE:
 * - "real"     → data asli hasil ekstrak .mdb (default, bundled)
 * - "supabase" → dari tabel weighings di Supabase (fallback ke real bila kosong/gagal)
 * - "dummy"    → data demo acak
 */
export async function fetchWeighings(): Promise<Weighing[]> {
  if (DATA_SOURCE === 'supabase' && supabase) {
    try {
      const { data, error } = await supabase
        .from('weighings')
        .select('*')
        .order('date_in', { ascending: false })
        .order('time_in', { ascending: false })
        .limit(2000)
      if (!error && data && data.length > 0) return data as Weighing[]
    } catch {
      /* fallback */
    }
    return REAL_WEIGHINGS
  }
  if (DATA_SOURCE === 'dummy') return DUMMY_WEIGHINGS
  return REAL_WEIGHINGS
}

/** Tanggal acuan = tanggal terbaru yang ada di data (bukan "hari ini" sistem). */
export function referenceDate(rows: Weighing[]): string {
  return rows.reduce((m, r) => (r.date_in > m ? r.date_in : m), '')
}

export interface Kpi {
  refDate: string
  totalNettoToday: number
  truckCountToday: number
  avgNettoToday: number
  vsYesterdayPct: number
  inboundToday: number
  outboundToday: number
}

function sumNetto(rows: Weighing[]) {
  return rows.reduce((s, r) => s + r.netto_kg, 0)
}

export function computeKpi(rows: Weighing[]): Kpi {
  const ref = referenceDate(rows)
  const dates = Array.from(new Set(rows.map((r) => r.date_in))).sort()
  const prev = dates.filter((d) => d < ref).slice(-1)[0] ?? ''

  const todayRows = rows.filter((r) => r.date_in === ref && r.status === 'completed')
  const yRows = rows.filter((r) => r.date_in === prev && r.status === 'completed')

  const totalToday = sumNetto(todayRows)
  const totalY = sumNetto(yRows)
  const vs = totalY > 0 ? ((totalToday - totalY) / totalY) * 100 : 0

  return {
    refDate: ref,
    totalNettoToday: totalToday,
    truckCountToday: todayRows.length,
    avgNettoToday: todayRows.length ? Math.round(totalToday / todayRows.length) : 0,
    vsYesterdayPct: Math.round(vs * 10) / 10,
    inboundToday: sumNetto(todayRows.filter((r) => r.type === 'supplier')),
    outboundToday: sumNetto(todayRows.filter((r) => r.type === 'customer')),
  }
}

export interface TrendPoint {
  date: string
  label: string
  netto: number
}

export function computeTrend(rows: Weighing[]): TrendPoint[] {
  const map = new Map<string, number>()
  rows
    .filter((r) => r.status === 'completed')
    .forEach((r) => map.set(r.date_in, (map.get(r.date_in) ?? 0) + r.netto_kg))
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, netto]) => {
      const d = new Date(date)
      const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      return { date, label, netto }
    })
}

export interface ProductShare {
  name: string
  netto: number
  count: number
  pct: number
}

export function computeProductShare(rows: Weighing[], limit = 6): ProductShare[] {
  const map = new Map<string, { netto: number; count: number }>()
  rows
    .filter((r) => r.status === 'completed')
    .forEach((r) => {
      const cur = map.get(r.product_name) ?? { netto: 0, count: 0 }
      cur.netto += r.netto_kg
      cur.count += 1
      map.set(r.product_name, cur)
    })
  const total = Array.from(map.values()).reduce((s, v) => s + v.netto, 0) || 1
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      netto: v.netto,
      count: v.count,
      pct: Math.round((v.netto / total) * 100),
    }))
    .sort((a, b) => b.netto - a.netto)
    .slice(0, limit)
}

/** Ranking partner (customer / supplier) berdasarkan netto. */
export interface PartnerShare {
  name: string
  netto: number
  count: number
  pct: number
}

export function computePartnerShare(
  rows: Weighing[],
  type: 'customer' | 'supplier',
  limit = 100,
): PartnerShare[] {
  const map = new Map<string, { netto: number; count: number }>()
  rows
    .filter((r) => r.status === 'completed' && r.type === type)
    .forEach((r) => {
      const cur = map.get(r.partner_name) ?? { netto: 0, count: 0 }
      cur.netto += r.netto_kg
      cur.count += 1
      map.set(r.partner_name, cur)
    })
  const total = Array.from(map.values()).reduce((s, v) => s + v.netto, 0) || 1
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      netto: v.netto,
      count: v.count,
      pct: Math.round((v.netto / total) * 100),
    }))
    .sort((a, b) => b.netto - a.netto)
    .slice(0, limit)
}

/** Rekap keseluruhan (seluruh data ~ bulanan) untuk halaman Ringkasan. */
export interface Recap {
  totalNetto: number
  truckCount: number
  avgNetto: number
  inbound: number
  outbound: number
  customerCount: number
  supplierCount: number
  dayCount: number
  dateFrom: string
  dateTo: string
}

export function computeRecap(rows: Weighing[]): Recap {
  const done = rows.filter((r) => r.status === 'completed')
  const dates = Array.from(new Set(done.map((r) => r.date_in))).sort()
  const customer = done.filter((r) => r.type === 'customer')
  const supplier = done.filter((r) => r.type === 'supplier')
  const totalNetto = sumNetto(done)
  return {
    totalNetto,
    truckCount: done.length,
    avgNetto: done.length ? Math.round(totalNetto / done.length) : 0,
    inbound: sumNetto(supplier),
    outbound: sumNetto(customer),
    customerCount: customer.length,
    supplierCount: supplier.length,
    dayCount: dates.length,
    dateFrom: dates[0] ?? '',
    dateTo: dates[dates.length - 1] ?? '',
  }
}

export function formatShortDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatKg(kg: number): string {
  if (kg >= 1000)
    return `${(kg / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} t`
  return `${kg.toLocaleString('id-ID')} kg`
}

export function formatKgFull(kg: number): string {
  return `${kg.toLocaleString('id-ID')} kg`
}

export function formatRefDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
