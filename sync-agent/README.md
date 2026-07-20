# TimbangLive Sync Agent (PoC)

Membaca database Truck Scale (`database.mdb`) secara **read-only** dan mengirim tiap transaksi ke **Supabase** (upsert), sehingga dashboard menampilkan data realtime. Aman: tidak pernah menulis ke database sumber.

## Isi

| File | Fungsi |
|------|--------|
| `reader.py` | Baca `.mdb` (pyodbc/Windows, fallback access_parser) + normalisasi |
| `agent.py` | Loop: baca → buffer SQLite → upsert ke Supabase → ulangi |
| `config.ini` | Path DB & pengaturan cloud |
| `test_read.py` | Uji baca tanpa kirim ke cloud |
| `requirements.txt` | Dependensi |

## Cara pakai di PC admin (Windows)

1. **Install Python 3.11+** (centang "Add to PATH").
2. **Access DB Engine** (bila Office 32-bit tidak ada): unduh "Microsoft Access Database Engine 2016 Redistributable" agar driver ODBC `.mdb` tersedia.
3. Install dependensi:
   ```
   pip install -r requirements.txt
   ```
4. Cek `config.ini` — pastikan `db_path` benar:
   ```
   C:\Program Files\Truck Scale v1.13\database.mdb
   ```
5. **Uji baca** (tanpa kirim):
   ```
   python test_read.py
   ```
   Harus muncul jumlah transaksi + 3 tiket terbaru.
6. **Set service key Supabase** (untuk menulis; ambil dari Supabase → Project Settings → API → `service_role`):
   ```
   set SUPABASE_SERVICE_KEY=eyJ...   (Windows CMD)
   ```
7. **Jalankan agent**:
   ```
   python agent.py           (loop terus, sinkron tiap 5 detik)
   python agent.py --once    (satu siklus, untuk uji)
   ```

Data mengalir: `.mdb` → buffer → Supabase → dashboard (set `VITE_DATA_SOURCE=supabase`).

## Ketahanan (sudah di PoC)

- **Buffer SQLite** (`buffer.sqlite`): bila internet putus, data antre & dikirim saat online.
- **Deteksi perubahan** via `source_hash`: hanya baris baru/berubah yang dikirim (idempoten, tanpa duplikat).
- **Loop anti-mati**: error per siklus dicatat, agent tetap jalan.

## Menjadikan Windows Service (produksi)

Gunakan **NSSM** agar jalan otomatis di background & auto-restart:
```
nssm install TimbangLiveSync "C:\Path\to\python.exe" "C:\...\sync-agent\agent.py"
nssm set TimbangLiveSync AppEnvironmentExtra SUPABASE_SERVICE_KEY=eyJ...
nssm start TimbangLiveSync
```

## Catatan

- PoC ini mengirim langsung ke Supabase. Untuk arsitektur penuh (heartbeat, alert WA, rekonsiliasi harian, installer .exe) lihat `docs/08-Sync-Agent-Blueprint.md`.
- `service_role` key bersifat rahasia — **jangan** commit ke Git. Simpan via environment variable / NSSM.
