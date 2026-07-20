# 05 — Admin Panel & Dashboard Specification

**Produk:** TimbangLive
**Plan:** 0.2
**Tanggal:** 2026-07-20

> Plan 0.2: master data nyata — Produk 01–10 (ABU BATU, PASIR, 0,5, SPLIT 1-2, SPLIT 2-3, BATU PONDASI, ABU PASIR, ABU SPLIT, PASIR SPLIT, BANTAK); Customer 01–08 (UMUM, UPOYO, BEJOLUMINTU, dst); Supplier 01–17.

---

## 1. Ikhtisar

Antarmuka web tunggal, responsive (HP/tablet/desktop), dengan tampilan yang menyesuaikan **role**. Dibangun dengan Laravel + Livewire + Tailwind; panel administrasi internal memakai Filament.

Struktur navigasi bergantung role:

| Role | Menu yang tampil |
|------|------------------|
| Owner | Dashboard · Live Feed · Laporan · Monitoring · Master Data · Pengguna · Audit |
| Manager | Dashboard · Live Feed · Laporan · Monitoring (site-nya) |
| Admin | Live Feed · Monitoring (site-nya) |
| Klien | Dashboard Saya · Transaksi Saya · Laporan Saya |

---

## 2. Halaman & Komponen

### 2.1 Dashboard (Ringkasan)

Untuk owner/manager. Komponen:

- **Kartu KPI** (baris atas): Total Netto Hari Ini · Jumlah Truk Hari Ini · Rata-rata/Truk · % vs Kemarin.
- **Toggle Inbound/Outbound**: pisahkan supplier (masuk) vs customer (keluar).
- **Grafik tren**: garis tonase 7/30 hari.
- **Grafik komposisi**: donat per produk; bar top customer/supplier.
- **Ringkasan per site** (owner multi-site): tabel mini tonase per site + status agent.
- **Filter global**: rentang tanggal, site, tipe.

### 2.2 Live Feed

- Tabel realtime (auto-update via WebSocket).
- Kolom: Waktu · Ticket · Tipe · Partner · Produk · No. Truck · Gross · Tare · Netto · Operator · Status.
- Baris baru: animasi highlight + badge "BARU".
- Badge status: `In progress` (kuning) / `Selesai` (hijau).
- Filter & pencarian: tanggal, tipe, produk, partner, operator, no. truck/tiket.
- Aksi baris: lihat detail (drawer), tandai anomali.
- Indikator koneksi realtime (titik hijau "live" / abu "reconnecting").

### 2.3 Detail Transaksi (Drawer/Modal)

- Semua field tiket + timeline (in → out).
- Nilai mentah dari sumber (`partner_raw`, `product_raw`) untuk audit.
- Riwayat perubahan (bila tiket di-update).

### 2.4 Laporan

- Pilih rentang tanggal + filter (site, tipe, partner, produk).
- Preview tabel + subtotal per produk + total netto.
- Tombol export: **Excel** & **PDF**.
- Tab "Terjadwal": atur laporan harian otomatis + penerima (email/WA).

### 2.5 Monitoring Agent

- Kartu per site: status (Online/Offline/Error), last heartbeat, last sync, buffer pending, versi agent.
- Riwayat uptime (timeline).
- Log sync ringkas (batch terakhir: diterima/insert/update/duplikat/error).
- Panel rekonsiliasi harian: selisih sumber vs cloud + tombol "sync ulang".

### 2.6 Master Data (Owner)

- CRUD: Sites, Partners (customer/supplier), Products, Operators.
- Normalisasi kode↔nama; tandai partner generik.
- Mapping akun klien ↔ partner (untuk portal klien).

### 2.7 Pengguna (Owner)

- CRUD user, set role, set site, aktif/nonaktif.
- Reset password, undang via email.

### 2.8 Audit (Owner)

- Tabel audit: siapa, aksi, kapan, IP.
- Filter per user/aksi/tanggal.

---

## 3. Portal Klien (Tampilan Terpisah, Disederhanakan)

### 3.1 Dashboard Saya
- Kartu: Total netto saya (hari/bulan ini), jumlah truk.
- Grafik tren tonase milik klien.

### 3.2 Transaksi Saya
- Tabel transaksi yang partner-nya ter-mapping ke akun klien (BR-6, enforce di query).
- Filter tanggal & produk; pencarian no. truck.

### 3.3 Laporan Saya
- Export PDF/Excel data sendiri.
- Terima laporan harian otomatis (email/WA).

> Klien **tidak** melihat: data klien lain, monitoring agent, master data, pengguna.

---

## 4. Prinsip UI/UX

- **Mobile-first**: mayoritas owner/manager cek dari HP.
- **Angka besar & jelas**: tonase adalah bintang utama; hindari klutter.
- **Warna status konsisten**: hijau=ok, kuning=proses, merah=masalah.
- **Bahasa Indonesia**, istilah operasional lokal (netto, gross, tare, tiket).
- **Loading state & empty state** yang jelas ("Belum ada penimbangan hari ini").
- **Realtime tanpa refresh**: user tidak perlu reload untuk lihat data baru.
- **Aksesibilitas**: kontras cukup, tombol besar untuk dipakai di lapangan.

---

## 5. Wireframe Tekstual — Dashboard Owner (mobile)

```
┌───────────────────────────────┐
│ TimbangLive        ● live  👤 │
├───────────────────────────────┤
│ [ Hari ini ▾ ]  [ Semua site ▾]│
│                               │
│ ┌─────────┐ ┌─────────┐       │
│ │ NETTO   │ │ TRUK    │       │
│ │ 128.4 t │ │  47     │       │
│ │ ▲ 6%    │ │ ▲ 3     │       │
│ └─────────┘ └─────────┘       │
│                               │
│  Tren 7 hari                  │
│  ▁▃▅▂▆▇▅                       │
│                               │
│  Per Produk                   │
│  ● ABU BATU  52%              │
│  ● PASIR     28%              │
│  ● SPLIT 1-2 20%              │
│                               │
│  Live Feed          lihat ▸   │
│  09:01 AB8975HU ABU 2.0t ✅   │
│  08:58 Z8594KA  BANTAK 12.3t ✅│
└───────────────────────────────┘
```

---

## 6. Referensi Silang

- Fitur & role → `03-Functional-Specification.md`
- Sumber data tampilan → `06-REST-API-Specification.md`
- Skema → `04-Database-Architecture.md`
