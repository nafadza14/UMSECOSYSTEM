# Panduan Deploy UMS Ecosystem — dari GitHub sampai Live di Vercel

Ikuti berurutan. Pilih **satu** metode di Bagian A, lalu lanjut ke Bagian B.

---

## BAGIAN A — Upload / Push ke GitHub

Repo tujuan: **https://github.com/nafadza14/ums_ecosystem**

### ⭐ Metode 1 — Lewat tab "Code" (paling gampang, disarankan)

1. Di aplikasi Claude, klik tab **Code** (sebelah Cowork).
2. Klik **Open folder** → pilih folder project (folder hasil extract `ums_ecosystem_v0.2_source`, yang berisi `src`, `docs`, `package.json`).
3. Tempel pesan ini ke Code, kirim:
   ```
   Push folder ini ke GitHub, urus sampai berhasil:
   - git init kalau belum ada
   - remote origin = https://github.com/nafadza14/ums_ecosystem.git (pakai set-url kalau sudah ada)
   - add semua, commit "UMS Ecosystem v0.2", branch main
   - push origin main; kalau ditolak: git pull origin main --rebase lalu push; kalau tetap gagal push --force
   - kalau ada error tampilkan dan perbaiki sampai sukses
   ```
4. Saat Code minta izin menjalankan perintah → klik **Allow / Yes**.
5. Kalau muncul jendela login GitHub di browser → **login** sekali. Selesai.

### Metode 2 — Upload manual lewat web GitHub

1. **Extract** `ums_ecosystem_v0.2_source.zip` (klik kanan → Extract All).
2. Buka https://github.com/nafadza14/ums_ecosystem
3. Klik **Add file → Upload files** (atau link **uploading an existing file**).
4. Buka folder hasil extract, tekan **Ctrl+A**, **drag** semua file & folder ke area upload.
   - Harus DI-DRAG (bukan "choose files") supaya folder `src`, `docs` ikut.
5. Scroll bawah → isi commit message → **Commit changes**.

### Metode 3 — Lewat Terminal (PowerShell)

1. Extract zip, buka foldernya.
2. Klik kanan di dalam folder → **Open in Terminal**.
3. Paste (klik kanan untuk paste), Enter:
   ```
   git init
   git add -A
   git commit -m "UMS Ecosystem v0.2"
   git branch -M main
   git remote add origin https://github.com/nafadza14/ums_ecosystem.git
   git push -u origin main
   ```
4. Kalau muncul jendela login GitHub → login. Kalau `remote already exists` → ganti baris remote jadi `git remote set-url origin https://github.com/nafadza14/ums_ecosystem.git` lalu ulangi push.

✅ **Cek berhasil:** refresh halaman repo GitHub — folder `src`, `docs`, `package.json`, dll harus muncul.

---

## BAGIAN B — Deploy ke Vercel (biar bisa dibuka live)

1. Buka **https://vercel.com** → **Sign Up / Log In** → pilih **Continue with GitHub** → izinkan akses.
2. Di dashboard Vercel klik **Add New… → Project**.
3. Cari repo **`ums_ecosystem`** di daftar → klik **Import**.
   - Kalau tidak muncul: klik **Adjust GitHub App Permissions** → beri akses ke repo itu.
4. Di halaman konfigurasi:
   - **Framework Preset:** harus terdeteksi **Vite** (kalau tidak, pilih manual "Vite").
   - **Build Command:** `npm run build` (biasanya otomatis)
   - **Output Directory:** `dist` (biasanya otomatis)
   - **Environment Variables:** BIARKAN KOSONG dulu (dashboard sudah jalan dengan data asli bawaan).
5. Klik **Deploy**. Tunggu 1–3 menit sampai muncul animasi selesai + tulisan **"Congratulations"**.
6. Klik tombol **Visit** (atau **Continue to Dashboard → Domains**) untuk mendapat URL live, bentuknya:
   ```
   https://ums-ecosystem-xxxx.vercel.app
   ```
7. **Buka URL itu** — landing page tampil. Klik **Open Dashboard** untuk lihat dashboard data asli.

✅ Setiap kali Anda push perubahan ke GitHub, Vercel **auto-deploy** ulang otomatis.

---

## BAGIAN C — (Opsional) Aktifkan data dari Supabase cloud

Hanya kalau ingin dashboard baca dari database cloud (bukan data bawaan):

1. https://supabase.com/dashboard → project **UMS Ecosystem** → **SQL Editor**.
2. **New query** → paste isi `supabase/schema.sql` → **Run**.
3. **New query** → paste isi `supabase/seed.sql` → **Run**.
4. Di Vercel: **Project → Settings → Environment Variables**, tambahkan:
   ```
   VITE_SUPABASE_URL   = https://zwudkqhsukjtzxtsqdrt.supabase.co
   VITE_SUPABASE_ANON_KEY = sb_publishable_tldk6rD2dZBUeKIdYCtRNw_voKEJMZ1
   VITE_DATA_SOURCE    = supabase
   ```
5. **Deployments → ⋯ → Redeploy** supaya env terbaca.

---

## Kalau ada ERROR — cara baca cepat

| Pesan error | Artinya | Solusi |
|-------------|---------|--------|
| `remote origin already exists` | Remote sudah pernah diset | `git remote set-url origin https://github.com/nafadza14/ums_ecosystem.git` |
| `failed to push` / `rejected` | Repo remote sudah ada isinya | `git push -u origin main --force` |
| `Authentication failed` | Login GitHub gagal | Ulangi; saat jendela browser muncul, login akun GitHub |
| `git not recognized` (PowerShell) | Git belum di PATH | Pakai Metode 1 (tab Code) atau buka "Git CMD" dari Start menu |
| Vercel: halaman putih / 404 di `/dashboard` | Routing SPA | Sudah ditangani `vercel.json` (rewrites). Pastikan file itu ada di repo |
| Vercel: build failed | Error build | Buka log Vercel, kirim ke saya |

Kalau mentok, **screenshot pesan errornya** dan kirim — bukan diketik ulang.
