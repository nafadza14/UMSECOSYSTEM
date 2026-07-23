import { useMemo } from 'react'
import { Tags, Wrench, Ban, RotateCcw } from 'lucide-react'
import type { Weighing } from '../../lib/types'
import { usePrices, valueOf, formatRp } from '../../lib/prices'

function RupiahInput({
  value,
  onChange,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[var(--muted)]">Rp</span>
      <input
        type="number"
        min={0}
        step={1000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-32 bg-[var(--chip)] rounded-lg px-3 py-1.5 text-sm text-right border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--border)]"
      />
      {suffix && <span className="text-xs text-[var(--muted)]">{suffix}</span>}
    </div>
  )
}

export default function HargaView({ rows }: { rows: Weighing[] }) {
  const { prices, setProductPrice, setServiceTitip, resetPrices } = usePrices()

  // Semua produk yang muncul di data + yang punya harga default
  const productNames = useMemo(() => {
    const set = new Set<string>(Object.keys(prices.products))
    rows.forEach((r) => set.add(r.product_name))
    return Array.from(set).sort()
  }, [rows, prices.products])

  const totalValue = useMemo(
    () => rows.filter((r) => r.status === 'completed').reduce((s, r) => s + valueOf(r, prices), 0),
    [rows, prices],
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Ringkasan estimasi */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="text-sm text-[var(--muted)] mb-1">Estimasi nilai seluruh data</div>
        <div className="text-3xl font-semibold tracking-tight">{formatRp(totalValue)}</div>
        <div className="text-sm text-[var(--faint)] mt-1">
          Dihitung dari harga di bawah · komoditas (per ton) + jasa titip timbang
        </div>
      </div>

      {/* Harga komoditas */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Tags className="w-5 h-5 text-[var(--muted)]" />
          <h3 className="text-base font-medium">Harga Komoditas</h3>
        </div>
        <p className="text-sm text-[var(--muted)] mb-4">Harga jual per <b>ton</b> untuk tiap produk.</p>
        <div className="divide-y divide-[var(--border-soft)]">
          {productNames.map((name) => (
            <div key={name} className="flex items-center justify-between py-2.5">
              <span className="text-sm">{name}</span>
              <RupiahInput
                value={prices.products[name] ?? 0}
                onChange={(v) => setProductPrice(name, v)}
                suffix="/ ton"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Harga jasa */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-5 h-5 text-[var(--muted)]" />
          <h3 className="text-base font-medium">Harga Jasa</h3>
        </div>
        <p className="text-sm text-[var(--muted)] mb-4">
          <b>Titip Timbang</b> adalah jasa penimbangan (bukan jual komoditas) — dihitung flat per tiket.
        </p>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm">Titip Timbang</span>
          <RupiahInput value={prices.serviceTitip} onChange={setServiceTitip} suffix="/ tiket" />
        </div>
      </div>

      {/* Catatan tidak jadi */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Ban className="w-5 h-5 text-rose-500" />
          <h3 className="text-base font-medium">Keluar / Tidak Jadi Diambil</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Transaksi <b>KELUAR / TDK JADI AMBIL</b> otomatis bernilai <b>Rp 0</b> (tidak menghasilkan uang).
        </p>
      </div>

      <button
        onClick={resetPrices}
        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--chip)] hover:bg-[var(--chip-strong)] transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Kembalikan ke harga default
      </button>

      <p className="text-xs text-[var(--faint)]">
        Perubahan harga tersimpan otomatis di browser ini dan langsung dipakai pada kolom "Nilai" di
        tabel data & laporan PDF.
      </p>
    </div>
  )
}
