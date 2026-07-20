# 02 — Software Architecture

**Produk:** TimbangLive
**Plan:** 0.2
**Tanggal:** 2026-07-20

> Plan 0.2: sumber data sudah pasti — MS Access `.mdb` dengan tabel `tbtransact00` (selesai) & `TbTransact` (berjalan). Lihat `04-Database-Architecture.md` §0.

---

## 1. Prinsip Arsitektur

1. **Read-only di sumber.** Sistem tidak pernah menulis/mengubah database Truck Scale v1.1.3. Hanya membaca.
2. **Loosely coupled.** Sync Agent, backend, dan frontend berkomunikasi lewat API yang jelas — bisa dikembangkan/diganti terpisah.
3. **Fail-safe by design.** Setiap komponen mengasumsikan komponen lain bisa gagal: buffer, retry, idempotensi.
4. **Idempotent sync.** Kirim ulang data yang sama tidak menghasilkan duplikat (kunci: `ticket_no` + `site_id` + `type`).
5. **Observability.** Setiap komponen melapor kesehatannya; masalah terdeteksi otomatis.

---

## 2. Diagram Arsitektur (High-Level)

```
┌──────────────────────── SITE PENIMBANGAN (Offline) ────────────────────────┐
│                                                                             │
│   ┌─────────────┐      ┌───────────────────────┐     ┌───────────────────┐  │
│   │  Timbangan  │─────▶│  Truck Scale v1.1.3    │────▶│  Database Lokal   │  │
│   │  (loadcell) │ RS232│  (Visual Basic app)    │write│  (.mdb / MS Access)│  │
│   └─────────────┘      └───────────────────────┘     └─────────┬─────────┘  │
│                                                                 │ READ-ONLY  │
│                                                       ┌─────────▼─────────┐  │
│                                                       │   SYNC AGENT      │  │
│                                                       │ (Windows Service) │  │
│                                                       │  - poll DB        │  │
│                                                       │  - buffer (SQLite)│  │
│                                                       │  - retry & queue  │  │
│                                                       │  - heartbeat      │  │
│                                                       └─────────┬─────────┘  │
└─────────────────────────────────────────────────────────────── │ ──────────┘
                                          HTTPS (TLS) │  internet
                                                       ▼
┌──────────────────────────── CLOUD (VPS) ───────────────────────────────────┐
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                    BACKEND — Laravel 11 (PHP 8.3)                   │    │
│   │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐ │    │
│   │  │ Ingest API    │  │ Auth (Sanctum)│  │ Queue Workers (Horizon) │ │    │
│   │  │ /api/ingest   │  │ RBAC          │  │ - report gen            │ │    │
│   │  └──────┬────────┘  └───────────────┘  │ - notifikasi WA/email   │ │    │
│   │         │           ┌───────────────┐  └─────────────────────────┘ │    │
│   │         ▼           │ Realtime      │                              │    │
│   │  ┌─────────────┐    │ (Reverb/WS)   │                              │    │
│   │  │  MySQL 8    │◀───┴───────────────┘                              │    │
│   │  │  (cloud DB) │                                                    │    │
│   │  └─────────────┘                                                    │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                     │ WebSocket / HTTPS                      │
└─────────────────────────────────── │ ──────────────────────────────────────┘
                                      ▼
        ┌───────────────────────────────────────────────────────┐
        │            FRONTEND — Dashboard Web (responsive)        │
        │   Owner  │  Manager  │  Admin  │  Klien  (RBAC views)   │
        │   HP · Tablet · Laptop — akses dari mana saja           │
        └───────────────────────────────────────────────────────┘
```

---

## 3. Komponen & Tanggung Jawab

### 3.1 Sync Agent (di PC admin) — komponen paling kritis

- Membaca database Truck Scale secara **read-only** dengan interval singkat (default 5 detik).
- Mendeteksi baris baru/berubah (berdasarkan `ticket_no` dan/atau timestamp).
- Menyimpan ke **buffer lokal (SQLite)** sebelum kirim → jaminan tidak hilang saat offline.
- Mengirim ke Ingest API cloud dengan **retry** dan **exponential backoff**.
- Mengirim **heartbeat** tiap 60 detik.
- Menjalankan **rekonsiliasi harian** (bandingkan jumlah/rentang tiket lokal vs cloud).
- Berjalan sebagai **Windows Service** (auto-start, auto-restart).

> Detail lengkap ada di `08-Sync-Agent-Blueprint.md`.

### 3.2 Backend Cloud — Laravel 11

- **Ingest API**: menerima batch tiket dari agent, validasi, upsert idempoten.
- **Auth & RBAC**: Laravel Sanctum (token untuk agent & SPA), role owner/manager/admin/klien.
- **Realtime**: Laravel Reverb (WebSocket) untuk push event `weighing.created` ke dashboard; fallback polling.
- **Queue (Horizon/Redis)**: generate laporan, kirim notifikasi WA/email, tugas berat async.
- **Scheduler**: laporan harian terjadwal, cek heartbeat, deteksi agent hilang.
- **Reporting**: agregasi tonase, export Excel/PDF.

### 3.3 Database Cloud — MySQL 8

- Menyimpan seluruh transaksi timbang, master data, user, log sync, audit.
- Detail skema di `04-Database-Architecture.md`.

### 3.4 Frontend — Dashboard Web

- Web responsive (bisa dibuka di HP tanpa app native).
- Dibangun dengan **Laravel + Livewire + Alpine.js + Tailwind** (satu stack, mudah cari developer di Indonesia), atau **Filament** untuk panel internal.
- View berbeda per role (lihat `05-Admin-Panel-Specification.md`).

---

## 4. Pilihan Teknologi (Tech Stack) & Alasan

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Sync Agent | **Python 3.11** + `pyodbc` + SQLite, dibungkus jadi **Windows Service** (via `pywin32`/NSSM) & installer `.exe` (Inno Setup) | Terbaik untuk baca `.mdb`; ringan; mudah di-debug; installer profesional |
| Backend | **Laravel 11 (PHP 8.3)** | Ekosistem matang, banyak developer lokal, cepat dibangun, aman |
| DB Cloud | **MySQL 8** | Standar, murah, didukung penuh Laravel (bisa PostgreSQL bila perlu) |
| Realtime | **Laravel Reverb** (WebSocket) | Native Laravel, tanpa layanan pihak ketiga; fallback polling |
| Queue/Cache | **Redis** + Horizon | Async jobs & monitoring queue |
| Frontend | **Livewire + Alpine + Tailwind** (+ **Filament** utk admin) | Satu bahasa (PHP), realtime-friendly, cepat |
| Auth | **Laravel Sanctum** | Token API untuk agent + SPA auth |
| Notifikasi | Gateway WA (Fonnte/Wablas) + SMTP email | Umum & murah di Indonesia |
| Hosting | VPS (DigitalOcean / Biznet / IDCloudHost) | Kontrol penuh, biaya terkendali |
| Reverse proxy | Nginx + Let's Encrypt (TLS) | Standar, HTTPS gratis |

> Catatan: Alternatif "serba cepat tanpa server" adalah Supabase (Postgres + realtime + auth). Untuk Plan 0.1 kita pilih **Laravel** karena kemudahan mencari developer lokal & kontrol penuh. Keputusan final bisa ditinjau di Plan 0.2.

---

## 5. Alur Data End-to-End (Data Flow)

1. Admin klik **Save** di Truck Scale v1.1.3 → tiket masuk `.mdb`. Tiket berjalan → `TbTransact`; setelah timbang kedua (selesai) → `tbtransact00` dengan `NETTO`.
2. Sync Agent (poll tiap 5 dtk) mendeteksi tiket baru/berubah di `tbtransact00` (dan `TbTransact` untuk status "sedang menimbang") → tulis ke buffer SQLite (status `pending`). Tipe transaksi diturunkan: `CUSTID` terisi → customer, `SUPPID` terisi → supplier.
3. Agent kirim batch `pending` ke `POST /api/ingest` (HTTPS + token).
4. Backend validasi → **upsert idempoten** (kunci unik `site_id + type + ticket_no`) → simpan ke MySQL.
5. Backend broadcast event `weighing.created` via Reverb.
6. Dashboard yang terbuka menerima event → baris baru muncul otomatis (≤ 10 dtk).
7. Backend menandai job async: bila memenuhi aturan → kirim notifikasi / update agregasi.
8. Agent terima respons `200 + daftar id tersimpan` → tandai buffer `synced`.
9. Tiap malam: agent & backend rekonsiliasi → tiket yang somehow terlewat di-sync ulang.

---

## 6. Keandalan & Ketahanan (Reliability)

| Mekanisme | Fungsi |
|-----------|--------|
| Buffer lokal SQLite | Data aman walau internet/cloud down |
| Idempotent upsert | Kirim ulang tidak menduplikasi |
| Retry + exponential backoff | Otomatis coba lagi saat gagal |
| Windows Service auto-restart | Agent hidup lagi bila crash |
| Heartbeat + alert | Owner tahu ≤ 5 menit bila agent mati |
| Rekonsiliasi harian | Menambal tiket yang terlewat |
| Health endpoint backend | Monitoring uptime cloud |
| Backup DB harian | Pemulihan bencana |

---

## 7. Keamanan (ringkas)

- Semua trafik lewat **HTTPS/TLS**.
- Agent autentikasi pakai **token per-site** (bisa dicabut).
- **RBAC** ketat: klien hanya melihat data miliknya (row-level filter di query).
- Password ter-hash (bcrypt/argon2), rate limiting di API.
- Audit log untuk aksi sensitif.
- Detail lebih lanjut di `07-Engineering-Guidelines.md`.

---

## 8. Skalabilitas & Multi-Site

- Setiap site punya `site_id` + token agent sendiri.
- Menambah site = install agent baru + daftarkan site. Backend & dashboard sudah multi-site sejak awal.
- Query difilter per `site_id`; manager/klien dibatasi ke site/relasinya.

---

## 9. Referensi Silang

- Fitur & flow → `03-Functional-Specification.md`
- Skema DB → `04-Database-Architecture.md`
- API → `06-REST-API-Specification.md`
- Sync Agent → `08-Sync-Agent-Blueprint.md`
