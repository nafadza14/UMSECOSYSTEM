import { X } from 'lucide-react'
import type { Weighing } from '../../lib/types'
import { formatKgFull } from '../../lib/data'

/** Tabel transaksi detail — kolom mengikuti database Truck Scale (.mdb). */
export default function DetailTable({
  title,
  rows,
  onClose,
}: {
  title: string
  rows: Weighing[]
  onClose: () => void
}) {
  const sorted = [...rows].sort((a, b) =>
    (b.date_in + b.time_in).localeCompare(a.date_in + a.time_in),
  )
  const total = rows.reduce((s, r) => s + r.netto_kg, 0)
  const num = (v: number) => (v ? v.toLocaleString('id-ID') : '-')

  return (
    <div className="glass border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-medium">Detail: {title}</h3>
          <p className="text-sm text-[var(--muted)]">
            {rows.length} transaksi · total netto {formatKgFull(total)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--text)] px-2 py-1 rounded-lg hover:bg-[var(--chip)]"
        >
          <X className="w-4 h-4" /> Tutup
        </button>
      </div>

      <div className="overflow-x-auto thin-scroll -mx-2">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="font-normal py-2 px-2">Tiket</th>
              <th className="font-normal py-2 px-2">Tgl Masuk</th>
              <th className="font-normal py-2 px-2">Jam In</th>
              <th className="font-normal py-2 px-2">Jam Out</th>
              <th className="font-normal py-2 px-2">Tipe</th>
              <th className="font-normal py-2 px-2">Partner</th>
              <th className="font-normal py-2 px-2">Produk</th>
              <th className="font-normal py-2 px-2">No. Truk</th>
              <th className="font-normal py-2 px-2 text-right">Bruto (W1)</th>
              <th className="font-normal py-2 px-2 text-right">Tara (W2)</th>
              <th className="font-normal py-2 px-2 text-right">Netto</th>
              <th className="font-normal py-2 px-2">Operator</th>
              <th className="font-normal py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border-soft)] hover:bg-[var(--hover)]">
                <td className="py-2 px-2 text-[var(--muted)]">{r.ticket_no}</td>
                <td className="py-2 px-2 whitespace-nowrap">{r.date_in}</td>
                <td className="py-2 px-2 text-[var(--muted2)] whitespace-nowrap">{r.time_in.slice(0, 5)}</td>
                <td className="py-2 px-2 text-[var(--muted2)] whitespace-nowrap">
                  {r.time_out ? r.time_out.slice(0, 5) : '-'}
                </td>
                <td className="py-2 px-2">
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
                <td className="py-2 px-2 text-[var(--muted2)] whitespace-nowrap">{r.partner_name}</td>
                <td className="py-2 px-2 text-[var(--muted2)] whitespace-nowrap">{r.product_name}</td>
                <td className="py-2 px-2 text-[var(--muted2)] whitespace-nowrap">{r.truck_no}</td>
                <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{num(r.gross_kg)}</td>
                <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{num(r.tare_kg)}</td>
                <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap font-medium">{num(r.netto_kg)}</td>
                <td className="py-2 px-2 text-[var(--muted)] whitespace-nowrap">{r.operator}</td>
                <td className="py-2 px-2">
                  {r.status === 'in_progress' ? (
                    <span className="text-xs text-amber-500">Proses</span>
                  ) : (
                    <span className="text-xs text-emerald-500">Selesai</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center text-[var(--faint)] py-8 text-sm">Tidak ada transaksi.</div>
        )}
      </div>
    </div>
  )
}
