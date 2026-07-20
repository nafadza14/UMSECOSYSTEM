"""
agent.py — TimbangLive Sync Agent (PoC)

Alur:
  baca .mdb (read-only) -> buffer SQLite -> upsert ke Supabase (REST) -> ulangi.

Ketahanan:
  - buffer lokal SQLite: data aman walau internet putus
  - hanya kirim baris yang baru / berubah (source_hash)
  - retry otomatis; loop tak pernah mati karena 1 error

Konfigurasi: config.ini  (+ env SUPABASE_SERVICE_KEY untuk menulis ke Supabase).
Jalankan:  python agent.py         (loop terus)
           python agent.py --once  (satu siklus, untuk uji)
"""
from __future__ import annotations
import configparser
import os
import sqlite3
import sys
import time
import json
import urllib.request
import urllib.error

from reader import read_all

# Lokasi config.ini & buffer.sqlite: di samping .exe bila di-compile,
# atau di samping agent.py bila dijalankan langsung dengan Python.
if getattr(sys, "frozen", False):
    HERE = os.path.dirname(sys.executable)
else:
    HERE = os.path.dirname(os.path.abspath(__file__))


def load_cfg():
    cp = configparser.ConfigParser()
    cp.read(os.path.join(HERE, "config.ini"))
    return {
        "db_path": cp.get("source", "db_path"),
        "table_done": cp.get("source", "table_done", fallback="tbtransact00"),
        "table_active": cp.get("source", "table_active", fallback="TbTransact"),
        "poll_interval": cp.getint("cloud", "poll_interval", fallback=5),
        "supabase_url": cp.get("cloud", "supabase_url", fallback=""),
        "site_code": cp.get("cloud", "site_code", fallback="SITE01"),
        "batch_size": cp.getint("cloud", "batch_size", fallback=200),
    }


def init_buffer():
    con = sqlite3.connect(os.path.join(HERE, "buffer.sqlite"))
    con.execute(
        """CREATE TABLE IF NOT EXISTS outbox(
             id TEXT PRIMARY KEY, payload TEXT, source_hash TEXT,
             status TEXT DEFAULT 'pending', attempts INT DEFAULT 0)"""
    )
    con.commit()
    return con


def stage(con, records) -> int:
    """Masukkan record baru/berubah ke outbox sebagai pending. Return jumlah perubahan."""
    changed = 0
    cur = con.cursor()
    for rec in records:
        row = cur.execute("SELECT source_hash FROM outbox WHERE id=?", (rec["id"],)).fetchone()
        if row and row[0] == rec["source_hash"]:
            continue  # tidak berubah
        cur.execute(
            "REPLACE INTO outbox(id,payload,source_hash,status,attempts) VALUES(?,?,?,'pending',0)",
            (rec["id"], json.dumps(rec, ensure_ascii=False), rec["source_hash"]),
        )
        changed += 1
    con.commit()
    return changed


def _post_supabase(cfg, service_key, rows) -> bool:
    url = cfg["supabase_url"].rstrip("/") + "/rest/v1/weighings?on_conflict=id"
    body = json.dumps(rows, ensure_ascii=False).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return 200 <= resp.status < 300
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read()[:200]!r}")
        return False
    except Exception as e:
        print(f"  kirim gagal: {e}")
        return False


def flush(con, cfg, service_key) -> int:
    """Kirim semua pending ke Supabase secara batch. Return jumlah tersinkron."""
    if not (cfg["supabase_url"] and service_key):
        return 0
    cur = con.cursor()
    pend = cur.execute(
        "SELECT id,payload FROM outbox WHERE status='pending' LIMIT ?", (cfg["batch_size"],)
    ).fetchall()
    if not pend:
        return 0
    rows = [json.loads(p) for _, p in pend]
    # buang kolom internal sebelum kirim
    for r in rows:
        r.pop("source_hash", None)
    if _post_supabase(cfg, service_key, rows):
        ids = [i for i, _ in pend]
        cur.executemany("UPDATE outbox SET status='synced' WHERE id=?", [(i,) for i in ids])
        con.commit()
        return len(ids)
    else:
        cur.execute("UPDATE outbox SET attempts=attempts+1 WHERE status='pending'")
        con.commit()
        return 0


def cycle(con, cfg, service_key):
    records = read_all(cfg)
    changed = stage(con, records)
    synced = flush(con, cfg, service_key)
    pending = con.execute("SELECT COUNT(*) FROM outbox WHERE status='pending'").fetchone()[0]
    print(
        f"[{time.strftime('%H:%M:%S')}] baca={len(records)} "
        f"baru/berubah={changed} terkirim={synced} pending={pending}"
    )


def main():
    cfg = load_cfg()
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    con = init_buffer()
    once = "--once" in sys.argv
    if not service_key:
        print("(!) SUPABASE_SERVICE_KEY belum diset — data di-buffer lokal, belum dikirim ke cloud.")
    while True:
        try:
            cycle(con, cfg, service_key)
        except Exception as e:  # loop tidak boleh mati
            print(f"  ERROR siklus: {e}")
        if once:
            break
        time.sleep(cfg["poll_interval"])


if __name__ == "__main__":
    main()
