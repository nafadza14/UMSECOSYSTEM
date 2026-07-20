"""
test_agent.py — SIMULATOR Sync Agent untuk UJI COBA (tanpa .mdb / driver Access).

Fungsi: setiap beberapa detik, "seolah-olah" ada truk ditimbang lalu:
  1. kirim tiket ke tabel  weighings   (biar muncul di dashboard)
  2. update heartbeat ke   agent_status (biar Monitor Agent = Online)
  3. catat batch ke        sync_logs    (biar Log Sinkronisasi terisi)

Cukup Python (pakai pustaka bawaan, tidak perlu install apa pun).

CARA PAKAI (Windows CMD / PowerShell):
  1. Buat tabelnya dulu di Supabase: jalankan  supabase/schema.sql  dan
     supabase/agent_schema.sql  di SQL Editor.
  2. Ambil SERVICE ROLE key: Supabase -> Project Settings -> API -> service_role.
  3. Jalankan:
        set SUPABASE_SERVICE_KEY=eyJhbGciOi...    (paste service_role key)
        python test_agent.py
  4. Buka dashboard -> menu "Monitor Agent" (login owner/manager/admin).
     Set VITE_DATA_SOURCE=supabase agar dashboard baca dari cloud.

Tanpa service key -> jalan DRY-RUN (hanya menampilkan di layar, tidak kirim ke cloud).
Hentikan dengan Ctrl+C.
"""
import json
import os
import random
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zwudkqhsukjtzxtsqdrt.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SITE = os.environ.get("SITE_CODE", "SITE01")
INTERVAL = int(os.environ.get("INTERVAL", "5"))

# Master data contoh (mengikuti data nyata Truck Scale)
PRODUCTS = [("01", "ABU BATU"), ("02", "PASIR"), ("04", "SPLIT 1-2"), ("10", "BANTAK")]
SUPPLIERS = [("17", "UPOYO"), ("05", "RESTU PAPA"), ("08", "PAK DARMONO")]
CUSTOMERS = [("01", "UMUM"), ("03", "BEJOLUMINTU"), ("05", "CV BINTANG PRATAMA")]
TRUCKS = ["AD 9189 DJ", "AB 8878 BK", "AB 8975 HU", "Z 8594 KA", "AB 8617 HU", "K 1360 RF"]

_ticket = random.randint(100, 300)
_synced_today = 0


def _post(path, payload, prefer=""):
    """POST/PATCH ke Supabase REST. Return True bila sukses (atau dry-run)."""
    if not SERVICE_KEY:
        print(f"   [dry-run] -> {path}: {json.dumps(payload, ensure_ascii=False)[:120]}")
        return True
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return 200 <= resp.status < 300
    except urllib.error.HTTPError as e:
        print(f"   HTTP {e.code}: {e.read()[:160]!r}")
        return False
    except Exception as e:  # noqa: BLE001
        print(f"   gagal: {e}")
        return False


def make_ticket():
    global _ticket
    _ticket += 1
    is_supplier = random.random() < 0.4
    prod = random.choice(PRODUCTS)
    truck = random.choice(TRUCKS)
    now = datetime.now()
    if is_supplier:
        code, name = random.choice(SUPPLIERS)
        typ = "supplier"
        w1 = random.randint(18000, 26000)
        w2 = random.randint(3500, 5000)
    else:
        code, name = random.choice(CUSTOMERS)
        typ = "customer"
        w1 = random.randint(2000, 9000)
        w2 = random.randint(900, 1500)
    gross, tare = max(w1, w2), min(w1, w2)
    netto = gross - tare
    tid = f"{_ticket:05d}"
    return {
        "id": f"test-{typ}-{tid}-{now.strftime('%H%M%S')}",
        "type": typ,
        "ticket_no": tid,
        "partner_code": code,
        "partner_name": name,
        "product_code": prod[0],
        "product_name": prod[1],
        "truck_no": truck,
        "gross_kg": gross,
        "tare_kg": tare,
        "netto_kg": netto,
        "date_in": now.strftime("%Y-%m-%d"),
        "time_in": now.strftime("%H:%M:%S"),
        "date_out": now.strftime("%Y-%m-%d"),
        "time_out": now.strftime("%H:%M:%S"),
        "operator": "AGENT-TEST",
        "status": "completed",
    }


def cycle():
    global _synced_today
    n = random.randint(1, 3)
    tickets = [make_ticket() for _ in range(n)]
    ok = _post("weighings?on_conflict=id", tickets, "resolution=merge-duplicates,return=minimal")
    inserted = n if ok else 0
    _synced_today += inserted
    now_iso = datetime.now(timezone.utc).isoformat()

    # heartbeat / status
    _post(
        "agent_status?on_conflict=site",
        [{
            "site": SITE, "status": "online", "version": "1.0.0-test",
            "last_heartbeat_at": now_iso, "last_sync_at": now_iso,
            "buffer_pending": 0, "synced_today": _synced_today,
        }],
        "resolution=merge-duplicates,return=minimal",
    )
    # log batch
    _post(
        "sync_logs",
        [{
            "site": SITE, "batch_id": f"test-{int(time.time())}",
            "received_count": n, "inserted_count": inserted,
            "updated_count": 0, "duplicate_count": 0, "created_at": now_iso,
        }],
        "return=minimal",
    )
    print(f"[{datetime.now().strftime('%H:%M:%S')}] kirim {n} tiket "
          f"(total hari ini {_synced_today}) -> {'OK' if ok else 'GAGAL'}")


def main():
    mode = "LIVE (kirim ke Supabase)" if SERVICE_KEY else "DRY-RUN (tanpa kirim)"
    print(f"== TEST SYNC AGENT == site={SITE} interval={INTERVAL}s mode={mode}")
    print("Tekan Ctrl+C untuk berhenti.\n")
    try:
        while True:
            try:
                cycle()
            except Exception as e:  # noqa: BLE001
                print(f"  error siklus: {e}")
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        print("\nDihentikan.")


if __name__ == "__main__":
    main()
