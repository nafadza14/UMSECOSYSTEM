# 04 — Database Architecture

**Produk:** TimbangLive
**Plan:** 0.1
**Tanggal:** 2026-07-20

> ⚠️ **Catatan versi:** Bagian §0 (di bawah) adalah **skema NYATA terverifikasi (Plan 0.2)** dari file `database.mdb` asli. Bagian §1 dst. adalah rancangan cloud awal (Plan 0.1) yang tetap berlaku sebagai target, dengan mapping disesuaikan ke skema nyata.

---

## 0. SKEMA NYATA — Terverifikasi dari `database.mdb` (Plan 0.2)

**Database:** MS Access `.mdb` (±4 MB) di `C:\Program Files\Truck Scale v1.13\database.mdb`.
Aplikasi `TruckScale.exe` (Visual Basic), laporan pakai Crystal Report (`.RPT`).

### 0.1 Daftar tabel

| Tabel | Peran | Kolom |
|-------|-------|-------|
| **tbtransact00** | **Transaksi SELESAI (histori utama)** | DATEIN, TIMEIN, DATEOUT, TIMEOUT, W1, W2, **NETTO**, TRANSID, CUSTID, SUPPID, PRODID, NOTRUCK, OPNAME, NOTE, LOCATION, DRIVER, DO |
| **TbTransact** | **Transaksi BERJALAN** (sudah timbang pertama, belum keluar) | sama seperti di atas **tanpa NETTO** |
| TbCustomer | Master customer | CUSTID, CUSTNAME, CUSTADDRESS |
| TbSupplier | Master supplier | SUPPID, SUPPNAME, SUPPADDRESS |
| TbProduct | Master produk (01–10) | PRODID, PRODNAME |
| TbTruck | Tare tersimpan per truk | TARE, NOTRUCK |
| TbOperator | Operator + hak akses | OPNAME, ACCESS1, ACCESS2, ACCESS3, PASSWORD |
| TbInfo | Info perusahaan + TRANSCOUNTER (nomor tiket) | INFO, NOTE |

### 0.2 Logika penting (hasil pembacaan data nyata)

- **Tipe transaksi tidak punya kolom khusus.** Ditentukan dari isian:
  - `CUSTID` terisi & `SUPPID` kosong → **customer** (barang keluar).
  - `SUPPID` terisi & `CUSTID` kosong → **supplier** (barang masuk).
- **Berat:** `W1` = timbang pertama, `W2` = timbang kedua. **NETTO = |W1 − W2|** (tersimpan di `tbtransact00`).
- **Status:** record di `TbTransact` dengan `W2`/`DATEOUT` kosong = *in progress*; saat truk keluar (timbang kedua), transaksi selesai & tercatat di `tbtransact00` lengkap dengan `NETTO`.
- **Waktu:** `DATEIN`/`DATEOUT` = tanggal; `TIMEIN`/`TIMEOUT` = jam (disimpan sebagai OLE time berbasis `1899-12-30`, ambil komponen jam saja).
- **Kode** (`CUSTID`/`SUPPID`/`PRODID`) kadang ada **spasi di belakang** (mis. `'07 '`, `'05 '`) → **wajib di-trim** saat join.
- `TRANSID` = nomor tiket (mis. `'00088'`); counter tiket ada di `TbInfo.TRANSCOUNTER`.

### 0.3 Master data nyata (referensi)

- **Produk (10):** 01 ABU BATU, 02 PASIR, 03 0,5, 04 SPLIT 1-2, 05 SPLIT 2-3, 06 BATU PONDASI, 07 ABU PASIR, 08 ABU SPLIT, 09 PASIR SPLIT, 10 BANTAK.
- **Customer (8):** 01 UMUM, 02 UPOYO, 03 BEJOLUMINTU, 04 BU NUR PRASOJO, 05 CV BINTANG PRATAMA, 06 PAK RISKI (PHD), 07 TITIP TIMBANG, 08 KELUAR/TDK JADI AMBIL.
- **Supplier (17):** 01 PAK YUDA, 02 PAK NUR, 03 PAK BIMO, 04 MAS SANTOSO, 05 RESTU PAPA, 06 REJEKI AGUNG, 07 TFTT, 08 PAK DARMONO, … (dst).

### 0.4 Mapping sumber → cloud `weighings`

| Cloud | Sumber |
|-------|--------|
| ticket_no | `TRANSID` |
| type | `customer` bila `CUSTID` terisi, else `supplier` |
| partner_code / partner_name | `CUSTID`→TbCustomer / `SUPPID`→TbSupplier (trim!) |
| product_code / product_name | `PRODID`→TbProduct |
| truck_no | `NOTRUCK` |
| gross_kg / tare_kg | dari `W1`/`W2` (yang lebih besar = gross) |
| netto_kg | `NETTO` (atau `abs(W1−W2)`) |
| weighed_in_at | `DATEIN` + jam `TIMEIN` |
| weighed_out_at | `DATEOUT` + jam `TIMEOUT` |
| operator | `OPNAME` |
| status | `completed` bila ada di tbtransact00 / `DATEOUT` terisi; else `in_progress` |

### 0.5 Implikasi untuk Sync Agent

- **Data baru selesai** muncul di **`tbtransact00`** → sumber utama untuk dashboard.
- **Tiket berjalan** ada di **`TbTransact`** → untuk indikator "sedang menimbang".
- **Deteksi perubahan:** watermark `TRANSID` + hash isi baris (lihat `08-Sync-Agent-Blueprint.md`).
- **Driver ODBC** untuk `.mdb`: *Microsoft Access Driver (\*.mdb)* / ACE, mode read-only — terbukti terbaca.

---

> ⚠️ **Bagian di bawah (Plan 0.1):** rancangan cloud awal berbasis screenshot. Struktur sumber sudah diklarifikasi di §0.

---

## 1. Dua Basis Data

| DB | Lokasi | Teknologi | Peran |
|----|--------|-----------|-------|
| **Source DB** | PC admin (offline) | MS Access `.mdb` (asumsi) | Milik Truck Scale v1.1.3 — hanya dibaca |
| **Cloud DB** | VPS | MySQL 8 | Milik TimbangLive — sumber kebenaran untuk dashboard |

Sync Agent membaca Source DB dan mengisi Cloud DB. **Tidak ada penulisan ke Source DB.**

---

## 2. Field yang Teramati dari Truck Scale v1.1.3

Dari layar "Weighing Customer", "Weighing Supplier", dan jendela "View":

| Field UI | Contoh nilai | Keterangan |
|----------|--------------|------------|
| Ticket No | 06583, 06580 | Nomor tiket (berurutan) |
| Customer / Supplier | 01UMUM, 07 TITIP TIMBANG, 08KELUAR/TDK JADI, 17UPOYO | Kode+nama, ada entri generik |
| Product | 01ABU BATU, 02PASIR, 04SPLIT 1-2, 10BANTAK, 030,5 | Kode+nama produk |
| Date In / Time In | 2026-07-18 / 13:40:27 | Waktu masuk (timbang pertama) |
| Date Out / Time Out | 2026-07-18 / 13:50:40 | Waktu keluar (timbang kedua) |
| No. Truck | AB 8975 HU, Z 8594 KA, COLT | Nomor polisi / jenis |
| Gross | 3030, 16310 | Berat kotor (kg) |
| Tare | 1030, 3930 | Berat kosong (kg) |
| Netto | 2000, 12380 | Gross − Tare (kg) |
| Note | (kosong) | Catatan |
| Location | (kosong) | Lokasi |
| Driver | (kosong) | Nama supir |
| D.O/BPP | (kosong) | No. Delivery Order / bukti |
| Operator | RENA | Operator penimbang |

Dua alur transaksi:
- **Weighing Customer** — barang keluar (penjualan ke customer).
- **Weighing Supplier** — barang masuk (pembelian dari supplier).

> Nomor tiket tampak berbagi pool tapi bisa saja terpisah per alur. Karena itu kunci unik cloud memakai `type` + `ticket_no` + `site_id`. Dikonfirmasi di 0.2.

---

## 3. Skema Cloud DB (MySQL) — Rancangan

### 3.1 Diagram Relasi (ERD ringkas)

```
sites ─┬─< agents
       ├─< weighings >─┬─ products
       │               ├─ partners (customer/supplier)
       │               └─ operators
       └─< daily_reconciliations

users ─< client_partner_map >─ partners
users ─ roles (owner/manager/admin/client)
weighings ─< sync_logs
* audit_logs (global)
```

### 3.2 Definisi Tabel

#### `sites` — lokasi penimbangan
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| code | VARCHAR(20) UNIQUE | kode site |
| name | VARCHAR(100) | nama site |
| timezone | VARCHAR(40) | default Asia/Jakarta |
| is_active | BOOLEAN | |
| created_at / updated_at | TIMESTAMP | |

#### `agents` — sync agent per site
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| site_id | BIGINT FK | |
| token_hash | VARCHAR(255) | token auth agent (hashed) |
| version | VARCHAR(20) | versi agent |
| last_heartbeat_at | TIMESTAMP | untuk deteksi offline |
| last_sync_at | TIMESTAMP | |
| status | ENUM(online,offline,error) | |
| created_at / updated_at | TIMESTAMP | |

#### `weighings` — inti transaksi timbang
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | id cloud |
| site_id | BIGINT FK | |
| type | ENUM(customer,supplier) | alur |
| ticket_no | VARCHAR(20) | nomor tiket dari sumber |
| source_uid | VARCHAR(64) | id/hash unik dari baris sumber (bila ada) |
| partner_id | BIGINT FK NULL | customer/supplier |
| partner_raw | VARCHAR(100) | teks asli dari sumber (mis. "01UMUM") |
| product_id | BIGINT FK NULL | |
| product_raw | VARCHAR(100) | teks asli produk |
| truck_no | VARCHAR(30) | |
| gross_kg | INT | |
| tare_kg | INT | |
| netto_kg | INT | |
| date_in | DATE | |
| time_in | TIME | |
| date_out | DATE NULL | |
| time_out | TIME NULL | |
| weighed_in_at | DATETIME | gabungan date/time in (index) |
| weighed_out_at | DATETIME NULL | |
| driver | VARCHAR(100) NULL | |
| do_bpp | VARCHAR(50) NULL | |
| note | VARCHAR(255) NULL | |
| location | VARCHAR(100) NULL | |
| operator | VARCHAR(50) NULL | |
| status | ENUM(in_progress,completed) | BR-2 |
| category | ENUM(normal,titip,batal,other) | BR-8 |
| source_hash | CHAR(64) | hash isi baris — deteksi perubahan |
| synced_at | TIMESTAMP | kapan diterima cloud |
| created_at / updated_at | TIMESTAMP | |

Indeks & constraint:
- **UNIQUE** `(site_id, type, ticket_no)` — kunci idempotensi (BR-1).
- INDEX `(site_id, weighed_in_at)`, `(partner_id)`, `(product_id)`, `(status)`.

#### `partners` — customer & supplier
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| code | VARCHAR(20) | kode dari sumber (mis. 01, 07, 17) |
| name | VARCHAR(120) | nama tampil rapi |
| type | ENUM(customer,supplier,both) | |
| is_generic | BOOLEAN | true untuk "01UMUM" dsb |
| is_active | BOOLEAN | |

#### `products`
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| code | VARCHAR(20) | mis. 01, 02, 04, 10 |
| name | VARCHAR(120) | ABU BATU, PASIR, SPLIT 1-2, BANTAK |
| unit | VARCHAR(10) | default kg |
| is_active | BOOLEAN | |

#### `operators`
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| name | VARCHAR(50) | mis. RENA |
| site_id | BIGINT FK | |

#### `users` & `roles`
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| name | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| password | VARCHAR(255) | hashed |
| role | ENUM(owner,manager,admin,client) | |
| site_id | BIGINT FK NULL | untuk manager/admin |
| is_active | BOOLEAN | |

#### `client_partner_map` — akun klien ↔ partner
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| user_id | BIGINT FK | akun klien |
| partner_id | BIGINT FK | partner yang boleh dilihat |

> Ini yang menjamin BR-6: klien hanya melihat weighings dengan `partner_id` yang ter-map ke akunnya.

#### `sync_logs` — jejak teknis sinkronisasi
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| site_id | BIGINT FK | |
| batch_id | VARCHAR(40) | |
| received_count | INT | |
| inserted_count | INT | |
| updated_count | INT | |
| duplicate_count | INT | |
| error_text | TEXT NULL | |
| created_at | TIMESTAMP | |

#### `daily_reconciliations` — hasil cek harian
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| site_id | BIGINT FK | |
| date | DATE | |
| source_count | INT | jumlah tiket di sumber |
| cloud_count | INT | jumlah di cloud |
| missing_count | INT | selisih |
| resolved | BOOLEAN | sudah ditambal? |
| created_at | TIMESTAMP | |

#### `audit_logs`
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | BIGINT PK | |
| user_id | BIGINT FK NULL | |
| action | VARCHAR(80) | login, export, update_master, dll |
| entity | VARCHAR(80) | |
| meta | JSON | |
| ip | VARCHAR(45) | |
| created_at | TIMESTAMP | |

---

## 4. Strategi Deteksi Perubahan (Change Detection)

Karena Truck Scale mungkin tidak punya kolom "updated_at", agent memakai kombinasi:

1. **Watermark by ticket_no:** simpan `max(ticket_no)` terakhir yang sudah dikirim; ambil yang lebih besar.
2. **Rolling re-scan:** scan ulang N tiket terakhir (mis. 50) tiap siklus untuk menangkap tiket yang di-*update* (tare/out diisi belakangan).
3. **`source_hash`:** hash seluruh isi baris; bila hash berubah → kirim update. Ini kunci menangkap perubahan tanpa timestamp.

> Strategi final dikunci di Plan 0.2 setelah lihat struktur & indeks `.mdb` asli.

---

## 5. Pemetaan Sumber → Cloud (Mapping) — ASUMSI

| Cloud (`weighings`) | Sumber (asumsi kolom `.mdb`) |
|---------------------|------------------------------|
| ticket_no | TicketNo |
| type | tabel/flag Customer vs Supplier |
| partner_raw | Customer / Supplier |
| product_raw | Product |
| truck_no | TruckNo |
| gross_kg | Gross |
| tare_kg | Tare |
| netto_kg | Netto |
| date_in / time_in | DateIn / TimeIn |
| date_out / time_out | DateOut / TimeOut |
| driver | Driver |
| do_bpp | DO / BPP |
| note | Note |
| location | Location |
| operator | Operator |

*(nama kolom sumber akan dikoreksi di 0.2)*

---

## 6. Pembersihan & Normalisasi Data

- Pisahkan `kode` dan `nama` dari string gabungan (mis. `01ABU BATU` → code=`01`, name=`ABU BATU`).
- Tandai partner generik (`01UMUM`, `07 TITIP TIMBANG`, `08KELUAR/TDK JADI`) → `is_generic=true` (tidak dapat dipetakan ke akun klien).
- Untuk portal klien, hanya partner **non-generik** yang bisa di-mapping.
- Simpan selalu nilai mentah (`*_raw`) agar audit & mapping bisa dikoreksi tanpa kehilangan asal.

---

## 7. Referensi Silang

- Arsitektur → `02-Software-Architecture.md`
- Aturan bisnis → `03-Functional-Specification.md`
- Payload sync → `06-REST-API-Specification.md`
- Cara baca sumber → `08-Sync-Agent-Blueprint.md`
