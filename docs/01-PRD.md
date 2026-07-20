# 01 — Product Requirements Document (PRD)

**Produk:** TimbangLive — Realtime Weighbridge Dashboard
**Plan:** 0.2
**Tanggal:** 2026-07-20
**Status:** Skema database nyata sudah diverifikasi dari `database.mdb`. Asumsi teknis utama terkonfirmasi.

> Catatan versi: Plan 0.1 = dokumentasi & asumsi awal. **Plan 0.2 (ini) = revisi setelah membongkar database `.mdb` asli** — struktur tabel, tipe transaksi, dan perhitungan netto sudah pasti (lihat `04-Database-Architecture.md` §0).

---

## 1. Ringkasan Eksekutif

TimbangLive adalah sistem yang mengambil data hasil penimbangan truk dari software **Truck Scale v1.1.3** (aplikasi Windows offline di PC admin site) dan menampilkannya secara **realtime** di **dashboard berbasis web** yang dapat diakses dari mana saja oleh owner, manager lapangan, admin, dan klien.

Masalah inti yang dipecahkan: data timbangan saat ini **terkurung** di satu PC admin, hanya bisa diekspor sebagai rekap keseluruhan (biasanya bulanan), sehingga owner tidak bisa memantau operasional secara langsung dan klien tidak bisa menerima laporan harian otomatis.

---

## 2. Latar Belakang & Masalah

### 2.1 Kondisi saat ini (as-is)

- Timbangan digital (jembatan timbang) terhubung ke **satu PC admin** di site penimbangan.
- Software **Truck Scale v1.1.3** (Visual Basic + database lokal, kemungkinan MS Access `.mdb`) mencatat setiap transaksi: dua alur — **Weighing Customer** (barang keluar/penjualan) dan **Weighing Supplier** (barang masuk/pembelian).
- Setiap transaksi berisi: Ticket No, Customer/Supplier, Product, Date/Time In & Out, No. Truck, Gross, Tare, Netto, Driver, Operator, dll.
- Data hanya bisa dilihat dari PC admin tersebut.
- Ekspor data hanya tersedia sebagai **rekap keseluruhan** (tidak bisa diambil per-transaksi), umumnya ditarik bulanan.

### 2.2 Titik sakit (pain points)

| # | Masalah | Dampak |
|---|---------|--------|
| P1 | Data terkurung di 1 PC | Owner tidak bisa memantau dari luar site |
| P2 | Tidak ada akses realtime | Keputusan operasional lambat |
| P3 | Ekspor hanya rekap keseluruhan | Sulit dapat data harian per transaksi |
| P4 | Laporan klien manual | Boros waktu admin, rawan telat/salah |
| P5 | Tidak ada visibilitas multi-pihak | Manager & klien buta terhadap status live |

### 2.3 Kondisi yang diinginkan (to-be)

Begitu admin menyimpan tiket di Truck Scale v1.1.3, dalam hitungan detik data itu muncul di dashboard web dan dapat dilihat owner, manager, admin, serta klien (sesuai hak akses) dari perangkat apa pun.

---

## 3. Tujuan & Metrik Sukses

### 3.1 Tujuan Produk

1. Menyediakan visibilitas **realtime** atas seluruh penimbangan tanpa mengubah SOP admin.
2. **Zero tambahan pekerjaan** untuk admin — semua sinkronisasi berjalan otomatis di background.
3. **Zero kehilangan data** walau internet putus (buffer & auto-recovery).
4. Laporan harian otomatis untuk klien.

### 3.2 Metrik Sukses (KPI)

| Metrik | Target |
|--------|--------|
| Latensi data (admin Save → tampil di dashboard) | ≤ 10 detik |
| Ketersediaan dashboard (uptime) | ≥ 99% |
| Kehilangan data transaksi | 0% (harus zero) |
| Tambahan langkah kerja admin | 0 langkah |
| Waktu deteksi masalah (agent down → owner tahu) | ≤ 5 menit |
| Akurasi rekap harian vs data di PC admin | 100% cocok |

### 3.3 Prinsip Utama (Non-Negotiable)

- **Tidak menyentuh / tidak mengubah** software Truck Scale v1.1.3 dan database-nya (akses **read-only**).
- **Tidak menambah beban admin.**
- **Keandalan di atas fitur** — lebih baik sederhana tapi tidak pernah error, daripada canggih tapi rapuh.

---

## 4. Target Pengguna & Persona

| Persona | Peran | Kebutuhan utama | Akses |
|---------|------|-----------------|-------|
| **Owner** | Pemilik usaha | Pantau total tonase, tren, semua site | Penuh (semua data, semua site) |
| **Manager Lapangan** | Pengawas operasional (2–5 org) | Monitor live per site, verifikasi | Data operasional site-nya |
| **Admin** | Operator timbang | Tetap kerja di Truck Scale seperti biasa; lihat status sync | Terbatas (status & data site-nya) |
| **Klien** | Customer/Supplier | Lihat & terima laporan penimbangan miliknya | Hanya data transaksi terkait dirinya |

---

## 5. Ruang Lingkup (Scope)

### 5.1 In-Scope (Plan 0.1 → MVP)

- Sync Agent desktop (baca database Truck Scale, kirim ke cloud) — read-only, otomatis, ter-buffer.
- Backend cloud (API + database + auth).
- Dashboard web realtime: daftar transaksi live, total tonase, filter tanggal.
- Multi-role login (owner, manager, admin, klien).
- Portal klien: klien hanya lihat data miliknya.
- Laporan harian otomatis (export & kirim).
- Monitoring & alert (heartbeat agent, notifikasi ke owner bila bermasalah).

### 5.2 Out-of-Scope (untuk versi berikutnya)

- Integrasi dua arah (menulis balik ke Truck Scale) — tidak akan dilakukan.
- Aplikasi mobile native (cukup web responsive dulu).
- Modul billing/invoicing otomatis.
- Integrasi akuntansi (mis. Accurate/Jurnal).
- Multi-bahasa selain Indonesia.
- AI/analitik prediktif.

### 5.3 Status Asumsi (setelah verifikasi Plan 0.2)

- A1: ✅ **Terbukti** — MS Access `.mdb` di `C:\Program Files\Truck Scale v1.13\database.mdb`, terbaca via ODBC/ACE (read-only).
- A2: ✅ **Terbukti** — tiket selesai tersimpan permanen di tabel `tbtransact00` (dgn `NETTO`); tiket berjalan di `TbTransact`.
- A3: ✅ **Terbukti** — ada `TRANSID` (nomor tiket) + `DATEIN/TIMEIN/DATEOUT/TIMEOUT`. Deteksi perubahan: watermark `TRANSID` + hash baris.
- A4: ⏳ Perlu tindakan — pasang internet & agent di PC admin (belum dilakukan).
- A5: ⚠️ **Sebagian** — customer/supplier punya master (`TbCustomer`/`TbSupplier`) dgn nama jelas, TAPI banyak transaksi memakai `01 UMUM` (generik) yang tak bisa dipetakan ke klien spesifik. Portal klien hanya untuk partner non-generik.
- A6 (baru): ⚠️ File `.mdb` yang dikirim berisi data s/d **3 Feb 2026** — kemungkinan copy lama. Sync Agent nanti membaca file live di PC admin.

### 5.4 Ketergantungan (Dependencies)

- Akses fisik/remote ke PC admin untuk install agent.
- Koneksi internet di site penimbangan.
- VPS/cloud hosting.
- Gateway WhatsApp (untuk alert & laporan) — opsional tapi direkomendasikan.

---

## 6. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Database bukan `.mdb`/terkunci | Agent tak bisa baca | Verifikasi awal (Plan 0.2); siapkan konektor alternatif (Firebird/SQLite/file watcher) |
| Internet site tidak stabil | Data telat sync | Buffer lokal + auto-retry + recovery harian |
| Agent crash | Data berhenti sync | Windows Service auto-restart + heartbeat alert |
| Admin mematikan agent tak sengaja | Sync berhenti | Jalan sebagai service tersembunyi + alert ke owner |
| Data klien tercampur (field generik) | Portal klien tidak akurat | Pembersihan & mapping master data sebelum go-live |
| PC admin mati/rusak | Data lokal tetap ada, sync terhenti | Data historis tetap aman di cloud; agent lanjut saat PC hidup |

---

## 7. Rencana Rilis Bertahap

| Fase | Isi | Output |
|------|-----|--------|
| **Plan 0.1** | Dokumentasi (8 file), arsitektur, asumsi | Blueprint lengkap (dokumen ini) |
| **Plan 0.2** | Verifikasi database nyata, revisi skema | Skema final + PoC baca DB |
| **Plan 1.0 (MVP)** | Sync agent + cloud + dashboard dasar | Data live end-to-end |
| **Plan 1.1** | Portal klien + laporan harian otomatis | Klien mandiri |
| **Plan 1.2** | Monitoring lanjutan, multi-site, hardening | Siap skala |

---

## 8. Referensi Silang

- Arsitektur teknis → `02-Software-Architecture.md`
- Detail fitur & flow → `03-Functional-Specification.md`
- Skema data → `04-Database-Architecture.md`
- Panel admin/dashboard → `05-Admin-Panel-Specification.md`
- API → `06-REST-API-Specification.md`
- Standar teknis → `07-Engineering-Guidelines.md`
- Komponen paling kritis (Sync Agent) → `08-Sync-Agent-Blueprint.md`
