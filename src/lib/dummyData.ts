import type { Weighing } from './types'

/**
 * Data dummy dibuat menyerupai screenshot Truck Scale v1.1.3.
 * Deterministik (seeded) supaya stabil antar-render.
 */

const PRODUCTS = [
  { code: '01', name: 'ABU BATU' },
  { code: '02', name: 'PASIR' },
  { code: '04', name: 'SPLIT 1-2' },
  { code: '10', name: 'BANTAK' },
  { code: '03', name: '0,5' },
]

const CUSTOMERS = [
  { code: '01', name: 'UMUM' },
  { code: '07', name: 'TITIP TIMBANG' },
  { code: '08', name: 'KELUAR/TDK JADI' },
]

const SUPPLIERS = [
  { code: '17', name: 'UPOYO' },
  { code: '21', name: 'SUMBER REJEKI' },
  { code: '33', name: 'KARYA MANDIRI' },
]

const TRUCKS = [
  'COLT', 'AB 8762 BD', 'K 1360 RF', 'AG 1876 SC', 'CJ', 'AB 8617 HU',
  'AB 9000 AE', 'AB 8301 VK', 'AB 8220 PH', 'AD 8573 UM', 'AB 8918 UH',
  'AB 8499 Y', 'AG 8944 VA', 'AD 1756', 'AB 8626 BD', 'AB 8975 HU',
  'AB 8731 I', 'Z 8594 KA',
]

const OPERATORS = ['RENA', 'RENA', 'RENA', 'ANDI', 'SITI']

// PRNG sederhana (mulberry32) — deterministik
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0')
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Tanggal acuan = "hari ini" aplikasi. Kita pakai 4 hari terakhir. */
function lastDays(count: number): Date[] {
  const base = new Date()
  const out: Date[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    out.push(d)
  }
  return out
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function buildWeighings(): Weighing[] {
  const rng = mulberry32(20260720)
  const days = lastDays(4)
  const rows: Weighing[] = []
  let ticket = 6442

  days.forEach((day, dayIdx) => {
    const isToday = dayIdx === days.length - 1
    const count = 12 + Math.floor(rng() * 8) // 12–19 tiket/hari

    for (let i = 0; i < count; i++) {
      ticket += 1
      const type: Weighing['type'] = rng() > 0.45 ? 'customer' : 'supplier'
      const partner = type === 'customer' ? pick(rng, CUSTOMERS) : pick(rng, SUPPLIERS)
      const product = pick(rng, PRODUCTS)
      const truck = pick(rng, TRUCKS)

      // Bobot: supplier cenderung lebih berat (muatan masuk)
      const heavy = type === 'supplier' || rng() > 0.6
      const tare = 900 + Math.floor(rng() * (heavy ? 3600 : 1400))
      const netto = heavy
        ? 6000 + Math.floor(rng() * 12000)
        : 1200 + Math.floor(rng() * 5000)
      const gross = tare + netto

      const hourIn = 7 + Math.floor(rng() * 10)
      const minIn = Math.floor(rng() * 60)
      const secIn = Math.floor(rng() * 60)
      const durMin = 3 + Math.floor(rng() * 20)
      const outTotal = minIn + durMin
      const hourOut = hourIn + Math.floor(outTotal / 60)
      const minOut = outTotal % 60

      // Beberapa tiket "hari ini" masih in_progress (belum out)
      const inProgress = isToday && i >= count - 3

      rows.push({
        id: `${isoDate(day)}-${type}-${ticket}`,
        type,
        ticket_no: pad(ticket, 5),
        partner_code: partner.code,
        partner_name: partner.name,
        product_code: product.code,
        product_name: product.name,
        truck_no: truck,
        gross_kg: inProgress ? 0 : gross,
        tare_kg: tare,
        netto_kg: inProgress ? 0 : netto,
        date_in: isoDate(day),
        time_in: `${pad(hourIn)}:${pad(minIn)}:${pad(secIn)}`,
        date_out: inProgress ? null : isoDate(day),
        time_out: inProgress ? null : `${pad(hourOut)}:${pad(minOut)}:${pad(secIn)}`,
        operator: pick(rng, OPERATORS),
        status: inProgress ? 'in_progress' : 'completed',
      })
    }
  })

  // Urutkan terbaru dulu
  return rows.sort((a, b) => {
    const ka = `${a.date_in} ${a.time_in}`
    const kb = `${b.date_in} ${b.time_in}`
    return kb.localeCompare(ka)
  })
}

export const DUMMY_WEIGHINGS: Weighing[] = buildWeighings()

export function todayIso(): string {
  return isoDate(new Date())
}
