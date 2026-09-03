#!/usr/bin/env python3
"""
BanBif Regulatory & Financial Intelligence Hub v4.0
SBS synchronizer.

Key fixes:
- Installs/uses xlrd for real BIFF8 .xls files.
- Fixes OOXML relationship targets such as /xl/worksheets/sheet1.xml.
- Always unions discovered SBS links with canonical monthly URLs.
- Supports both "Setiembre" and "Septiembre".
- Generic parser accepts one-metric bank rows (important for RCL/RFNE).
- Uses code-specific canonical aliases for RCL/RFNE when headers are sparse.
- Backfills 5Y where the SBS series exists.
- Distinguishes unpublished 404s from parser errors.
- Prints a per-report health summary.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin
from urllib.error import URLError, HTTPError
from html.parser import HTMLParser
from io import BytesIO
import json, re, time, zipfile, unicodedata, calendar, posixpath
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "hub.json"
DEBUG_DIR = ROOT / "debug-sbs"

UA = "Mozilla/5.0 (compatible; BanBif-Regulatory-Hub/3.8; GitHubActions)"
TIMEOUT = 50
SLEEP = .08

REPORTS = {
    "B-2201": ("Balance y P&L", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2201", "monthly"),
    "C-1203": ("Créditos Directos por Sector Económico", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=C-1203", "monthly"),
    "B-2401": ("Indicadores Financieros", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2401", "monthly"),
    "B-3302": ("Patrimonio Efectivo y Ratio de Capital Global", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-3302", "monthly"),
    "B-2340": ("Ratios de Liquidez", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2340", "monthly"),
    "B-230811": ("Ratio de Cobertura de Liquidez", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-230811", "quarterly"),
    "R-0010": ("Ratio de Financiación Neta Estable", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=R-0010", "monthly"),
    "B-2368": ("Posición Global en Moneda Extranjera", "https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2368", "monthly"),
}

# Enough history for the 5Y views. RFNE has a shorter public history, so we
# avoid generating years of predictable 404s for that report.
REPORT_START = {
    "B-2201": 2021,
    "C-1203": 2021,
    "B-2401": 2021,
    "B-3302": 2021,
    "B-2340": 2021,
    "B-230811": 2021,
    "R-0010": 2024,
    "B-2368": 2021,
}

ALIASES = {
    "banbif": [
        "BANCO INTERAMERICANO DE FINANZAS", "BANCO INTERAMERICANO",
        "INTERAMERICANO DE FINANZAS", "INTERAMERICANO", "BANBIF", "BIF",
        "B. INTERAMERICANO", "20101036813"
    ],
    "bcp": ["BANCO DE CREDITO DEL PERU", "BANCO DE CRÉDITO DEL PERÚ"],
    "bbva": ["BANCO BBVA PERU", "BANCO BBVA PERÚ", "BBVA PERU", "BBVA PERÚ"],
    "scotiabank": ["SCOTIABANK PERU", "SCOTIABANK PERÚ"],
    "interbank": ["INTERBANK"],
}

MONTHS = {"en":1,"fe":2,"ma":3,"ab":4,"my":5,"jn":6,"jl":7,"ag":8,"se":9,"oc":10,"no":11,"di":12}
MONTH_CODES = {v:k for k,v in MONTHS.items()}
MONTH_FOLDERS = {
    1:["Enero"],2:["Febrero"],3:["Marzo"],4:["Abril"],5:["Mayo"],6:["Junio"],
    7:["Julio"],8:["Agosto"],9:["Setiembre","Septiembre"],10:["Octubre"],
    11:["Noviembre"],12:["Diciembre"]
}

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)

def fetch(url, tries=4):
    err = None
    for i in range(tries):
        try:
            with urlopen(Request(url, headers={"User-Agent": UA, "Accept": "*/*"}), timeout=TIMEOUT) as r:
                return r.read()
        except HTTPError as e:
            if e.code in (404, 403):
                raise
            err = e
            time.sleep(1.2 * (i + 1))
        except (URLError, TimeoutError) as e:
            err = e
            time.sleep(1.2 * (i + 1))
    raise err

def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return re.sub(r"\s+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn").upper()).strip()

def clean(s):
    return re.sub(r"\s+", " ", str(s).strip())

def colnum(s):
    n = 0
    for c in s:
        n = n * 26 + ord(c) - 64
    return n

def normalize_ooxml_target(target):
    # workbook.xml.rels may return:
    #   worksheets/sheet1.xml
    #   xl/worksheets/sheet1.xml
    #   /xl/worksheets/sheet1.xml
    # The old code turned the last case into xl//xl/worksheets/...
    t = str(target or "").replace("\\", "/").strip()
    if not t:
        raise ValueError("OOXML relationship target vacío")
    if t.startswith("/"):
        return posixpath.normpath(t.lstrip("/"))
    if t.startswith("xl/"):
        return posixpath.normpath(t)
    return posixpath.normpath("xl/" + t)

def workbook_xlsx(raw):
    z = zipfile.ZipFile(BytesIO(raw))
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    rn = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{{{ns}}}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{ns}}}t")))

    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {x.attrib["Id"]: x.attrib["Target"] for x in rels}
    out = {}

    sheets = wb.find(f"{{{ns}}}sheets")
    for sh in sheets:
        rid = sh.attrib[f"{{{rn}}}id"]
        xp = normalize_ooxml_target(relmap[rid])
        if xp not in z.namelist():
            # Defensive fallback for non-standard relationship targets.
            candidates = [n for n in z.namelist() if n.endswith("/" + xp.split("/")[-1]) and "worksheets" in n]
            if len(candidates) == 1:
                xp = candidates[0]
            else:
                raise KeyError(f"No se encontró hoja OOXML {xp}")

        root = ET.fromstring(z.read(xp))
        d = {}
        mr = mc = 0
        for c in root.iter(f"{{{ns}}}c"):
            m = re.match(r"([A-Z]+)(\d+)", c.attrib.get("r", ""))
            if not m:
                continue
            co, ro = colnum(m.group(1)), int(m.group(2))
            mr, mc = max(mr, ro), max(mc, co)
            typ = c.attrib.get("t")
            v = c.find(f"{{{ns}}}v")
            val = None
            if typ == "s" and v is not None:
                val = shared[int(v.text)]
            elif typ == "inlineStr":
                x = c.find(f"{{{ns}}}is")
                val = "".join(t.text or "" for t in x.iter(f"{{{ns}}}t")) if x is not None else None
            elif v is not None:
                try:
                    val = float(v.text)
                except Exception:
                    val = v.text
            d[(ro, co)] = val
        out[sh.attrib["name"]] = {"data": d, "max_row": mr, "max_col": mc}
    return out

def workbook_xls(raw):
    import xlrd
    wb = xlrd.open_workbook(file_contents=raw, on_demand=True)
    out = {}
    for sname in wb.sheet_names():
        s = wb.sheet_by_name(sname)
        d = {}
        for rr in range(s.nrows):
            for cc in range(s.ncols):
                cell = s.cell(rr, cc)
                if cell.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
                    continue
                v = cell.value
                if cell.ctype == xlrd.XL_CELL_NUMBER:
                    v = float(v)
                elif cell.ctype == xlrd.XL_CELL_DATE:
                    try:
                        dt = xlrd.xldate.xldate_as_datetime(v, wb.datemode)
                        v = (dt - datetime(1899, 12, 30)).days
                    except Exception:
                        pass
                d[(rr + 1, cc + 1)] = v
        out[sname] = {"data": d, "max_row": s.nrows, "max_col": s.ncols}
    return out


def parse_number_text(value):
    if value is None: return None
    s=clean(value).replace("\xa0"," ").strip()
    if not s: return None
    if s.endswith("%"): s=s[:-1].strip()
    s=re.sub(r"^(S/|US\$|\$)\s*","",s,flags=re.I)
    s=re.sub(r"\s+","",s)
    if s in ("-","—","ND","N.D.","N/A"): return None
    neg=s.startswith("(") and s.endswith(")")
    if neg: s=s[1:-1]
    if re.fullmatch(r"[-+]?\d{1,3}(,\d{3})+(\.\d+)?",s): s=s.replace(",","")
    elif re.fullmatch(r"[-+]?\d+,\d+",s) and "." not in s: s=s.replace(",",".")
    else: s=s.replace(",","")
    try:
        v=float(s); return -v if neg else v
    except: return None

def workbook_spreadsheetml(raw):
    text=raw.decode("utf-8-sig","ignore")
    root=ET.fromstring(text)
    uri="urn:schemas-microsoft-com:office:spreadsheet"
    ns={"ss":uri}; idx=f"{{{uri}}}Index"; typk=f"{{{uri}}}Type"
    out={}
    for wi,ws in enumerate(root.findall(".//ss:Worksheet",ns),1):
        name=ws.attrib.get(f"{{{uri}}}Name",f"Sheet{wi}")
        table=ws.find("ss:Table",ns)
        if table is None: continue
        d={}; rr=0; mr=mc=0
        for row in table.findall("ss:Row",ns):
            rr=int(row.attrib.get(idx,rr+1)); cc=0
            for cell in row.findall("ss:Cell",ns):
                cc=int(cell.attrib.get(idx,cc+1))
                data=cell.find("ss:Data",ns)
                if data is None: continue
                txt="".join(data.itertext()).strip(); typ=data.attrib.get(typk,"String")
                if typ in ("Number","Currency"):
                    try: val=float(txt)
                    except: val=parse_number_text(txt)
                else:
                    n=parse_number_text(txt)
                    val=n if n is not None and re.fullmatch(r"[\s()+\-.,%0-9S/$]+",txt or "") else txt
                d[(rr,cc)]=val; mr=max(mr,rr); mc=max(mc,cc)
        out[name]={"data":d,"max_row":mr,"max_col":mc}
    if not out: raise ValueError("SpreadsheetML sin hojas legibles")
    return out

class ExcelHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self.table=None; self.row=None; self.cell=False; self.buf=[]; self.attrs={}
    def handle_starttag(self,tag,attrs):
        tag=tag.lower()
        if tag=="table": self.table=[]
        elif tag=="tr" and self.table is not None: self.row=[]
        elif tag in ("td","th") and self.row is not None: self.cell=True; self.buf=[]; self.attrs=dict(attrs)
        elif tag=="br" and self.cell: self.buf.append(" ")
    def handle_data(self,data):
        if self.cell: self.buf.append(data)
    def handle_endtag(self,tag):
        tag=tag.lower()
        if tag in ("td","th") and self.cell and self.row is not None:
            self.row.append(("".join(self.buf).strip(),self.attrs)); self.cell=False
        elif tag=="tr" and self.row is not None and self.table is not None:
            if self.row: self.table.append(self.row)
            self.row=None
        elif tag=="table" and self.table is not None:
            if self.table: self.tables.append(self.table)
            self.table=None

def workbook_html(raw):
    try: text=raw.decode("utf-8")
    except: text=raw.decode("latin-1","ignore")
    p=ExcelHTMLParser(); p.feed(text)
    if not p.tables: raise ValueError("HTML sin tablas")
    out={}
    for ti,table in enumerate(p.tables,1):
        d={}; occ=set(); mr=mc=0
        for rr,row in enumerate(table,1):
            cc=1
            for txt,attrs in row:
                while (rr,cc) in occ: cc+=1
                rs=int(attrs.get("rowspan","1") or 1); cs=int(attrs.get("colspan","1") or 1)
                n=parse_number_text(txt)
                val=n if n is not None and re.fullmatch(r"[\s()+\-.,%0-9S/$]+",txt or "") else clean(txt)
                d[(rr,cc)]=val
                for r2 in range(rr,rr+rs):
                    for c2 in range(cc,cc+cs): occ.add((r2,c2))
                mr=max(mr,rr+rs-1); mc=max(mc,cc+cs-1); cc+=cs
        out[f"Table{ti}"]={"data":d,"max_row":mr,"max_col":mc}
    return out

def workbook_delimited(raw):
    text=raw.decode("utf-8-sig","ignore"); lines=[x for x in text.splitlines() if x.strip()]
    if not lines: raise ValueError("Texto vacío")
    scores={d:sum(x.count(d) for x in lines[:10]) for d in ("\t",";",",")}
    delim=max(scores,key=scores.get); d={}; mc=0
    for r,line in enumerate(lines,1):
        cells=line.split(delim); mc=max(mc,len(cells))
        for c,txt in enumerate(cells,1):
            txt=txt.strip().strip('"'); n=parse_number_text(txt)
            d[(r,c)]=n if n is not None and re.fullmatch(r"[\s()+\-.,%0-9S/$]+",txt or "") else clean(txt)
    return {"Text1":{"data":d,"max_row":len(lines),"max_col":mc}}

def file_signature(raw):
    head=raw[:200].lstrip(); low=head.lower()
    if raw[:2]==b"PK": return "OOXML/ZIP"
    if raw[:8]==bytes.fromhex("D0CF11E0A1B11AE1"): return "BIFF/OLE"
    if b"urn:schemas-microsoft-com:office:spreadsheet" in raw[:8000] or (head.startswith(b"<?xml") and b"<Workbook" in raw[:8000]): return "XML/SpreadsheetML"
    if low.startswith(b"<html") or b"<table" in raw[:8000].lower(): return "HTML"
    return "TEXT/UNKNOWN"

def workbook(raw):
    sig=file_signature(raw)
    if sig=="OOXML/ZIP": return workbook_xlsx(raw)
    if sig=="BIFF/OLE": return workbook_xls(raw)
    if sig=="XML/SpreadsheetML": return workbook_spreadsheetml(raw)
    if sig=="HTML": return workbook_html(raw)
    errs=[]
    for fn in (workbook_xlsx,workbook_xls,workbook_spreadsheetml,workbook_html,workbook_delimited):
        try: return fn(raw)
        except Exception as e: errs.append(f"{fn.__name__}: {e}")
    raise ValueError(f"Formato XLS no reconocido ({sig}). "+" | ".join(errs[:3]))

def xdate(x):
    return (datetime(1899, 12, 30) + timedelta(days=float(x))).strftime("%Y-%m-%d")

def url_date(url):
    m = re.search(r"-([a-z]{2})(\d{4})(?:[^/]*)\.xls", url, re.I)
    if m and m.group(1).lower() in MONTHS:
        y = int(m.group(2))
        mo = MONTHS[m.group(1).lower()]
        return f"{y:04d}-{mo:02d}-{calendar.monthrange(y, mo)[1]:02d}"
    return None

def discover(page, start_year):
    hp = Links()
    hp.feed(fetch(page).decode("utf-8", "ignore"))
    out = []
    for h in hp.links:
        u = urljoin(page, h)
        if ".xls" not in u.lower():
            continue
        d = url_date(u)
        if d and int(d[:4]) >= start_year:
            out.append(u)
    return list(dict.fromkeys(out))

def candidate_urls(code, start_year, freq="monthly"):
    now = datetime.now()
    out = []
    for y in range(start_year, now.year + 1):
        end = now.month if y == now.year else 12
        months = range(1, end + 1)
        if freq == "quarterly":
            months = [m for m in months if m in (3, 6, 9, 12)]
        for m in months:
            suf = MONTH_CODES[m]
            for folder in MONTH_FOLDERS[m]:
                out.append(f"https://intranet2.sbs.gob.pe/estadistica/financiera/{y}/{folder}/{code}-{suf}{y}.XLS")
    return out

def union_urls(*groups):
    out = []
    seen = set()
    for group in groups:
        for u in group:
            if u not in seen:
                seen.add(u)
                out.append(u)
    return out

def slug(name):
    n = norm(name)
    if "INTERAMERICANO" in n:
        return "banbif"
    if "CREDITO DEL PERU" in n:
        return "bcp"
    if "BBVA" in n:
        return "bbva"
    if "SCOTIABANK" in n:
        return "scotiabank"
    if "INTERBANK" in n:
        return "interbank"
    return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")[:45]

def fval(rows, label):
    t = norm(label)
    for r in rows:
        if norm(r["label"]) == t:
            return r["total"]
    return None

def credit_provisions(rows):
    vals = [abs(float(r["total"])) for r in rows if norm(r.get("label")) == "PROVISIONES" and isinstance(r.get("total"), (int, float))]
    return max(vals) if vals else 0

def extract_b2201(raw, url):
    sh = workbook(raw)
    s1 = sh.get("1") or list(sh.values())[0]
    d = s1["data"]
    date = url_date(url)
    if not date:
        for c in range(1, min(15, s1["max_col"]) + 1):
            v = d.get((3, c))
            if isinstance(v, (int, float)) and 30000 < v < 60000:
                try:
                    date = xdate(v)
                    break
                except Exception:
                    pass

    banks = []
    for c in range(1, s1["max_col"] + 1):
        v = d.get((6, c))
        if isinstance(v, str) and norm(d.get((7, c))) == "MN":
            banks.append((c, clean(v)))
    if not banks:
        raise ValueError("No se detectaron bloques de bancos en B-2201")

    p = {"date": date, "source_url": url, "source_file": url.rsplit("/", 1)[-1], "banbif": None, "peers": []}
    sheet_items = list(sh.items())
    s2 = sh.get("2") or (sheet_items[1][1] if len(sheet_items) > 1 else s1)

    for bc, name in banks:
        lc = 1 + 12 * ((bc - 2) // 12)
        entity = {"slug": slug(name), "name": name}
        for sheet, key in [(s1, "balance"), (s2, "income")]:
            dd = sheet["data"]
            arr = []
            for r in range(1, sheet["max_row"] + 1):
                rawlab = dd.get((r, lc))
                tot = dd.get((r, bc + 2))
                if not isinstance(rawlab, str) or not isinstance(tot, (int, float)):
                    continue
                lab = clean(rawlab)
                if not lab or lab.startswith("Tipo de Cambio") or lab.startswith("1/"):
                    continue
                arr.append({
                    "row": r,
                    "label": lab,
                    "indent": min(4, max(0, len(rawlab) - len(rawlab.lstrip())) // 2),
                    "mn": dd.get((r, bc)) if isinstance(dd.get((r, bc)), (int, float)) else None,
                    "me": dd.get((r, bc + 1)) if isinstance(dd.get((r, bc + 1)), (int, float)) else None,
                    "total": float(tot),
                })
            entity[key] = arr

        b = entity["balance"]
        inc = entity["income"]
        g = (fval(b, "Vigentes") or 0) + (fval(b, "Refinanciados y Reestructurados") or 0) + (fval(b, "Atrasados") or 0)
        p["peers"].append({
            "name": name, "slug": entity["slug"], "total_assets": fval(b, "TOTAL ACTIVO"),
            "gross_credits": g, "public_deposits": fval(b, "OBLIGACIONES CON EL PÚBLICO"),
            "equity": fval(b, "PATRIMONIO"), "overdue": fval(b, "Atrasados"),
            "refinanced": fval(b, "Refinanciados y Reestructurados"),
            "provisions": credit_provisions(b), "net_income": fval(inc, "RESULTADO NETO DEL EJERCICIO"),
            "financial_income": fval(inc, "INGRESOS FINANCIEROS"),
            "admin_expenses": fval(inc, "GASTOS ADMINISTRATIVOS"),
        })
        if entity["slug"] == "banbif":
            p["banbif"] = {"balance": entity["balance"], "income": entity["income"]}

    if not p["banbif"]:
        raise ValueError("No se encontró BanBif en B-2201")
    return p

def is_entity_match(value,aliases):
    if not isinstance(value,str): return False
    nv=norm(value)
    aa=[norm(x) for x in aliases]
    if any(a and (a==nv or a in nv) for a in aa): return True
    if "INTERAMERICANO" in nv and ("FINANZAS" in nv or "BANCO" in nv or len(nv)<30): return True
    if nv in {"BIF","BANBIF","B. INTERAMERICANO","B INTERAMERICANO"}: return True
    if "20101036813" in nv: return True
    return False


def sheet_name_matches(name, aliases):
    return is_entity_match(str(name or ""), aliases)

def compact_sheet_preview(s, center_row=None, center_col=None, radius_rows=5, max_cols=12):
    dd = s["data"]
    if center_row is None:
        rows = range(1, min(s["max_row"], 12) + 1)
    else:
        rows = range(max(1, center_row - radius_rows), min(s["max_row"], center_row + radius_rows) + 1)
    cols = range(1, min(s["max_col"], max_cols) + 1)
    lines = []
    for r in rows:
        vals = []
        for c in cols:
            v = dd.get((r, c))
            if v is None:
                vals.append("")
            elif isinstance(v, float):
                vals.append(f"{v:g}")
            else:
                vals.append(clean(v)[:60])
        if any(vals):
            lines.append(f"R{r}: " + " | ".join(vals))
    return lines

def detect_workbook_topology(sh):
    info = {
        "sheet_count": len(sh),
        "sheets": [],
        "banbif_sheet_names": [],
        "banbif_hits": [],
        "topology": "unknown",
    }

    for sn, s in sh.items():
        info["sheets"].append({"name": sn, "rows": s["max_row"], "cols": s["max_col"]})
        if sheet_name_matches(sn, ALIASES["banbif"]):
            info["banbif_sheet_names"].append(sn)

    hits = find_entity_coords(sh, ALIASES["banbif"])
    for sn, r, c in hits:
        s = sh[sn]
        hnums = len(numeric_cells_in_row(s, r))
        # Numeric density beneath / above the entity column is the strongest
        # signal for "banks as columns".
        vnums = 0
        for rr in range(max(1, r - 3), min(s["max_row"], r + 60) + 1):
            for cc in range(max(1, c - 1), min(s["max_col"], c + 1) + 1):
                if isinstance(s["data"].get((rr, cc)), (int, float)):
                    vnums += 1
        info["banbif_hits"].append({"sheet": sn, "row": r, "col": c, "row_numeric": hnums, "column_numeric": vnums})

    if info["banbif_sheet_names"]:
        info["topology"] = "bank_sheets"
    elif info["banbif_hits"]:
        best_row = max((x["row_numeric"] for x in info["banbif_hits"]), default=0)
        best_col = max((x["column_numeric"] for x in info["banbif_hits"]), default=0)
        if best_row >= 1 and best_row >= best_col / 3:
            info["topology"] = "banks_in_rows"
        elif best_col >= 1:
            info["topology"] = "banks_in_columns"
        else:
            info["topology"] = "entity_found_sparse"
    elif len(sh) == 1:
        info["topology"] = "single_sheet_no_entity"
    else:
        info["topology"] = "multi_sheet_no_entity"
    return info

def extract_dedicated_bank_sheet(s):
    """Extract metrics when the entire worksheet belongs to BanBif."""
    dd = s["data"]
    out = {}
    for r in range(1, s["max_row"] + 1):
        for c in range(1, s["max_col"] + 1):
            v = dd.get((r, c))
            if not isinstance(v, (int, float)):
                continue
            # Avoid obvious Excel serial dates / IDs when no meaningful label exists.
            lab = best_header(dd, r, c)
            if not lab:
                continue
            nlab = norm(lab)
            if any(x in nlab for x in ("FECHA DE REPORTE", "FECHA DE CORTE")) and 30000 < v < 70000:
                continue
            put(out, lab, v)
    return out

def find_entity_coords(sh,aliases):
    hits=[]
    for sn,s in sh.items():
        for (r,c),v in s["data"].items():
            if is_entity_match(v,aliases): hits.append((sn,r,c))
    return hits

def label_left(dd, r, c, limit=30):
    vals = []
    for x in range(c - 1, max(0, c - limit) - 1, -1):
        v = dd.get((r, x))
        if isinstance(v, str) and clean(v):
            vals.append(clean(v))
            if len(vals) >= 2:
                break
    return " | ".join(reversed(vals)) if vals else None

def label_up(dd, r, c, limit=20):
    vals = []
    for y in range(r - 1, max(0, r - limit) - 1, -1):
        v = dd.get((y, c))
        if isinstance(v, str) and clean(v):
            vals.append(clean(v))
            if len(vals) >= 2:
                break
    return " | ".join(reversed(vals)) if vals else None

def put(d, key, v):
    key = clean(key or "Valor")
    base = key
    i = 2
    while key in d:
        # If identical label/value appears because of a merged header hit, do not duplicate it.
        if d[key] == float(v):
            return
        key = f"{base} #{i}"
        i += 1
    d[key] = float(v)

def best_header(dd,r,c):
    up=label_up(dd,r,c,30); left=label_left(dd,r,c,40); parts=[]
    if left: parts.append(left)
    if up and norm(up) not in {norm(x) for x in parts}: parts.append(up)
    return " | ".join(parts) if parts else None

def numeric_cells_in_row(s,row):
    dd=s["data"]
    return [(c,dd.get((row,c))) for c in range(1,s["max_col"]+1) if isinstance(dd.get((row,c)),(int,float))]


def extract_metrics(sh,aliases):
    out = {}

    # A) Entire worksheets can belong to one bank. This was missing from the
    # previous parser and is common in regulatory workbooks.
    dedicated = [sn for sn in sh if sheet_name_matches(sn, aliases)]
    for sn in dedicated:
        metrics = extract_dedicated_bank_sheet(sh[sn])
        for k, v in metrics.items():
            put(out, k, v)
    if out:
        return out

    # B) Consolidated workbook: locate the bank inside cells.
    for sn, er, ec in find_entity_coords(sh, aliases):
        s = sh[sn]
        dd = s["data"]

        # Banks as rows. Merged cells can move the bank label by 1-2 rows.
        candidates = []
        for rr in range(max(1, er - 2), min(s["max_row"], er + 2) + 1):
            nums = numeric_cells_in_row(s, rr)
            if nums:
                candidates.append((len(nums), -abs(rr-er), rr, nums))
        if candidates:
            _, _, rr, nums = max(candidates)
            for c, v in nums:
                if c == ec and abs(v) > 1e8:
                    continue
                put(out, label_up(dd, rr, c, 40) or label_left(dd, rr, c, 50) or f"Columna {c}", v)
            if out:
                continue

        # Banks as columns. Search down the same/nearby bank column.
        vertical = []
        for r in range(er + 1, min(s["max_row"], er + 320) + 1):
            for c in range(max(1, ec - 2), min(s["max_col"], ec + 2) + 1):
                v = dd.get((r, c))
                if isinstance(v, (int, float)):
                    vertical.append((r, c, v))
        for r, c, v in vertical:
            put(out, best_header(dd, r, c) or f"Fila {r} / Columna {c}", v)
        if out:
            continue

        # Last resort around the entity hit.
        local = []
        for r in range(max(1, er - 5), min(s["max_row"], er + 15) + 1):
            for c in range(max(1, ec - 8), min(s["max_col"], ec + 30) + 1):
                v = dd.get((r, c))
                if isinstance(v, (int, float)):
                    local.append((abs(r-er) + abs(c-ec), r, c, v))
        for _, r, c, v in sorted(local)[:80]:
            put(out, best_header(dd, r, c) or f"Fila {r} / Columna {c}", v)

    return out


def workbook_diagnostic(sh,raw=None):
    topo = detect_workbook_topology(sh)
    parts = []
    if raw is not None:
        parts.append(f"format={file_signature(raw)}")
    parts.append(f"topology={topo['topology']}")
    parts.append("sheets=" + ",".join(f"{x['name']}:{x['rows']}x{x['cols']}" for x in topo["sheets"][:12]))
    if topo["banbif_sheet_names"]:
        parts.append("banbif_sheets=" + ",".join(topo["banbif_sheet_names"]))
    if topo["banbif_hits"]:
        parts.append("banbif_hits=" + " || ".join(
            f"{x['sheet']}!R{x['row']}C{x['col']} rowNums={x['row_numeric']} colNums={x['column_numeric']}"
            for x in topo["banbif_hits"][:8]
        ))

    preview = []
    target_sheet = None
    center = None
    if topo["banbif_sheet_names"]:
        target_sheet = topo["banbif_sheet_names"][0]
    elif topo["banbif_hits"]:
        target_sheet = topo["banbif_hits"][0]["sheet"]
        center = (topo["banbif_hits"][0]["row"], topo["banbif_hits"][0]["col"])
    elif sh:
        target_sheet = next(iter(sh))

    if target_sheet:
        s = sh[target_sheet]
        lines = compact_sheet_preview(s, center_row=center[0] if center else None, center_col=center[1] if center else None)
        preview = [f"{target_sheet}:{x}" for x in lines[:10]]
    if preview:
        parts.append("preview=" + " || ".join(preview))
    return "; ".join(parts)

def canonicalize_metrics(code, metrics):
    """
    Adds stable aliases only when the report layout is sparse.
    Original extracted labels are always preserved.
    """
    if not metrics:
        return metrics
    vals = list(metrics.values())
    keys = [norm(k) for k in metrics]

    if code == "B-230811":
        if not any("RCL" in k or ("COBERTURA" in k and "LIQUIDEZ" in k) for k in keys):
            # In sparse RCL files, TOTAL is usually the final/only ratio column.
            if len(vals) == 1:
                metrics["RCL Total"] = vals[0]
            else:
                total_key = next((k for k in metrics if "TOTAL" in norm(k)), None)
                if total_key:
                    metrics["RCL Total"] = metrics[total_key]

    if code == "R-0010":
        if not any("RFNE" in k or ("FINANCIACION" in k and "ESTABLE" in k) for k in keys):
            if len(vals) == 1:
                metrics["Ratio de Financiación Neta Estable"] = vals[0]
            else:
                total_key = next((k for k in metrics if "TOTAL" in norm(k)), None)
                if total_key:
                    metrics["Ratio de Financiación Neta Estable"] = metrics[total_key]
    return metrics

def extract_generic(raw,url,code):
    sh=workbook(raw); peers={}
    for slug_,aliases in ALIASES.items():
        peers[slug_]=canonicalize_metrics(code,extract_metrics(sh,aliases))
    p={"date":url_date(url),"source_url":url,"source_file":url.rsplit("/",1)[-1],"banbif_metrics":peers.get("banbif",{}),"peer_metrics":peers}
    if not p["banbif_metrics"]:
        raise ValueError("BanBif sin métricas extraíbles; "+workbook_diagnostic(sh,raw))
    return p

def update_report(db, code, title, page, freq):
    r = db["reports"].setdefault(code, {"title": title, "short": title, "source": page, "periods": []})
    start = REPORT_START[code]

    try:
        discovered = discover(page, start)
    except Exception as e:
        print("WARN discover", code, e)
        discovered = []

    # Always combine both sources. The previous "if len(links)<3" logic broke
    # B-2401/B-2340 when the SBS page exposed exactly three old links.
    links = union_urls(discovered, candidate_urls(code, start, freq))

    current = db["financial"]["periods"] if code == "B-2201" else r.get("periods", [])
    merged = {p["date"]: p for p in current if p.get("date")}
    existing_dates = set(merged)

    # Group alternative URLs (e.g. Setiembre/Septiembre) by period.
    by_date = {}
    for u in links:
        d = url_date(u)
        if d:
            by_date.setdefault(d, []).append(u)

    all_dates = sorted(by_date)
    # Refresh latest 3 periods even if already present, to catch SBS revisions.
    refresh_dates = set(all_dates[-3:])

    errors = []
    misses = 0
    updated = 0
    attempted = 0
    debug_saved = False
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    for d in all_dates:
        if d in existing_dates and d not in refresh_dates:
            continue

        attempted += 1
        success = False
        period_errors = []

        for u in by_date[d]:
            try:
                raw = fetch(u)
                p = extract_b2201(raw, u) if code == "B-2201" else extract_generic(raw, u, code)
                if p.get("date"):
                    merged[p["date"]] = p
                    updated += 1
                    success = True
                    metric_count = len(p.get("banbif_metrics", {})) if code != "B-2201" else len(p.get("banbif", {}).get("balance", []))
                    print("OK", code, p["date"], metric_count)
                    break
            except HTTPError as e:
                if e.code == 404:
                    # Unpublished/folder variant: try alternative URL and don't call it a parser error.
                    continue
                period_errors.append({"url": u, "error": f"HTTP {e.code}"})
            except Exception as e:
                msg = str(e)[:1800]
                period_errors.append({"url": u, "error": msg})
                if not debug_saved:
                    safe_date = (d or "unknown").replace("-", "")
                    raw_path = DEBUG_DIR / f"{code}-{safe_date}.xls"
                    txt_path = DEBUG_DIR / f"{code}-{safe_date}.txt"
                    try:
                        raw_path.write_bytes(raw)
                        txt_path.write_text(
                            f"code={code}\ndate={d}\nurl={u}\nerror={msg}\n"
                            f"signature={file_signature(raw)}\n",
                            encoding="utf-8"
                        )
                        print("DEBUG_SAVED", code, raw_path)
                        debug_saved = True
                    except Exception as save_err:
                        print("WARN debug-save", code, save_err)
            time.sleep(SLEEP)

        if not success:
            if period_errors:
                # If every URL failed with a real parse/network error, preserve one useful sample.
                errors.extend(period_errors[:2])
                print("WARN", code, d, period_errors[0]["error"])
            else:
                misses += 1

    periods = sorted(merged.values(), key=lambda x: x["date"])
    latest = periods[-1]["date"] if periods else None
    sync = {
        "last_attempt": datetime.now(timezone.utc).isoformat(),
        "discovered_links": len(discovered),
        "candidate_links": len(links),
        "attempted_periods": attempted,
        "loaded": len(periods),
        "latest": latest,
        "updated": updated,
        "unpublished_or_missing": misses,
        "errors": len(errors),
        "error_samples": errors[:6],
        "status": "ok" if periods and not errors else ("partial" if periods else "error"),
    }

    if code == "B-2201":
        db["financial"]["periods"] = periods
        db["meta"]["financial_sync"] = sync
    else:
        r.update({"title": title, "source": page, "frequency": freq, "periods": periods, "sync": sync})

    print(
        f"SUMMARY {code}: status={sync['status']} loaded={sync['loaded']} "
        f"latest={sync['latest']} updated={updated} errors={sync['errors']} misses={misses}"
    )
    return sync

def main():
    db = json.loads(DATA.read_text(encoding="utf-8"))
    db.pop("ratings", None)
    db.get("reports", {}).pop("B-230809", None)
    db.get("reports", {}).pop("B-234021", None)

    summaries = {}
    for code, (title, page, freq) in REPORTS.items():
        summaries[code] = update_report(db, code, title, page, freq)

    db["meta"]["generated_at"] = datetime.now(timezone.utc).isoformat()
    db["meta"]["latest_financial"] = db["financial"]["periods"][-1]["date"] if db["financial"]["periods"] else None
    db["meta"]["sync_version"] = "4.0"
    db["meta"]["source_health"] = {
        code: {
            "status": s["status"],
            "loaded": s["loaded"],
            "latest": s["latest"],
            "errors": s["errors"],
        }
        for code, s in summaries.items()
    }

    DATA.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n=== SBS SOURCE HEALTH ===")
    for code, s in summaries.items():
        print(f"{code:9} {s['status']:7} periods={s['loaded']:3} latest={s['latest'] or '-':10} errors={s['errors']}")
    print("DONE", db["meta"]["generated_at"])

if __name__ == "__main__":
    main()
