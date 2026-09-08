"""SBS workbook readers: OOXML, BIFF, SpreadsheetML, HTML and delimited text."""

from pathlib import Path
from html.parser import HTMLParser
from io import BytesIO
from datetime import datetime, timedelta
import json, re, zipfile, unicodedata, calendar, posixpath
import xml.etree.ElementTree as ET
MONTHS = {'en':1,'fe':2,'ma':3,'ab':4,'my':5,'jn':6,'jl':7,'ag':8,'se':9,'oc':10,'no':11,'di':12}

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)

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
    if re.fullmatch(r"[-+]?\d{1,3}(\.\d{3})+,\d+",s):s=s.replace('.', '').replace(',', '.')
    elif re.fullmatch(r"[-+]?\d{1,3}(,\d{3})+(\.\d+)?",s): s=s.replace(",","")
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
    import csv
    text=raw.decode("utf-8-sig","strict"); lines=[x for x in text.splitlines() if x.strip()]
    if not lines: raise ValueError("Texto vacío")
    scores={d:sum(x.count(d) for x in lines[:10]) for d in ("\t",";",",")}
    delim=max(scores,key=scores.get); d={}; mc=0
    for r,cells in enumerate(csv.reader(lines,delimiter=delim),1):
        mc=max(mc,len(cells))
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
