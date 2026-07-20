# Cara membuat & memakai TimbangLiveSync.exe

> Catatan: `.exe` harus dibuat **di PC Windows** (tidak bisa dibuat dari luar). Kalau tidak mau ribet dengan `.exe`, Anda bisa langsung menjalankan `python agent.py` — hasilnya sama.

## Prasyarat (sekali saja)

1. **Python 3.11+** terpasang (saat install, centang "Add Python to PATH").
2. **Microsoft Access Database Engine 2016 Redistributable** — supaya driver ODBC `.mdb` tersedia. Unduh gratis dari situs Microsoft. Pilih versi yang cocok dengan Office Anda (biasanya x86/32-bit).

## Membuat .exe (1 klik)

1. Buka folder `sync-agent`.
2. **Double-click `BUILD-EXE.bat`**.
3. Tunggu selesai. File hasilnya: **`dist\TimbangLiveSync.exe`**.

## Menjalankan

1. Salin **`config.ini`** ke folder `dist` (sebelah `TimbangLiveSync.exe`). Pastikan `db_path` benar:
   ```
   C:\Program Files\Truck Scale v1.13\database.mdb
   ```
2. Set service key Supabase (dari Supabase → Project Settings → API → `service_role`):
   ```
   setx SUPABASE_SERVICE_KEY "eyJ...key_panjang..."
   ```
   Tutup & buka ulang jendela perintah setelah `setx`.
3. Jalankan **`TimbangLiveSync.exe`**. Dia akan baca `.mdb` → kirim ke Supabase tiap 5 detik.

## Uji dulu tanpa .exe (opsional, paling cepat)

Di folder `sync-agent`:
```
pip install pyodbc requests
python test_read.py
```
Kalau muncul jumlah transaksi + 3 tiket terbaru → pembacaan database berhasil.

## Jadikan otomatis jalan (Windows Service)

Pakai **NSSM** supaya `.exe` jalan di background & auto-restart saat PC nyala:
```
nssm install TimbangLiveSync "C:\path\ke\TimbangLiveSync.exe"
nssm set TimbangLiveSync AppEnvironmentExtra SUPABASE_SERVICE_KEY=eyJ...
nssm start TimbangLiveSync
```

## Ringkasan file

| File | Fungsi |
|------|--------|
| `agent.py` | Program utama (loop baca → kirim) |
| `reader.py` | Baca `.mdb` + normalisasi data |
| `config.ini` | Path database & pengaturan cloud |
| `test_read.py` | Uji baca tanpa kirim |
| `BUILD-EXE.bat` | Compile jadi `.exe` (jalankan di Windows) |
| `requirements.txt` | Daftar dependensi |
