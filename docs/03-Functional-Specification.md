# 03 — Functional Specification

**Produk:** TimbangLive
**Plan:** 0.2
**Tanggal:** 2026-07-20

> Plan 0.2: aturan bisnis di §5 disesuaikan dengan skema `.mdb` nyata (dua tabel transaksi, tipe diturunkan, netto = |W1−W2|).

---

## 1. Ikhtisar Fitur (Feature Map)

| Kode | Modul | Ringkasan | Prioritas |
|------|-------|-----------|-----------|
| F1 | Sinkronisasi Data | Ambil tiket dari Truck Scale otomatis | MVP |
| F2 | Live Feed | Daftar timbangan realtime | MVP |
| F3 | Ringkasan Tonase | Total & tren harian/bulanan | MVP |
| F4 | Autentikasi & Role | Login multi-role (RBAC) | MVP |
| F5 | Portal Klien | Klien lihat data miliknya | 1.1 |
| F6 | Laporan Otomatis | Rekap harian + export/kirim | 1.1 |
| F7 | Monitoring Agent | Status sync + alert | MVP |
| F8 | Master Data | Kelola customer/supplier/produk/site | 1.1 |
| F9 | Audit & Log | Jejak aktivitas | 1.2 |

---

## 2. Peran & Hak Akses (RBAC)

| Fitur / Aksi | Owner | Manager | Admin | Klien |
|--------------|:-----:|:-------:|:-----:|:-----:|
| Lihat semua site | ✅ | ➖ (site-nya) | ➖ (site-nya) | ❌ |
| Live feed timbangan | ✅ | ✅ | ✅ | ➖ (miliknya) |
| Ringkasan tonase | ✅ | ✅ | ➖ | ➖ (miliknya) |
| Export laporan | ✅ | ✅ | ✅ | ➖ (miliknya) |
| Kelola user | ✅ | ❌ | ❌ | ❌ |
| Kelola master data | ✅ | ➖ | ❌ | ❌ |
| Lihat status agent | ✅ | ✅ | ✅ | ❌ |
| Terima laporan harian | ✅ | ✅ | ➖ | ✅ |

Keterangan: ✅ penuh · ➖ terbatas/scoped · ❌ tidak ada.

---

## 3. Spesifikasi Fitur

### F1 — Sinkronisasi Data (otomatis, tanpa campur tangan admin)

**Tujuan:** Setiap tiket yang disimpan di Truck Scale muncul di cloud ≤ 10 detik.

Perilaku:
- Agent memantau database lokal terus-menerus.
- Tiket baru dikirim ke cloud; tiket yang diedit (mis. tare/out terisi belakangan) dikirim ulang sebagai update.
- Tidak ada tombol/aksi yang harus ditekan admin.

Aturan bisnis (disesuaikan skema nyata):
- **BR-1:** Kunci unik transaksi = `site_id + type + ticket_no` (ticket_no = `TRANSID`). Tipe diturunkan: `CUSTID` terisi → customer, `SUPPID` terisi → supplier.
- **BR-2:** Tiket "selesai" bila ada di `tbtransact00` (punya `DATEOUT`/`TIMEOUT` & `NETTO`). Tiket di `TbTransact` tanpa `W2`/`DATEOUT` = "in progress".
- **BR-3:** Perubahan pada tiket yang sama meng-update record, bukan membuat baru (deteksi via hash isi baris).

### F2 — Live Feed Timbangan

Menampilkan tabel realtime transaksi hari ini (default), kolom: waktu, ticket no, tipe, customer/supplier, produk, no. truck, gross, tare, netto, operator, status.

- Baris baru muncul otomatis (highlight beberapa detik).
- Filter: tanggal, tipe (customer/supplier), produk, customer/supplier, site, operator.
- Pencarian: no. truck / no. tiket.
- Badge status: "In progress" (belum out) vs "Selesai".

### F3 — Ringkasan Tonase (Dashboard Angka)

- Kartu angka besar: **total netto hari ini**, jumlah truk hari ini, rata-rata per truk.
- Perbandingan vs kemarin (naik/turun %).
- Grafik: tren tonase harian (7/30 hari), breakdown per produk, per customer/supplier (top N).
- Pemisahan **inbound (supplier)** vs **outbound (customer)**.

### F4 — Autentikasi & Role

- Login email + password; opsi lupa password.
- Sesi aman (token). Logout.
- Role ditetapkan owner. Klien di-mapping ke satu/lebih customer/supplier.

### F5 — Portal Klien

- Klien login → hanya melihat transaksi yang customer/supplier-nya di-mapping ke akunnya.
- Lihat daftar & ringkasan miliknya, unduh laporan sendiri.
- **Prasyarat:** master data customer/supplier bersih & ter-mapping (lihat F8 & catatan data generik "01UMUM").

### F6 — Laporan Otomatis

- Rekap harian per site & per klien (Excel + PDF).
- Terjadwal (mis. tiap hari 23:30) → kirim via email/WhatsApp ke penerima terdaftar.
- Manual export kapan saja dengan rentang tanggal & filter.
- Isi laporan: daftar tiket + subtotal per produk + total netto.

### F7 — Monitoring Agent

- Halaman status: tiap site menampilkan "Online / Offline", last heartbeat, last sync, jumlah buffer pending.
- Alert otomatis ke owner (WA/email) bila:
  - Agent tidak heartbeat > 5 menit.
  - Buffer pending menumpuk di atas ambang.
  - Rekonsiliasi harian menemukan selisih.

### F8 — Master Data

- Kelola: site, customer, supplier, produk, operator, user & mapping klien.
- Normalisasi kode (mis. `01ABU BATU`, `02PASIR`, `04SPLIT 1-2`, `10BANTAK`) → nama tampil rapi.
- Mapping akun klien ke kode customer/supplier.

### F9 — Audit & Log

- Catat login, export, perubahan master data, perubahan user.
- Log sync teknis (untuk troubleshoot) tersimpan & bisa ditelusuri.

---

## 4. User Flow Utama

### 4.1 Flow: Penimbangan → Muncul di Dashboard

```
Admin timbang truk ─▶ isi form Truck Scale ─▶ klik Save
      │
      ▼
Data masuk .mdb ─▶ Agent deteksi ─▶ buffer ─▶ kirim ke cloud
      │
      ▼
Backend simpan ─▶ broadcast ─▶ Dashboard owner/manager update otomatis (≤10 dtk)
```

### 4.2 Flow: Klien Cek Laporan

```
Klien buka URL ─▶ login ─▶ dashboard miliknya
      │
      ▼
Lihat transaksi hari ini (hanya miliknya) ─▶ pilih rentang tanggal ─▶ export PDF/Excel
```

### 4.3 Flow: Agent Bermasalah

```
Agent berhenti heartbeat > 5 mnt
      │
      ▼
Backend deteksi ─▶ kirim WA/email ke Owner ("Site X offline sejak jam ...")
      │
      ▼
Owner hubungi admin/teknisi ─▶ agent hidup lagi ─▶ buffer auto-sync ─▶ status hijau
```

---

## 5. Aturan Bisnis Penting (Business Rules)

- **BR-4:** **Netto = |W1 − W2|** (W1 = timbang pertama, W2 = timbang kedua; sudah tersimpan di kolom `NETTO` pada `tbtransact00`). Gross = nilai terbesar, Tare = terkecil.
- **BR-5:** Data historis **immutable** di cloud kecuali sumbernya (Truck Scale) mengubahnya → update terkontrol via sync.
- **BR-6:** Klien tidak pernah bisa melihat data klien lain (enforce di level query, bukan hanya UI).
- **BR-7:** Waktu di sumber: `DATEIN/DATEOUT` = tanggal, `TIMEIN/TIMEOUT` = jam (format OLE `1899-12-30`, ambil komponen jam). Simpan di cloud dgn zona waktu jelas (WIB).
- **BR-8:** Entri non-penjualan — customer `08 KELUAR/TDK JADI AMBIL`, `07 TITIP TIMBANG` — ditandai kategori khusus & dikecualikan dari total penjualan bila perlu.
- **BR-9:** Kode master (`CUSTID`/`SUPPID`/`PRODID`) kadang punya spasi di belakang (mis. `'07 '`) → **wajib di-trim** sebelum join, agar tidak dianggap partner berbeda.

---

## 6. Kebutuhan Non-Fungsional

| Aspek | Target |
|-------|--------|
| Performa | Dashboard load < 2 dtk; live update ≤ 10 dtk |
| Ketersediaan | ≥ 99% uptime cloud |
| Keandalan data | 0% kehilangan (buffer + rekonsiliasi) |
| Keamanan | HTTPS, RBAC, audit, rate limiting |
| Kompatibilitas | Chrome/Firefox/Edge; responsive HP & desktop |
| Bahasa | Indonesia |
| Skalabilitas | Multi-site tanpa perubahan arsitektur |

---

## 7. Referensi Silang

- Skema data & field → `04-Database-Architecture.md`
- Tampilan panel → `05-Admin-Panel-Specification.md`
- Endpoint pendukung → `06-REST-API-Specification.md`
