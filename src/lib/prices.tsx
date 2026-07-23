import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Weighing } from './types'

/** Satu set harga (komoditas per ton + jasa titip timbang per tiket). */
export interface PriceSet {
  products: Record<string, number>
  serviceTitip: number
}

/** Versi harga: berlaku SEJAK effectiveDate. */
export interface PriceVersion extends PriceSet {
  effectiveDate: string // YYYY-MM-DD
  savedAt: string // ISO
  note?: string
}

const DEFAULT_SET: PriceSet = {
  products: {
    'ABU BATU': 95000,
    PASIR: 95000,
    'SPLIT 1-2': 95000,
    'SPLIT 2-3': 95000,
    'BATU PONDASI': 75000,
    BANTAK: 45000,
    '0,5': 0,
    'ABU PASIR': 0,
    'ABU SPLIT': 0,
    'PASIR SPLIT': 0,
  },
  serviceTitip: 15000,
}

const KEY = 'ums_price_history'

function seed(): PriceVersion[] {
  return [{ ...DEFAULT_SET, effectiveDate: '2000-01-01', savedAt: new Date().toISOString(), note: 'Harga awal' }]
}

function load(): PriceVersion[] {
  try {
    const s = localStorage.getItem(KEY)
    if (s) {
      const arr = JSON.parse(s)
      if (Array.isArray(arr) && arr.length) {
        return [...arr].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
      }
    }
  } catch {
    /* ignore */
  }
  return seed()
}

/** Ambil set harga yang berlaku pada suatu tanggal. */
function setForDate(history: PriceVersion[], date: string): PriceSet {
  const eligible = history.filter((v) => v.effectiveDate <= date)
  const v = eligible.length ? eligible[eligible.length - 1] : history[0]
  return v ?? { ...DEFAULT_SET }
}

export type ValueKind = 'komoditas' | 'jasa' | 'nihil'

export function isTitip(r: Weighing): boolean {
  return r.type === 'customer' && (String(r.partner_code).trim() === '07' || /titip/i.test(r.partner_name))
}
export function isTdkJadi(r: Weighing): boolean {
  return (
    r.type === 'customer' &&
    (String(r.partner_code).trim() === '08' || /tdk jadi|tidak jadi|keluar\/tdk/i.test(r.partner_name))
  )
}
export function valueKind(r: Weighing): ValueKind {
  if (isTdkJadi(r)) return 'nihil'
  if (isTitip(r)) return 'jasa'
  return 'komoditas'
}

/** Nilai 1 transaksi memakai set harga tertentu. */
export function valueWith(r: Weighing, set: PriceSet): number {
  const kind = valueKind(r)
  if (kind === 'nihil') return 0
  if (kind === 'jasa') return set.serviceTitip
  const perTon = set.products[r.product_name] ?? 0
  return Math.round((r.netto_kg / 1000) * perTon)
}

export function formatRp(v: number): string {
  return 'Rp ' + Math.round(v).toLocaleString('id-ID')
}

interface PricesCtx {
  history: PriceVersion[]
  latest: PriceSet // versi terbaru (untuk awal edit)
  savePrices: (set: PriceSet, effectiveDate: string, note?: string) => void
  deleteVersion: (savedAt: string) => void
  resetHistory: () => void
  /** Nilai transaksi memakai harga yang berlaku pada tanggal transaksi. */
  valueOf: (r: Weighing) => number
}

const Ctx = createContext<PricesCtx>({
  history: seed(),
  latest: DEFAULT_SET,
  savePrices: () => {},
  deleteVersion: () => {},
  resetHistory: () => {},
  valueOf: () => 0,
})

export function PricesProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<PriceVersion[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(history))
    } catch {
      /* ignore */
    }
  }, [history])

  const savePrices = useCallback((set: PriceSet, effectiveDate: string, note?: string) => {
    setHistory((prev) => {
      const others = prev.filter((v) => v.effectiveDate !== effectiveDate)
      const version: PriceVersion = {
        products: { ...set.products },
        serviceTitip: set.serviceTitip,
        effectiveDate,
        savedAt: new Date().toISOString(),
        note,
      }
      return [...others, version].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    })
  }, [])

  const deleteVersion = useCallback((savedAt: string) => {
    setHistory((prev) => {
      const next = prev.filter((v) => v.savedAt !== savedAt)
      return next.length ? next : seed()
    })
  }, [])

  const resetHistory = useCallback(() => setHistory(seed()), [])

  const valueOf = useCallback(
    (r: Weighing) => valueWith(r, setForDate(history, r.date_in)),
    [history],
  )

  const latest = useMemo<PriceSet>(() => {
    const v = history[history.length - 1]
    return v ? { products: { ...v.products }, serviceTitip: v.serviceTitip } : DEFAULT_SET
  }, [history])

  return (
    <Ctx.Provider value={{ history, latest, savePrices, deleteVersion, resetHistory, valueOf }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePrices = () => useContext(Ctx)
