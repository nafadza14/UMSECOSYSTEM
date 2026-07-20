# TimbangLive — Dokumentasi Proyek

**Plan:** 0.2 · **Tanggal:** 2026-07-20

Sistem membaca data penimbangan dari **Truck Scale v1.1.3** (PC admin, offline) dan menampilkannya **realtime** di **dashboard web** untuk owner, manager, admin, dan klien.

## Daftar Dokumen

| # | File | Isi |
|---|------|-----|
| 1 | `01-PRD.md` | Product Requirements — masalah, tujuan, scope, KPI, risiko |
| 2 | `02-Software-Architecture.md` | Arsitektur end-to-end & tech stack |
| 3 | `03-Functional-Specification.md` | Fitur, role, user flow, aturan bisnis |
| 4 | `04-Database-Architecture.md` | Skema cloud + mapping dari sumber `.mdb` |
| 5 | `05-Admin-Panel-Specification.md` | Dashboard & panel per role + portal klien |
| 6 | `06-REST-API-Specification.md` | Endpoint API & realtime |
| 7 | `07-Engineering-Guidelines.md` | Standar kode, git, testing, deploy |
| 8 | `08-Sync-Agent-Blueprint.md` | Komponen paling kritis: sync agent desktop |

## Status Versi

- **Plan 0.1:** dokumentasi & asumsi teknis awal (berbasis screenshot).
- **Plan 0.2 (sekarang):** ✅ database `.mdb` asli sudah diterima & dibongkar. Skema nyata terverifikasi. Dokumen 01–08 disesuaikan.

### Yang terverifikasi di Plan 0.2

- Database = MS Access `.mdb` di `C:\Program Files\Truck Scale v1.13\database.mdb`.
- Tabel transaksi: **`tbtransact00`** (selesai, ada `NETTO`) + **`TbTransact`** (berjalan).
- Master: `TbCustomer`, `TbSupplier`, `TbProduct` (01–10), `TbTruck`, `TbOperator`, `TbInfo`.
- Tipe (customer/supplier) diturunkan dari `CUSTID` vs `SUPPID`; `NETTO = |W1−W2|`; kode master perlu di-trim.
- Detail lengkap: lihat `04-Database-Architecture.md` §0.

## Langkah Berikutnya (menuju MVP / Plan 1.0)

1. Isi dashboard dengan data nyata hasil ekstrak `.mdb`.
2. Buat tabel di Supabase + seed data.
3. Bangun PoC Sync Agent (baca `.mdb` read-only → push ke cloud).
