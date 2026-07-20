# 07 — Engineering Guidelines

**Produk:** TimbangLive
**Plan:** 0.2
**Tanggal:** 2026-07-20

Pedoman teknis agar sistem konsisten, aman, dan **andal** (prioritas #1 proyek ini).

> Plan 0.2 — pedoman khusus skema nyata:
> - Selalu **trim** kode master (`CUSTID`/`SUPPID`/`PRODID`) sebelum join.
> - Konversi waktu OLE (`1899-12-30 HH:MM:SS`) → ambil komponen jam saja untuk `TIMEIN/TIMEOUT`.
> - Tipe transaksi diturunkan dari `CUSTID` vs `SUPPID` (tidak ada kolom tipe).
> - Baca **dua** tabel: `tbtransact00` (selesai) + `TbTransact` (berjalan). `NETTO = |W1−W2|`.

---

## 1. Struktur Repositori

Monorepo dengan tiga bagian:

```
timbanglive/
├── backend/          # Laravel 11 (API + dashboard + admin)
├── sync-agent/       # Python (desktop service) + installer
├── docs/             # 8 file dokumentasi ini
└── deploy/           # nginx, docker-compose, scripts
```

---

## 2. Standar Backend (Laravel)

- **PHP 8.3**, Laravel 11, `declare(strict_types=1)` di kelas domain.
- Ikuti **PSR-12**; format otomatis dengan **Laravel Pint**.
- Analisis statis: **PHPStan/Larastan** level ≥ 6.
- Struktur: Controller tipis → **Form Request** (validasi) → **Service/Action** (logika) → **Model** (data). Hindari logika berat di controller.
- **Idempotensi ingest** ditangani di satu Action (`IngestWeighingsAction`) dengan `upsert` berbasis kunci unik.
- Query dashboard **selalu** difilter scope role via **Global Scope** / policy — jangan andalkan filter di frontend.
- Gunakan **API Resources** untuk bentuk output konsisten.
- **Migration** untuk semua perubahan skema; jangan ubah DB manual.
- Waktu: simpan UTC di DB, tampilkan `Asia/Jakarta`. Set `app.timezone` konsisten.

Contoh alur ingest (pseudocode):
```php
// IngestWeighingsAction
foreach ($items as $item) {
    Weighing::upsert(
        [$mapped],
        uniqueBy: ['site_id','type','ticket_no'],
        update: ['gross_kg','tare_kg','netto_kg','status','source_hash', ...]
    );
}
```

---

## 3. Standar Sync Agent (Python)

- **Python 3.11**, format **Black**, lint **Ruff**, type hints + **mypy**.
- Struktur modul: `reader` (baca .mdb) · `buffer` (SQLite) · `sender` (HTTP) · `service` (loop) · `health` (heartbeat) · `reconcile`.
- **Read-only** ke sumber: buka koneksi ODBC mode baca; jangan pernah `INSERT/UPDATE/DELETE` ke `.mdb`.
- Semua kegagalan **tidak boleh** menghentikan loop utama — tangkap exception, log, lanjut.
- Konfigurasi lewat file `config.ini` + secrets terenkripsi (token).
- Semua operasi jaringan pakai **timeout** + **retry backoff**.

Detail implementasi di `08-Sync-Agent-Blueprint.md`.

---

## 4. Standar Frontend

- **Livewire + Alpine + Tailwind**; komponen kecil & reusable.
- State realtime lewat channel Reverb; tangani **reconnect** dengan anggun.
- Mobile-first; uji di layar HP.
- Tidak menaruh logika otorisasi di frontend (hanya tampilan).
- Aset di-build dengan **Vite**.

---

## 5. Konvensi Penamaan

| Item | Konvensi | Contoh |
|------|----------|--------|
| Tabel DB | snake_case jamak | `weighings`, `client_partner_map` |
| Kolom DB | snake_case | `netto_kg`, `weighed_in_at` |
| Kelas PHP | PascalCase | `IngestWeighingsAction` |
| Route API | kebab/plural | `/weighings`, `/agents` |
| Variabel Python | snake_case | `buffer_pending` |
| Env var | UPPER_SNAKE | `AGENT_TOKEN`, `API_BASE_URL` |
| Branch git | tipe/desk | `feat/live-feed`, `fix/sync-retry` |

---

## 6. Git & Workflow

- **Trunk-based** ringan: branch pendek dari `main`, PR wajib review.
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Setiap PR: lulus CI (lint + test) sebelum merge.
- Tag rilis mengikuti **Plan** proyek: `v0.1`, `v0.2`, `v1.0`, dst.
- Jangan commit secret (`.env`, token) — pakai `.env.example`.

---

## 7. Testing (wajib untuk keandalan)

| Area | Jenis test | Fokus |
|------|-----------|-------|
| Ingest API | Feature test | idempotensi, duplikat, update, validasi |
| RBAC | Feature test | klien tak bisa akses data lain |
| Sync Agent | Unit + integration | deteksi perubahan, buffer, retry, offline→online |
| Rekonsiliasi | Integration | selisih terdeteksi & ditambal |
| Reporting | Unit | akurasi total netto |

- Target coverage jalur kritis (ingest, RBAC, buffer) mendekati 100%.
- Sertakan **skenario offline**: internet mati → data ter-buffer → nyambung → semua tersinkron tanpa duplikat.

---

## 8. Logging & Observability

- Backend: log terstruktur (JSON) + korelasi `batch_id`.
- Agent: log rotasi harian di PC admin + kirim ringkasan ke cloud.
- Metrik kunci: latensi ingest, jumlah pending, umur data terlama, uptime agent.
- Endpoint `/health` untuk uptime monitor eksternal.

---

## 9. Keamanan

- HTTPS/TLS di semua titik; HSTS aktif.
- Password: hashing argon2id/bcrypt.
- Token agent: acak panjang, disimpan **hashed** di DB, dapat dicabut.
- Rate limiting & throttling.
- Validasi & sanitasi semua input.
- Prinsip **least privilege** untuk kredensial DB & server.
- Backup terenkripsi.

---

## 10. Deployment & Operasi

- **Backend**: Docker (php-fpm + nginx) di VPS; `docker-compose` untuk MySQL + Redis + Reverb.
- **TLS**: Let's Encrypt (auto-renew).
- **Queue**: Horizon (supervisor) selalu jalan.
- **Scheduler**: `php artisan schedule:work` via cron/supervisor (laporan harian, cek heartbeat).
- **Backup DB**: harian, retensi 30 hari, uji restore berkala.
- **Migrasi**: `php artisan migrate --force` di pipeline deploy.
- **Rollback**: image versi sebelumnya + migrasi reversible.
- **Agent update**: installer baru + mekanisme auto-update opsional (lihat file 08).

Environment: `local` → `staging` → `production`. Uji sync end-to-end di staging sebelum produksi.

---

## 11. Definition of Done (DoD)

Sebuah fitur "selesai" bila:
1. Kode lulus lint + static analysis.
2. Ada test untuk jalur kritis & semua hijau.
3. Sudah di-review & di-merge.
4. Terdokumentasi (update file docs bila perlu).
5. Teruji di staging, termasuk skenario gagal (offline/crash).
6. Tidak menambah langkah kerja admin & tidak menulis ke sumber.

---

## 12. Referensi Silang

- Arsitektur → `02-Software-Architecture.md`
- API → `06-REST-API-Specification.md`
- Sync Agent → `08-Sync-Agent-Blueprint.md`
