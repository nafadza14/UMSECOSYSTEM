import { useMemo } from 'react'
import { Printer, Download, FileText, Receipt } from 'lucide-react'
import type { Weighing } from '../../lib/types'
import { usePrices, valueKind, formatRp } from '../../lib/prices'
import { formatShortDate } from '../../lib/data'
import { useAuth } from '../../contexts/AuthContext'
import { printInvoice, downloadInvoice, type InvoiceData } from '../../lib/invoice'

interface DayGroup {
  date: string
  items: Weighing[]
  total: number
}

export default function InvoiceView({ rows }: { rows: Weighing[] }) {
  const { valueOf } = usePrices()
  const { user } = useAuth()

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>()
    rows
      .filter((r) => r.status === 'completed' && valueKind(r) !== 'nihil')
      .forEach((r) => {
        const g = map.get(r.date_in) ?? { date: r.date_in, items: [], total: 0 }
        g.items.push(r)
        g.total += valueOf(r)
        map.set(r.date_in, g)
      })
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [rows, valueOf])

  const grandTotal = groups.reduce((s, g) => s + g.total, 0)

  const customerName = useMemo(() => {
    const counts = new Map<string, number>()
    rows.forEach((r) => counts.set(r.partner_name, (counts.get(r.partner_name) ?? 0) + 1))
    let best = user?.name ?? 'Pelanggan'
    let max = 0
    counts.forEach((c, n) => {
      if (c > max) {
        max = c
        best = n
      }
    })
    return best
  }, [rows, user])

  const adminOf = (items: Weighing[]) => {
    const counts = new Map<string, number>()
    items.forEach((r) => counts.set(r.operator, (counts.get(r.operator) ?? 0) + 1))
    let best = 'Admin'
    let max = 0
    counts.forEach((c, n) => {
      if (n && c > max) {
        max = c
        best = n
      }
    })
    return best
  }

  const makeInvoice = (g: DayGroup): InvoiceData => ({
    invoiceNo: `INV/${g.date.replace(/-/g, '')}/${(user?.partnerCode ?? 'CUST').toString().replace(/\s/g, '')}`,
    date: g.date,
    customerName,
    items: g.items,
    valueOf,
    adminName: adminOf(g.items),
  })

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Ringkasan tagihan */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="text-sm text-[var(--muted)] mb-1">Total tagihan ({groups.length} invoice)</div>
        <div className="text-3xl font-semibold tracking-tight">{formatRp(grandTotal)}</div>
        <div className="text-sm text-[var(--faint)] mt-1">Atas nama: {customerName}</div>
      </div>

      {/* Daftar invoice harian */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-[var(--muted)]" />
          <h3 className="text-base font-medium">Invoice Harian</h3>
        </div>

        {groups.length === 0 ? (
          <div className="text-center text-[var(--faint)] py-10 text-sm">
            Belum ada tagihan.
          </div>
        ) : (
          <div className="overflow-x-auto thin-scroll -mx-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                  <th className="font-normal py-2 px-2">Tanggal</th>
                  <th className="font-normal py-2 px-2 text-right">Item</th>
                  <th className="font-normal py-2 px-2 text-right">Total Tagihan</th>
                  <th className="font-normal py-2 px-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.date} className="border-b border-[var(--border-soft)]">
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--faint)]" />
                        {formatShortDate(g.date)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-[var(--muted2)]">{g.items.length}</td>
                    <td className="py-2.5 px-2 text-right font-medium tabular-nums">{formatRp(g.total)}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => printInvoice(makeInvoice(g))}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] hover:bg-[var(--chip-strong)] transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <button
                          onClick={() =>
                            downloadInvoice(makeInvoice(g), `invoice-${g.date}.pdf`)
                          }
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] hover:bg-[var(--chip-strong)] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--faint)]">
        Invoice resmi ber-kop CV. Upoyo Mandiri Sejahtera, lengkap dengan rincian, terbilang, dan tanda
        tangan admin. Nilai memakai harga yang berlaku pada tanggal transaksi.
      </p>
    </div>
  )
}
