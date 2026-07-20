"""
reader.py — Membaca database Truck Scale v1.13 (MS Access .mdb) secara READ-ONLY
dan menormalkan tiap transaksi ke bentuk yang dipakai dashboard/cloud.

Dua backend:
  - pyodbc  (Windows / produksi)  → driver "Microsoft Access Driver (*.mdb)"
  - access_parser (fallback, mis. saat uji di Linux/mac)

Skema sumber (terverifikasi dari database.mdb):
  tbtransact00 : transaksi SELESAI  (punya NETTO, DATEOUT, TIMEOUT)
  TbTransact   : transaksi BERJALAN (belum W2/DATEOUT)
  TbCustomer / TbSupplier / TbProduct : master (join by kode, TRIM!)

Tipe transaksi diturunkan: CUSTID terisi -> customer, SUPPID terisi -> supplier.
NETTO = |W1 - W2|. Waktu OLE (1899-12-30 HH:MM:SS) -> ambil komponen jam.
"""
from __future__ import annotations
import hashlib


def _trim(x) -> str:
    return str(x).strip() if x is not None else ""


def _hhmmss(v) -> str:
    s = str(v)
    return s[11:19] if len(s) >= 19 else "00:00:00"


def _dpart(v):
    s = str(v)
    return s[:10] if len(s) >= 10 else None


def _to_int(v) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def transform_row(r: dict, status: str, masters: dict) -> dict | None:
    """r = baris mentah dari sumber. masters = {cust, supp, prod} dict kode->nama."""
    tid = _trim(r.get("TRANSID"))
    din = _dpart(r.get("DATEIN"))
    if not tid or not din:
        return None
    cid, sid = _trim(r.get("CUSTID")), _trim(r.get("SUPPID"))
    typ = "customer" if cid else "supplier"
    pcode = _trim(r.get("PRODID"))
    w1, w2 = _to_int(r.get("W1")), _to_int(r.get("W2"))
    netto = r.get("NETTO")
    netto = _to_int(netto) if netto is not None else abs(w1 - w2)
    gross, tare = max(w1, w2), min(w1, w2)
    time_in = _hhmmss(r.get("TIMEIN"))
    partner_code = cid or sid
    partner_name = (
        masters["cust"].get(cid, cid) if cid else masters["supp"].get(sid, sid)
    ) or partner_code
    rec = {
        "id": f"{typ}-{tid}-{din}-{time_in.replace(':', '')}",
        "type": typ,
        "ticket_no": tid,
        "partner_code": partner_code,
        "partner_name": partner_name,
        "product_code": pcode,
        "product_name": masters["prod"].get(pcode, pcode) or pcode,
        "truck_no": _trim(r.get("NOTRUCK")) or "-",
        "gross_kg": gross,
        "tare_kg": tare,
        "netto_kg": netto,
        "date_in": din,
        "time_in": time_in,
        "date_out": _dpart(r.get("DATEOUT")),
        "time_out": _hhmmss(r.get("TIMEOUT")) if r.get("TIMEOUT") else None,
        "operator": _trim(r.get("OPNAME")) or "-",
        "status": status,
    }
    rec["source_hash"] = hashlib.sha256(
        "|".join(str(rec[k]) for k in (
            "type", "ticket_no", "gross_kg", "tare_kg", "netto_kg",
            "date_in", "time_in", "date_out", "time_out", "status",
        )).encode()
    ).hexdigest()
    return rec


# ----------------------------- Backend: pyodbc ------------------------------
def _read_pyodbc(cfg) -> list[dict]:
    import pyodbc  # hanya tersedia di Windows dgn Access driver

    conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={cfg['db_path']};ReadOnly=1;"
    )
    conn = pyodbc.connect(conn_str, readonly=True)
    cur = conn.cursor()

    def rows(sql):
        cur.execute(sql)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    cust = {_trim(r["CUSTID"]): _trim(r["CUSTNAME"]) for r in rows("SELECT CUSTID,CUSTNAME FROM TbCustomer")}
    supp = {_trim(r["SUPPID"]): _trim(r["SUPPNAME"]) for r in rows("SELECT SUPPID,SUPPNAME FROM TbSupplier")}
    prod = {_trim(r["PRODID"]): _trim(r["PRODNAME"]) for r in rows("SELECT PRODID,PRODNAME FROM TbProduct")}
    masters = {"cust": cust, "supp": supp, "prod": prod}

    out = []
    for r in rows(f"SELECT * FROM {cfg['table_done']}"):
        rec = transform_row(r, "completed", masters)
        if rec:
            out.append(rec)
    for r in rows(f"SELECT * FROM {cfg['table_active']}"):
        rec = transform_row(r, "in_progress", masters)
        if rec:
            out.append(rec)
    conn.close()
    return out


# -------------------------- Backend: access_parser --------------------------
def _read_access_parser(cfg) -> list[dict]:
    from access_parser import AccessParser

    db = AccessParser(cfg["db_path"])

    def tbl(name):
        t = db.parse_table(name)
        n = max((len(v) for v in t.values()), default=0)
        return [{c: (t[c][i] if i < len(t[c]) else None) for c in t} for i in range(n)]

    cust = {_trim(r["CUSTID"]): _trim(r["CUSTNAME"]) for r in tbl("TbCustomer")}
    supp = {_trim(r["SUPPID"]): _trim(r["SUPPNAME"]) for r in tbl("TbSupplier")}
    prod = {_trim(r["PRODID"]): _trim(r["PRODNAME"]) for r in tbl("TbProduct")}
    masters = {"cust": cust, "supp": supp, "prod": prod}

    out = []
    for r in tbl(cfg["table_done"]):
        rec = transform_row(r, "completed", masters)
        if rec:
            out.append(rec)
    for r in tbl(cfg["table_active"]):
        rec = transform_row(r, "in_progress", masters)
        if rec:
            out.append(rec)
    return out


def read_all(cfg) -> list[dict]:
    """Baca semua transaksi (backend otomatis). cfg minimal: db_path, table_done, table_active."""
    try:
        import pyodbc  # noqa: F401
        return _read_pyodbc(cfg)
    except Exception:
        return _read_access_parser(cfg)
