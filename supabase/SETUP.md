# Supabase Setup — UMS Ecosystem

Project: **UMS Ecosystem** (`zwudkqhsukjtzxtsqdrt`)

Dashboard **sudah jalan tanpa Supabase** (default `VITE_DATA_SOURCE=real` memakai data asli bundled). Langkah di bawah opsional — untuk membaca data dari cloud Supabase.

## Langkah (sekali saja, ~2 menit)

1. Buka https://supabase.com/dashboard → project **UMS Ecosystem** → menu **SQL Editor**.
2. **New query** → tempel isi `schema.sql` → **Run**. (Membuat tabel `weighings` + index + RLS baca publik.)
3. **New query** lagi → tempel isi `seed.sql` → **Run**. (Mengisi ±1.573 transaksi asli, 30 hari terakhir.)
4. Selesai. Cek di **Table Editor → weighings**.

## Aktifkan dashboard baca dari Supabase

Di Vercel (atau `.env` lokal), set env:

```
VITE_SUPABASE_URL=https://zwudkqhsukjtzxtsqdrt.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_tldk6rD2dZBUeKIdYCtRNw_voKEJMZ1
VITE_DATA_SOURCE=supabase
```

Bila tabel kosong / gagal diakses, dashboard otomatis fallback ke data asli bundled — jadi aman.

## Catatan

- `schema.sql` mengaktifkan RLS dengan policy **baca publik** (aman untuk dashboard read-only).
- Untuk menulis (insert dari Sync Agent), gunakan **service_role key** di sisi server/agent, bukan anon key.
- Nanti Sync Agent akan mengisi/meng-update tabel ini secara realtime menggantikan seed.
