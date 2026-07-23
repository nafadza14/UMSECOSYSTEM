import { useEffect, useMemo, useState } from 'react'
import { Tags, Wrench, Ban, Save, History, Trash2, RotateCcw, Check } from 'lucide-react'
import type { Weighing } from '../../lib/types'
import { usePrices, formatRp, type PriceSet } from '../../lib/prices'
import { formatShortDate } from '../../lib/data'

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

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function HargaView({ rows }: { rows: Weighing[] }) {
  const { history, latest, savePrices, deleteVersion, resetHistory, valueOf } = usePrices()

  // Draft (belum disimpan) — mulai dari harga versi terbaru
  const [draft, setDraft] = useState<PriceSet>(() => ({
    products: { ...latest.products },
    serviceTitip: latest.serviceTitip,
  }))
  const [effectiveDate, setEffectiveDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  // Sinkronkan draft saat versi terbaru berubah (mis. setelah reset)
  useEffect(() => {
    setDraft({ products: { ...latest.products }, serviceTitip: latest.serviceTitip })
  }, [latest])

  const productNames = useMemo(() => {
    const set = new Set<string>(Object.keys(draft.products))
    rows.forEach((r) => set.add(r.product_name))
    return Array.from(set).sort()
  }, [rows, draft.products])

  const dirty =
    JSON.stringify(draft.products) !== JSON.stringify(latest.products) ||
    draft.serviceTitip !== latest.serviceTitip

  const totalValue = useMemo(
    () => rows.filter((r) => r.status === 'completed').reduce((s, r) => s + valueOf(r), 0),
    [rows, valueOf],
  )

  const setProduct = (name: string, v: number) =>
    setDraft((d) => ({ ...d, products: { ...d.products, [name]: v } }))

  const handleSave = () => {
    savePrices(draft, effectiveDate, note.trim() || undefined)
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const historyDesc = [...history].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Estimasi pendapatan */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="text-sm text-[var(--muted)] mb-1">Estimasi pendapatan seluruh data</div>
        <div className="text-3xl font-semibold tracking-tight">{formatRp(totalValue)}</div>
        <div className="text-sm text-[var(--faint)] mt-1">
          Memakai harga sesuai tanggal tiap transaksi (harga lama tetap dipakai untuk data lama).
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
              <RupiahInput value={draft.products[name] ?? 0} onChange={(v) => setProduct(name, v)} suffix="/ ton" />
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
          <b>Titip Timbang</b> adalah jasa penimbangan (bukan jual komoditas) — flat per tiket.
        </p>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm">Titip Timbang</span>
          <RupiahInput
            value={draft.serviceTitip}
            onChange={(v) => setDraft((d) => ({ ...d, serviceTitip: v }))}
            suffix="/ tiket"
          />
        </div>
      </div>

      {/* Catatan tidak jadi */}
      <div className="glass border border-[var(--border)] rounded-2xl p-4 flex items-start gap-2">
        <Ban className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--muted)]">
          Transaksi <b>KELUAR / TDK JADI AMBIL</b> otomatis bernilai <b>Rp 0</b> (tidak menghasilkan uang).
        </p>
      </div>

      {/* SIMPAN */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Berlaku sejak tanggal</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="bg-[var(--chip)] rounded-lg px-3 py-1.5 text-sm border border-[var(--border)] focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-[var(--muted)] mb-1">Catatan (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. naik harga BBM"
              className="w-full bg-[var(--chip)] rounded-lg px-3 py-1.5 text-sm border border-[var(--border)] focus:outline-none"
            />
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] hover:opacity-90 transition-opacity"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Tersimpan' : 'Simpan Harga'}
          </button>
        </div>
        <p className="text-xs text-[var(--faint)]">
          {dirty
            ? 'Ada perubahan belum disimpan. Klik Simpan untuk membuat versi harga baru.'
            : 'Harga sesuai versi terbaru. Ubah nilai lalu Simpan untuk membuat versi baru.'}
          {' '}Harga baru berlaku untuk transaksi mulai tanggal yang dipilih; transaksi lama tetap pakai harga lama.
        </p>
      </div>

      {/* HISTORY */}
      <div className="glass border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-[var(--muted)]" />
          <h3 className="text-base font-medium">Riwayat Perubahan Harga</h3>
        </div>
        <div className="overflow-x-auto thin-scroll -mx-2">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <th className="font-normal py-2 px-2">Berlaku sejak</th>
                <th className="font-normal py-2 px-2 text-right">Titip Timbang</th>
                <th className="font-normal py-2 px-2">Catatan</th>
                <th className="font-normal py-2 px-2">Diubah</th>
                <th className="font-normal py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {historyDesc.map((v) => (
                <tr key={v.savedAt} className="border-b border-[var(--border-soft)]">
                  <td className="py-2 px-2 whitespace-nowrap">{formatShortDate(v.effectiveDate)}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{formatRp(v.serviceTitip)}</td>
                  <td className="py-2 px-2 text-[var(--muted2)]">{v.note ?? '-'}</td>
                  <td className="py-2 px-2 text-[var(--faint)] whitespace-nowrap">
                    {new Date(v.savedAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={() => deleteVersion(v.savedAt)}
                      className="text-[var(--faint)] hover:text-rose-500"
                      title="Hapus versi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={resetHistory}
        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--chip)] hover:bg-[var(--chip-strong)] transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Reset ke harga default
      </button>
    </div>
  )
}
