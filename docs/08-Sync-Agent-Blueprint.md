# 08 — Sync Agent Blueprint

**Produk:** TimbangLive
**Plan:** 0.2
**Tanggal:** 2026-07-20
**Komponen:** TimbangLive Sync Agent (desktop, PC admin)

> Plan 0.2: bagian pembacaan sumber (§4–§5) sudah disesuaikan dengan struktur `database.mdb` **nyata** — tabel `tbtransact00` (selesai) & `TbTransact` (berjalan), kolom `W1/W2/NETTO/TRANSID/CUSTID/SUPPID/PRODID`, tipe diturunkan, kode di-trim.

> Ini komponen **paling kritis & paling berisiko** dari proyek. Filosofinya satu: **jangan pernah kehilangan data, jangan pernah menambah kerja admin, jangan pernah menyentuh sumber.** File ini menggantikan "Laravel Project Blueprint" karena kebutuhan proyek Anda menuntut spec khusus untuk agent (Laravel didokumentasikan di file 02, 06, 07).

---

## 1. Tujuan & Tanggung Jawab

Sync Agent adalah program kecil yang berjalan diam di PC admin. Tugasnya:

1. **Membaca** database Truck Scale v1.1.3 secara **read-only**.
2. **Mendeteksi** tiket baru & tiket yang berubah.
3. **Menyimpan** ke buffer lokal (anti hilang).
4. **Mengirim** ke cloud dengan retry.
5. **Melapor** kesehatan (heartbeat) & **merekonsiliasi** data harian.
6. **Pulih sendiri** dari error tanpa campur tangan admin.

Yang **tidak** dilakukan agent: menulis ke sumber, menampilkan UI yang mengganggu admin, meminta admin melakukan aksi apa pun.

---

## 2. Prinsip Desain (Reliability-First)

| Prinsip | Implementasi |
|---------|--------------|
| Read-only mutlak | Koneksi ODBC dibuka read-only; tidak ada query tulis |
| Zero data loss | Buffer SQLite persisten sebelum kirim |
| Idempoten | Kunci `type+ticket_no`; `source_hash` untuk update |
| Self-healing | Windows Service auto-restart; loop tak pernah mati karena 1 error |
| Offline-tolerant | Data antre; auto-kirim saat online |
| Observable | Heartbeat + log + rekonsiliasi harian |
| Silent | Tanpa popup; hanya icon tray status |

---

## 3. Arsitektur Internal

```
┌──────────────── SYNC AGENT (Windows Service) ────────────────┐
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐  │
│  │ READER   │──▶│ BUFFER   │──▶│ SENDER   │──▶│ (cloud API)│ │
│  │ baca .mdb│   │ SQLite   │   │ HTTP+retry│  └───────────┘  │
│  └──────────┘   └──────────┘   └──────────┘                  │
│       ▲              ▲               │                        │
│       │              │               ▼                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│  │ SCHEDULER│   │RECONCILER│   │ HEALTH    │                  │
│  │ loop 5s  │   │ harian   │   │ heartbeat │                  │
│  └──────────┘   └──────────┘   └──────────┘                  │
│                                                              │
│  Tray icon (hijau/kuning/merah)   ·   Log rotasi harian      │
└──────────────────────────────────────────────────────────────┘
```

Modul:
- **Reader** — koneksi ODBC ke `.mdb`, query read-only, hitung `source_hash` per baris.
- **Buffer** — SQLite lokal; tabel `outbox` (status: pending/synced/failed).
- **Sender** — kirim batch ke `/ingest`, tangani respons per-item, retry backoff.
- **Scheduler** — loop utama (default 5 dtk) + rolling re-scan.
- **Health** — kirim `/heartbeat` tiap 60 dtk.
- **Reconciler** — sekali sehari, bandingkan sumber vs cloud via `/reconcile`.

---

## 4. Cara Baca Sumber (`.mdb`) — TERVERIFIKASI (Plan 0.2)

- **File:** `C:\Program Files\Truck Scale v1.13\database.mdb` (MS Access, ±4 MB).
- **Koneksi via ODBC**: `pyodbc` + *Microsoft Access Driver (\*.mdb)* (ACE), read-only:
  ```
  DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=C:\Program Files\Truck Scale v1.13\database.mdb;ReadOnly=1;
  ```
- Bila `.mdb` sedang dibuka Truck Scale, ODBC tetap bisa baca (Access shared read).
- **Tabel yang dibaca:**
  - `tbtransact00` → transaksi **selesai** (punya `NETTO`, `DATEOUT`, `TIMEOUT`). **Sumber utama dashboard.**
  - `TbTransact` → transaksi **berjalan** (belum `W2`/`DATEOUT`) → indikator "sedang menimbang".
  - Master untuk join: `TbCustomer(CUSTID,CUSTNAME)`, `TbSupplier(SUPPID,SUPPNAME)`, `TbProduct(PRODID,PRODNAME)`, `TbOperator`, `TbTruck(NOTRUCK,TARE)`.

**Query baca (read-only) — contoh:**
```sql
SELECT TRANSID, DATEIN, TIMEIN, DATEOUT, TIMEOUT, W1, W2, NETTO,
       CUSTID, SUPPID, PRODID, NOTRUCK, OPNAME, NOTE, LOCATION, DRIVER, DO
FROM tbtransact00
WHERE TRANSID > ?          -- watermark
ORDER BY TRANSID;
```

**Transformasi per baris (sebelum kirim):**
- `type` = `customer` bila `CUSTID` non-kosong, else `supplier`.
- `partner_*` = join `CUSTID`/`SUPPID` ke master (**TRIM** dulu — kode kadang ada spasi belakang).
- `product_*` = join `PRODID` ke `TbProduct` (TRIM).
- `netto_kg` = `NETTO` (atau `abs(W1−W2)`); `gross_kg`=max(W1,W2); `tare_kg`=min(W1,W2).
- `weighed_in_at` = `DATEIN` + jam dari `TIMEIN` (OLE `1899-12-30`); `weighed_out_at` = `DATEOUT` + `TIMEOUT`.
- `status` = `completed` (dari tbtransact00) / `in_progress` (dari TbTransact).

---

## 5. Strategi Deteksi Data Baru / Berubah

Truck Scale **tidak punya kolom `updated_at`**, jadi pakai kombinasi tiga lapis:

1. **Watermark `TRANSID`** — simpan `TRANSID` terbesar yang sudah terkirim dari `tbtransact00`; ambil yang lebih besar.
2. **Rolling re-scan** — tiap siklus baca ulang **N transaksi terakhir** (default 50) + **semua baris di `TbTransact`** (transaksi berjalan), untuk menangkap tiket yang `W2`/`DATEOUT`-nya diisi belakangan (saat truk keluar) atau yang baru pindah dari `TbTransact` ke `tbtransact00`.
3. **Hash isi baris** (`source_hash`) — hash gabungan seluruh kolom; berubah → kirim sebagai update (idempoten via `type`+`TRANSID`).

> Catatan: karena tiket "selesai" berpindah dari `TbTransact` ke `tbtransact00`, agent memperlakukan kemunculan `TRANSID` di `tbtransact00` sebagai transisi status `in_progress → completed`.

Pseudocode loop:
```python
while running:
    try:
        rows = reader.read_new_and_recent(last_ticket, rescan=50)
        for r in rows:
            h = sha256(canonical(r))
            if buffer.hash_differs(r.type, r.ticket_no, h):
                buffer.upsert_pending(r, h)
        sender.flush()          # kirim semua pending
        health.maybe_heartbeat()
        reconciler.maybe_run_daily()
    except Exception as e:
        log.error(e)            # JANGAN mati — catat & lanjut
    sleep(poll_interval)        # default 5 dtk
```

---

## 6. Buffer Lokal (Anti Hilang)

Tabel `outbox` (SQLite):

| Kolom | Ket |
|-------|-----|
| id | PK lokal |
| type | customer/supplier |
| ticket_no | |
| payload_json | isi tiket siap kirim |
| source_hash | |
| status | pending / synced / failed |
| attempts | jumlah percobaan |
| last_error | |
| created_at / updated_at | |

- Tiket masuk sebagai `pending`.
- Setelah cloud konfirmasi (`inserted/updated/duplicate`) → `synced`.
- Gagal → tetap `pending`, `attempts++`, dicoba lagi nanti.
- Retensi: simpan `synced` 30 hari (untuk audit) lalu purge.
- **Bahkan bila PC restart**, buffer tetap ada → lanjut kirim.

---

## 7. Pengiriman & Retry

- Batch hingga N item (default 100) per request ke `/ingest`.
- **Exponential backoff**: 2s, 4s, 8s, … maks 5 menit; lalu terus coba tiap 5 menit.
- Timeout request 15 dtk.
- Respons `207` diproses per-item (sebagian sukses tetap ditandai).
- Semua request bawa `batch_id` untuk korelasi & idempotensi.

Skenario internet mati seharian:
```
Internet mati → tiket menumpuk sebagai pending di buffer
Internet nyambung → sender flush semua pending secara batch
Cloud upsert idempoten → tidak ada duplikat → status jadi synced
```

---

## 8. Heartbeat & Alert

- Tiap 60 dtk kirim `/heartbeat`: `{ site, version, buffer_pending, last_source_ticket }`.
- Backend menandai agent `online`. Bila tidak ada heartbeat > 5 menit → backend kirim **alert WA/email ke owner**.
- Alert tambahan: `buffer_pending` melebihi ambang (mis. > 200) → indikasi masalah kirim.

Penting: **admin tidak pernah diberi tahu error**; yang menerima alert adalah **owner/teknisi**.

---

## 9. Rekonsiliasi Harian (Safety Net)

Tiap malam (mis. 23:30):
1. Agent hitung jumlah & rentang tiket hari itu dari sumber.
2. Kirim ke `/reconcile`.
3. Cloud balas daftar `ticket_no` yang **belum ada**.
4. Agent baca ulang tiket-tiket itu dari sumber & kirim.
5. Hasil dicatat di `daily_reconciliations`.

Ini menjamin walau ada tiket lolos dari deteksi realtime, tetap tertangkap dalam 24 jam.

---

## 10. Menjalankan sebagai Windows Service

- Dibungkus jadi service via **`pywin32`** atau **NSSM** (Non-Sucking Service Manager).
- Startup type: **Automatic (Delayed Start)** → hidup otomatis saat PC nyala.
- **Recovery**: pada kegagalan, Windows Service Recovery diset **Restart** (1st/2nd/subsequent failures → restart after 10s).
- Jalan dengan akun yang punya izin baca file DB.
- **Tray app** terpisah (opsional) menampilkan status: hijau (sinkron), kuning (ada pending/reconnect), merah (error > ambang).

---

## 11. Installer & Distribusi

- Bundle Python runtime + dependensi dengan **PyInstaller** → satu folder/exe.
- Installer **Inno Setup**: `TimbangLiveSync_Setup.exe`.
  - Wizard: Next → pilih path DB (auto-detect bila bisa) → masukkan token site → Finish.
  - Registrasi service otomatis.
  - Buat shortcut uninstall di "Programs & Features".
- Konfigurasi tersimpan di `config.ini` (path DB, API URL, poll interval) + token disimpan terenkripsi (DPAPI Windows).

Contoh `config.ini`:
```ini
[source]
driver = access
db_path = C:\Program Files\Truck Scale v1.13\database.mdb
table_done = tbtransact00
table_active = TbTransact
rescan_count = 50

[cloud]
api_base = https://api.timbanglive.example/v1
site_code = SITE01
poll_interval = 5

[logging]
level = INFO
retention_days = 30
```

---

## 12. Keamanan Agent

- Token per-site disimpan terenkripsi (Windows DPAPI), dikirim sebagai Bearer.
- Hanya komunikasi keluar (outbound HTTPS) — tidak membuka port masuk.
- Read-only ke sumber; tidak memodifikasi sistem admin.
- Log tidak menyimpan kredensial.

---

## 13. Rencana Implementasi (Plan → 1.0)

| Tahap | Aktivitas | Output |
|-------|-----------|--------|
| 0.2-a | Verifikasi & baca `.mdb` asli (PoC read-only) | Konfirmasi driver, tabel, kolom kunci |
| 0.2-b | Prototipe reader + hash + mapping | Skrip baca → JSON sesuai skema |
| 1.0-a | Buffer SQLite + sender + retry | Sync 1 arah stabil |
| 1.0-b | Heartbeat + service + tray | Jalan otomatis di PC admin |
| 1.0-c | Rekonsiliasi harian | Safety net aktif |
| 1.0-d | Installer Inno Setup | Distribusi mudah |
| 1.1 | Auto-update agent (opsional) | Pemeliharaan jarak jauh |

---

## 14. Uji Keandalan (Wajib sebelum go-live)

- Matikan internet 1 jam saat penimbangan aktif → semua tiket tersinkron setelah nyala, tanpa duplikat.
- Kill proses agent paksa → service restart < 15 dtk, lanjut dari buffer.
- Restart PC → agent auto-start, buffer utuh.
- Edit tiket di Truck Scale (isi tare/out belakangan) → cloud ter-update, bukan duplikat.
- Kirim tiket sama dua kali → cloud tetap 1 record (idempoten).
- Sembunyikan 2 tiket dari deteksi realtime → rekonsiliasi harian menambalnya.

---

## 15. Referensi Silang

- Skema & mapping → `04-Database-Architecture.md`
- Payload & endpoint → `06-REST-API-Specification.md`
- Standar kode agent → `07-Engineering-Guidelines.md`
- Konteks produk → `01-PRD.md`
