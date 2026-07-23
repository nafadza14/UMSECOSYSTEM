import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Weighing } from './types'
import { valueKind } from './prices'

const COMPANY = 'CV. UPOYO MANDIRI SEJAHTERA'
const ADDRESS =
  'Alamat Basecamp: Jalan Kalasan - Pakem, Dsn Timur, Kel. Selomartani, Kec. Kalasan, Sleman, Yogyakarta'
const PHONE = 'Telp: 082134182633'
const DARK: [number, number, number] = [31, 41, 55]

function rp(v: number): string {
  return 'Rp ' + Math.round(v).toLocaleString('id-ID')
}

/** Angka -> kata (Bahasa Indonesia). */
export function terbilang(n: number): string {
  n = Math.floor(Math.abs(n))
  const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
  const f = (x: number): string => {
    if (x < 12) return s[x]
    if (x < 20) return f(x - 10) + ' belas'
    if (x < 100) return f(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + f(x % 10) : '')
    if (x < 200) return 'seratus' + (x - 100 ? ' ' + f(x - 100) : '')
    if (x < 1000) return f(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + f(x % 100) : '')
    if (x < 2000) return 'seribu' + (x - 1000 ? ' ' + f(x - 1000) : '')
    if (x < 1000000) return f(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + f(x % 1000) : '')
    if (x < 1000000000) return f(Math.floor(x / 1000000)) + ' juta' + (x % 1000000 ? ' ' + f(x % 1000000) : '')
    return f(Math.floor(x / 1000000000)) + ' miliar' + (x % 1000000000 ? ' ' + f(x % 1000000000) : '')
  }
  if (n === 0) return 'nol'
  return f(n).replace(/\s+/g, ' ').trim()
}

function drawHeader(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(COMPANY, w / 2, 15, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(ADDRESS, w / 2, 21, { align: 'center' })
  doc.text(PHONE, w / 2, 25.5, { align: 'center' })
  doc.setLineWidth(0.6)
  doc.line(14, 29, w - 14, 29)
}

export interface InvoiceData {
  invoiceNo: string
  date: string // YYYY-MM-DD
  customerName: string
  items: Weighing[]
  valueOf: (r: Weighing) => number
  adminName: string
}

export function buildInvoice(d: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  drawHeader(doc)

  // Judul
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('INVOICE / FAKTUR', w / 2, 38, { align: 'center' })

  // Meta kiri (kepada) & kanan (no & tanggal)
  const tglLong = new Date(d.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Kepada Yth,', 14, 48)
  doc.setFont('helvetica', 'bold')
  doc.text(d.customerName, 14, 53)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(`No. Invoice : ${d.invoiceNo}`, w - 14, 48, { align: 'right' })
  doc.text(`Tanggal     : ${tglLong}`, w - 14, 53, { align: 'right' })

  // Item
  const items = d.items.filter((r) => valueKind(r) !== 'nihil' && r.status === 'completed')
  const body = items.map((r, i) => {
    const val = d.valueOf(r)
    const isJasa = valueKind(r) === 'jasa'
    const ton = r.netto_kg / 1000
    const unit = isJasa ? val : ton > 0 ? Math.round(val / ton) : 0
    return [
      String(i + 1),
      r.ticket_no,
      isJasa ? 'Jasa Titip Timbang' : r.product_name,
      r.truck_no,
      isJasa ? '1 tiket' : `${r.netto_kg.toLocaleString('id-ID')} kg`,
      isJasa ? rp(unit) + ' /tiket' : rp(unit) + ' /ton',
      rp(val),
    ]
  })
  const total = items.reduce((s, r) => s + d.valueOf(r), 0)

  autoTable(doc, {
    startY: 58,
    head: [['No', 'Tiket', 'Uraian', 'No. Truk', 'Netto', 'Harga', 'Jumlah']],
    body,
    foot: [[{ content: 'TOTAL', colSpan: 6, styles: { halign: 'right' } }, rp(total)]],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: DARK },
    footStyles: { fillColor: [243, 244, 246], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 6: { halign: 'right' } },
    margin: { left: 14, right: 14, top: 32 },
    didDrawPage: () => drawHeader(doc),
  })

  const yEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // Terbilang
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9.5)
  const kata = terbilang(total)
  const terbilangStr = `Terbilang: ${kata.charAt(0).toUpperCase() + kata.slice(1)} rupiah.`
  doc.text(doc.splitTextToSize(terbilangStr, w - 28), 14, yEnd + 8)

  // Tanda tangan
  const sy = yEnd + 24
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Yogyakarta, ${tglLong}`, w - 14, sy, { align: 'right' })
  doc.text('Hormat kami,', w - 14, sy + 5, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(COMPANY, w - 14, sy + 10, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(`( ${d.adminName} )`, w - 14, sy + 30, { align: 'right' })
  doc.setFontSize(9)
  doc.text('Admin', w - 14, sy + 35, { align: 'right' })

  return doc
}

export function printInvoice(d: InvoiceData) {
  const doc = buildInvoice(d)
  doc.autoPrint()
  window.open(doc.output('bloburl'), '_blank')
}

export function downloadInvoice(d: InvoiceData, filename: string) {
  buildInvoice(d).save(filename)
}
