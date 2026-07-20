# 06 — REST API Specification

**Produk:** TimbangLive
**Plan:** 0.1
**Tanggal:** 2026-07-20
**Base URL:** `https://api.timbanglive.example/v1`
**Auth:** Laravel Sanctum (Bearer token). Agent pakai token per-site; user pakai token sesi SPA.
**Plan:** 0.2 — payload `/ingest` di §2.1 sudah memakai field hasil normalisasi dari skema `.mdb` nyata (`TRANSID`→ticket_no, `W1/W2`→gross/tare, `NETTO`, tipe diturunkan dari `CUSTID`/`SUPPID`).

---

## 1. Konvensi Umum

- Format: JSON (`Content-Type: application/json`).
- Waktu: ISO-8601 dengan timezone (mis. `2026-07-18T13:40:27+07:00`).
- Semua respons dibungkus: `{ "data": ..., "meta": ..., "error": null }`.
- Error: HTTP status sesuai + `{ "error": { "code": "...", "message": "..." } }`.
- Pagination: `?page=`, `?per_page=` → `meta: { current_page, per_page, total }`.
- Idempotensi ingest: kunci `site_id + type + ticket_no`.

Kode status umum: `200` OK · `201` Created · `207` Multi-Status (batch sebagian) · `401` Unauthorized · `403` Forbidden · `422` Validasi gagal · `429` Rate limit.

---

## 2. Endpoint Agent (Sync)

### 2.1 `POST /ingest` — kirim batch tiket
Dipakai Sync Agent. **Idempoten & batch.**

Header: `Authorization: Bearer <agent_token>`

Request:
```json
{
  "batch_id": "a1b2c3-2026071809",
  "site_code": "SITE01",
  "weighings": [
    {
      "type": "customer",
      "ticket_no": "06583",
      "source_hash": "e3b0c44298...",
      "partner_raw": "01UMUM",
      "product_raw": "01ABU BATU",
      "truck_no": "AB 8975 HU",
      "gross_kg": 3030,
      "tare_kg": 1030,
      "netto_kg": 2000,
      "date_in": "2026-07-18",
      "time_in": "13:40:27",
      "date_out": "2026-07-18",
      "time_out": "13:50:40",
      "driver": null,
      "do_bpp": null,
      "note": null,
      "location": null,
      "operator": "RENA"
    }
  ]
}
```

Response `207` (per-item status):
```json
{
  "data": {
    "batch_id": "a1b2c3-2026071809",
    "results": [
      { "ticket_no": "06583", "type": "customer", "status": "inserted", "id": 91234 }
    ],
    "summary": { "received": 1, "inserted": 1, "updated": 0, "duplicate": 0, "failed": 0 }
  },
  "error": null
}
```

Aturan:
- `status` per item: `inserted` | `updated` | `duplicate` | `failed`.
- Item `duplicate` (hash sama) → tetap sukses, tidak menulis ulang.
- Agent baru menandai buffer `synced` untuk item yang `inserted/updated/duplicate`.

### 2.2 `POST /heartbeat` — sinyal hidup agent
Request:
```json
{ "site_code": "SITE01", "agent_version": "1.0.0", "buffer_pending": 0, "last_source_ticket": "06583" }
```
Response `200`:
```json
{ "data": { "server_time": "2026-07-20T09:01:00+07:00", "config": { "poll_interval": 5 } }, "error": null }
```

### 2.3 `POST /reconcile` — laporan rekonsiliasi harian
Request:
```json
{ "site_code": "SITE01", "date": "2026-07-18", "source_count": 142, "source_ticket_range": ["06442","06583"] }
```
Response: daftar `ticket_no` yang **belum ada** di cloud (agar agent kirim ulang).
```json
{ "data": { "missing": ["06501","06507"], "cloud_count": 140 }, "error": null }
```

---

## 3. Endpoint Auth (User)

### 3.1 `POST /auth/login`
```json
{ "email": "owner@site.com", "password": "••••••" }
```
Response: `{ "data": { "token": "...", "user": { "id":1, "role":"owner" } } }`

### 3.2 `POST /auth/logout` — revoke token
### 3.3 `GET /auth/me` — profil & role user aktif
### 3.4 `POST /auth/forgot-password` / `POST /auth/reset-password`

---

## 4. Endpoint Data (Dashboard)

Semua difilter otomatis sesuai role (owner=semua, manager/admin=site-nya, klien=partner-nya).

### 4.1 `GET /weighings` — daftar transaksi
Query: `?date_from=&date_to=&type=&site_id=&partner_id=&product_id=&status=&truck_no=&q=&page=&per_page=`

Response:
```json
{
  "data": [
    {
      "id": 91234, "type": "customer", "ticket_no": "06583",
      "partner": { "id": 5, "name": "UMUM", "code": "01" },
      "product": { "id": 1, "name": "ABU BATU", "code": "01" },
      "truck_no": "AB 8975 HU",
      "gross_kg": 3030, "tare_kg": 1030, "netto_kg": 2000,
      "weighed_in_at": "2026-07-18T13:40:27+07:00",
      "weighed_out_at": "2026-07-18T13:50:40+07:00",
      "operator": "RENA", "status": "completed"
    }
  ],
  "meta": { "current_page": 1, "per_page": 25, "total": 142 }
}
```

### 4.2 `GET /weighings/{id}` — detail satu tiket (termasuk nilai mentah & riwayat)

### 4.3 `GET /summary` — ringkasan KPI
Query: `?date_from=&date_to=&site_id=&type=`
```json
{
  "data": {
    "total_netto_kg": 128400, "truck_count": 47, "avg_netto_kg": 2732,
    "vs_previous_pct": 6.2,
    "by_product": [ { "product": "ABU BATU", "netto_kg": 66768, "pct": 52 } ],
    "by_partner": [ { "partner": "UMUM", "netto_kg": 40000 } ],
    "inbound_netto_kg": 51000, "outbound_netto_kg": 77400
  }
}
```

### 4.4 `GET /summary/trend` — data grafik tren
Query: `?days=7|30&metric=netto|count` → array `{ date, value }`.

---

## 5. Endpoint Laporan

### 5.1 `POST /reports/export`
```json
{ "format": "pdf|xlsx", "date_from": "2026-07-01", "date_to": "2026-07-18", "filters": { "type":"customer", "partner_id":5 } }
```
Response: `202` + `{ "data": { "job_id": "...", "status": "queued" } }` (async via queue).

### 5.2 `GET /reports/{job_id}` — status & URL unduh bila selesai.

### 5.3 `GET/POST/PUT/DELETE /reports/schedules` — kelola laporan terjadwal (cron, penerima WA/email).

---

## 6. Endpoint Monitoring

### 6.1 `GET /agents` — status semua agent/site (owner/manager)
```json
{ "data": [ { "site":"SITE01", "status":"online", "last_heartbeat_at":"...", "last_sync_at":"...", "buffer_pending":0, "version":"1.0.0" } ] }
```
### 6.2 `GET /agents/{site}/sync-logs` — log batch terakhir
### 6.3 `GET /reconciliations` — hasil rekonsiliasi harian

---

## 7. Endpoint Master Data & User (Owner)

- `GET/POST/PUT/DELETE /partners`
- `GET/POST/PUT/DELETE /products`
- `GET/POST/PUT/DELETE /sites`
- `GET/POST/PUT/DELETE /operators`
- `GET/POST/PUT/DELETE /users`
- `POST /users/{id}/client-partners` — mapping klien ↔ partner
- `GET /audit-logs`

---

## 8. Realtime (WebSocket via Laravel Reverb)

Channel privat per site & per klien.

| Channel | Event | Payload |
|---------|-------|---------|
| `private-site.{site_id}` | `weighing.created` | objek weighing ringkas |
| `private-site.{site_id}` | `weighing.updated` | objek weighing |
| `private-site.{site_id}` | `agent.status` | `{ status, last_heartbeat_at }` |
| `private-client.{user_id}` | `weighing.created` | hanya milik klien |

Otorisasi channel lewat `/broadcasting/auth` (Sanctum), enforce scope role.

---

## 9. Keamanan API

- Semua endpoint `https` only.
- Rate limit: ingest 60 req/min/agent; auth 10 req/min/IP.
- Token agent dapat dicabut per-site.
- Validasi ketat (Laravel Form Request) untuk semua payload.
- Scope enforcement di server (klien tak bisa akses data lain walau ubah query).

---

## 10. Referensi Silang

- Skema data → `04-Database-Architecture.md`
- Perilaku sync → `08-Sync-Agent-Blueprint.md`
- Standar kode → `07-Engineering-Guidelines.md`
