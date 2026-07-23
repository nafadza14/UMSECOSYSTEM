import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Weighing } from './types'

/** Harga komoditas (Rp per ton) + harga jasa titip timbang (Rp per tiket). */
export interface Prices {
  products: Record<string, number> // key = product_name, nilai = Rp/ton
  serviceTitip: number // Rp flat per tiket (jasa)
}

const DEFAULTS: Prices = {
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

const KEY = 'ums_prices'

interface PricesCtx {
  prices: Prices
  setProductPrice: (name: string, val: number) => void
  setServiceTitip: (val: number) => void
  resetPrices: () => void
}

const Ctx = createContext<PricesCtx>({
  prices: DEFAULTS,
  setProductPrice: () => {},
  setServiceTitip: () => {},
  resetPrices: () => {},
})

function load(): Prices {
  try {
    const s = localStorage.getItem(KEY)
    if (s) {
      const p = JSON.parse(s)
      return {
        products: { ...DEFAULTS.products, ...(p.products || {}) },
        serviceTitip: typeof p.serviceTitip === 'number' ? p.serviceTitip : DEFAULTS.serviceTitip,
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

export function PricesProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Prices>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prices))
    } catch {
      /* ignore */
    }
  }, [prices])
  const setProductPrice = (name: string, val: number) =>
    setPrices((p) => ({ ...p, products: { ...p.products, [name]: val } }))
  const setServiceTitip = (val: number) => setPrices((p) => ({ ...p, serviceTitip: val }))
  const resetPrices = () => setPrices(DEFAULTS)
  return (
    <Ctx.Provider value={{ prices, setProductPrice, setServiceTitip, resetPrices }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePrices = () => useContext(Ctx)

/** Titip timbang = jasa (customer 07). */
export function isTitip(r: Weighing): boolean {
  return r.type === 'customer' && (String(r.partner_code).trim() === '07' || /titip/i.test(r.partner_name))
}

/** Keluar / tidak jadi diambil (customer 08) = tidak menghasilkan uang. */
export function isTdkJadi(r: Weighing): boolean {
  return (
    r.type === 'customer' &&
    (String(r.partner_code).trim() === '08' || /tdk jadi|tidak jadi|keluar\/tdk/i.test(r.partner_name))
  )
}

export type ValueKind = 'komoditas' | 'jasa' | 'nihil'

export function valueKind(r: Weighing): ValueKind {
  if (isTdkJadi(r)) return 'nihil'
  if (isTitip(r)) return 'jasa'
  return 'komoditas'
}

/** Nilai rupiah 1 transaksi berdasarkan setting harga. */
export function valueOf(r: Weighing, prices: Prices): number {
  const kind = valueKind(r)
  if (kind === 'nihil') return 0
  if (kind === 'jasa') return prices.serviceTitip
  const perTon = prices.products[r.product_name] ?? 0
  return Math.round((r.netto_kg / 1000) * perTon)
}

export function formatRp(v: number): string {
  return 'Rp ' + Math.round(v).toLocaleString('id-ID')
}
