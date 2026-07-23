import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Weighing } from './types'
import type { Recap, ProductShare, PartnerShare } from './data'

// ===== Kop / Letterhead =====
const COMPANY = 'CV. UPOYO MANDIRI SEJAHTERA'
const ADDRESS =
  'Alamat Basecamp: Jalan Kalasan - Pakem, Dsn Timur, Kel. Selomartani, Kec. Kalasan, Sleman, Yogyakarta'
const PHONE = 'Telp: 082134182633'

const DARK: [number, number, number] = [31, 41, 55]

function kg(v: number): string {
  return `${v.toLocaleString('id-ID')} kg`
}

function rp(v: number): string {
  return `Rp ${Math.round(v).toLocaleString('id-ID')}`
}

function drawHeader(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(COMPANY, w / 2, 14, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(ADDRESS, w / 2, 20, { align: 'center' })
  doc.text(PHONE, w / 2, 24.5, { align: 'center' })
  doc.setLineWidth(0.5)
  doc.line(14, 28, w - 14, 28)
}

export interface ReportData {
  title: string
  period: string
  recap: Recap
  products: ProductShare[]
  customers: PartnerShare[]
  suppliers: PartnerShare[]
  transactions?: Weighing[]
  valueOf?: (r: Weighing) => number // nilai rupiah per transaksi (opsional)
}

function lastY(doc: jsPDF, fallback: number): number {
  const t = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  return t ? t.finalY : fallback
}

export function buildReport(d: ReportData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()

  drawHeader(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(d.title, 14, 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Periode: ${d.period}`, 14, 41.5)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, w - 14, 41.5, { align: 'right' })

  // Ringkasan
  const ringkasan: string[][] = [
    ['Total Netto', kg(d.recap.totalNetto)],
    ['Jumlah Truk', `${d.recap.truckCount} tiket`],
    ['Rata-rata / Truk', kg(d.recap.avgNetto)],
    ['Total Masuk (Supplier)', kg(d.recap.inbound)],
    ['Total Keluar (Customer)', kg(d.recap.outbound)],
  ]
  if (d.valueOf && d.transactions) {
    const tv = d.transactions.reduce((s, r) => s + d.valueOf!(r), 0)
    ringkasan.push(['Total Nilai (estimasi)', rp(tv)])
  }
  autoTable(doc, {
    startY: 46,
    head: [['Ringkasan', 'Nilai']],
    body: ringkasan,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: DARK },
    margin: { left: 14, right: 14 },
  })

  // Per produk
  autoTable(doc, {
    startY: lastY(doc, 46) + 6,
    head: [['Produk', 'Netto', 'Jumlah', '%']],
    body: d.products.map((p) => [p.name, kg(p.netto), String(p.count), `${p.pct}%`]),
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: DARK },
    margin: { left: 14, right: 14 },
  })

  // Top customer
  autoTable(doc, {
    startY: lastY(doc, 60) + 6,
    head: [['Top Customer', 'Netto', 'Tiket']],
    body: d.customers.slice(0, 10).map((c) => [c.name, kg(c.netto), String(c.count)]),
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: DARK },
    margin: { left: 14, right: 14 },
  })

  // Top supplier
  autoTable(doc, {
    startY: lastY(doc, 80) + 6,
    head: [['Top Supplier', 'Netto', 'Tiket']],
    body: d.suppliers.slice(0, 10).map((s) => [s.name, kg(s.netto), String(s.count)]),
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: DARK },
    margin: { left: 14, right: 14 },
  })

  // Detail transaksi (opsional) — dengan kop berulang tiap halaman
  if (d.transactions && d.transactions.length > 0) {
    const tx = [...d.transactions].sort((a, b) =>
      (b.date_in + b.time_in).localeCompare(a.date_in + a.time_in),
    )
    const withValue = !!d.valueOf
    const head = ['Tiket', 'Tanggal', 'Jam', 'Tipe', 'Partner', 'Produk', 'No. Truk', 'Bruto', 'Tara', 'Netto', 'Operator']
    if (withValue) head.push('Nilai (Rp)')
    autoTable(doc, {
      startY: lastY(doc, 100) + 8,
      head: [head],
      body: tx.map((r) => {
        const row = [
          r.ticket_no,
          r.date_in,
          r.time_in.slice(0, 5),
          r.type === 'supplier' ? 'Supplier' : 'Customer',
          r.partner_name,
          r.product_name,
          r.truck_no,
          r.gross_kg ? r.gross_kg.toLocaleString('id-ID') : '-',
          r.tare_kg ? r.tare_kg.toLocaleString('id-ID') : '-',
          r.netto_kg ? r.netto_kg.toLocaleString('id-ID') : '-',
          r.operator,
        ]
        if (withValue) row.push(rp(d.valueOf!(r)))
        return row
      }),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: DARK },
      margin: { left: 14, right: 14, top: 32 },
      didDrawPage: () => drawHeader(doc),
    })
  }

  return doc
}

export function downloadReport(d: ReportData, filename: string) {
  buildReport(d).save(filename)
}

export function printReport(d: ReportData) {
  const doc = buildReport(d)
  doc.autoPrint()
  const url = doc.output('bloburl')
  window.open(url, '_blank')
}
