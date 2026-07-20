# UMS Ecosystem

Landing page **UMS Ecosystem** + dashboard **Truck Scale Live** (fitur pertama) — menampilkan hasil timbang truk secara realtime.

Stack: **React + TypeScript + Vite + Tailwind CSS**. Data opsional dari **Supabase**; default memakai data dummy (demo) sehingga langsung jalan tanpa setup database.

## Fitur

- **Landing page** dengan hero video full-screen, efek *liquid glass*, font Inter, dan animasi karakter per huruf.
- **Dashboard `/dashboard`**: KPI (total netto, jumlah truk, rata-rata/truk, masuk-keluar), grafik tren tonase, breakdown per produk, dan tabel live feed dengan filter & pencarian.
- Data dummy dibuat menyerupai screenshot Truck Scale v1.1.3 (customer/supplier, produk ABU BATU/PASIR/SPLIT/BANTAK, dsb).

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Build produksi

```bash
npm run build
npm run preview
```

## Konfigurasi (opsional Supabase)

Salin `.env.example` menjadi `.env`:

```
VITE_SUPABASE_URL=https://zwudkqhsukjtzxtsqdrt.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_tldk6rD2dZBUeKIdYCtRNw_voKEJMZ1
VITE_DATA_SOURCE=dummy   # ganti ke "supabase" untuk baca dari database
```

Bila `VITE_DATA_SOURCE=dummy` (default), dashboard memakai data demo. Untuk memakai Supabase:

1. Buka Supabase → SQL Editor → jalankan `supabase/schema.sql`.
2. Isi data ke tabel `weighings` (insert manual, import CSV, atau nanti via Sync Agent).
3. Set `VITE_DATA_SOURCE=supabase` dan pastikan `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` terisi.

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel: **Add New → Project** → import repo.
3. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
4. Tambahkan Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DATA_SOURCE`).
5. Deploy. Routing SPA sudah diatur di `vercel.json`.

## Struktur

```
src/
├── components/          # Navbar, Hero, FadeIn, AnimatedHeading
│   └── dashboard/       # KpiCard, TonnageChart, ProductBreakdown, LiveFeedTable
├── lib/                 # supabase, data service, dummy data, types
├── pages/               # Landing, Dashboard
└── index.css            # Tailwind + liquid-glass + animasi
supabase/schema.sql      # skema tabel weighings
```

## Catatan branding

Sistem desain hero (video, liquid glass, font, animasi) mengikuti spesifikasi persis; teks brand (logo, heading, tagline, nav) disesuaikan untuk **UMS Ecosystem**.
