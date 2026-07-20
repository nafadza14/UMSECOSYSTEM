"""
test_read.py — uji cepat pembacaan .mdb (tanpa kirim ke cloud).
Cetak jumlah transaksi terbaca + 3 contoh terbaru.

Pakai:  python test_read.py [path_ke_mdb]
"""
import sys
from reader import read_all

cfg = {
    "db_path": sys.argv[1] if len(sys.argv) > 1
    else r"C:\Program Files\Truck Scale v1.13\database.mdb",
    "table_done": "tbtransact00",
    "table_active": "TbTransact",
}

rows = read_all(cfg)
rows.sort(key=lambda r: (r["date_in"], r["time_in"]), reverse=True)
print(f"Total transaksi terbaca: {len(rows)}")
print("3 terbaru:")
for r in rows[:3]:
    print(
        f"  {r['date_in']} {r['time_in']} | {r['type']:8} | "
        f"tiket {r['ticket_no']} | {r['partner_name']} | {r['product_name']} | "
        f"{r['truck_no']} | netto {r['netto_kg']} kg | {r['status']}"
    )
