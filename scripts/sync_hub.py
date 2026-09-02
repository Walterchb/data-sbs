#!/usr/bin/env python3
"""
BanBif Regulatory & Financial Intelligence Hub v3.5
SBS synchronizer.

Fixes in v3:
- Handles BOTH OOXML files disguised as .XLS and real BIFF8 .xls files (xlrd).
- Correct current public report identifiers:
  * RCL  -> B-230811
  * RFNE -> R-0010
- Persists sync health per report.
- Never estimates missing values.
"""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin
from urllib.error import URLError,HTTPError
from html.parser import HTMLParser
from io import BytesIO
import json,re,time,zipfile,unicodedata,calendar
import xml.etree.ElementTree as ET
from datetime import datetime,timedelta,timezone

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"hub.json"
UA="Mozilla/5.0 (compatible; BanBif-Regulatory-Hub/3.0; GitHubActions)"
FIN_START_YEAR=2021
REG_START_YEAR=2024
TIMEOUT=50
SLEEP=.12

REPORTS={
"B-2201":("Balance y P&L","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2201","monthly"),
"C-1203":("Créditos Directos por Sector Económico","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=C-1203","monthly"),
"B-2401":("Indicadores Financieros","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2401","monthly"),
"B-3302":("Patrimonio Efectivo y Ratio de Capital Global","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-3302","monthly"),
"B-2340":("Ratios de Liquidez","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2340","monthly"),
"B-230811":("Ratio de Cobertura de Liquidez","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-230811","quarterly"),
"R-0010":("Ratio de Financiación Neta Estable","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=R-0010","monthly"),
"B-2368":("Posición Global en Moneda Extranjera","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2368","monthly")
}
ALIASES={
"banbif":["BANCO INTERAMERICANO DE FINANZAS","INTERAMERICANO DE FINANZAS","BANBIF"],
"bcp":["BANCO DE CREDITO DEL PERU","BANCO DE CRÉDITO DEL PERÚ"],
"bbva":["BANCO BBVA PERU","BANCO BBVA PERÚ","BBVA PERU","BBVA PERÚ"],
"scotiabank":["SCOTIABANK PERU","SCOTIABANK PERÚ"],
"interbank":["INTERBANK"]
}
MONTHS={"en":1,"fe":2,"ma":3,"ab":4,"my":5,"jn":6,"jl":7,"ag":8,"se":9,"oc":10,"no":11,"di":12}
MONTH_CODES={v:k for k,v in MONTHS.items()}
MONTH_FOLDERS={1:"Enero",2:"Febrero",3:"Marzo",4:"Abril",5:"Mayo",6:"Junio",7:"Julio",8:"Agosto",9:"Septiembre",10:"Octubre",11:"Noviembre",12:"Diciembre"}

class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag.lower()=="a":
   h=dict(attrs).get("href")
   if h:self.links.append(h)

def fetch(url,tries=4):
 err=None
 for i in range(tries):
  try:
   with urlopen(Request(url,headers={"User-Agent":UA,"Accept":"*/*"}),timeout=TIMEOUT) as r:return r.read()
  except HTTPError as e:
   if e.code in (404,403):raise
   err=e;time.sleep(1.25*(i+1))
  except (URLError,TimeoutError) as e:err=e;time.sleep(1.25*(i+1))
 raise err

def norm(s):
 s=unicodedata.normalize("NFD",str(s or ""))
 return re.sub(r"\s+"," ","".join(c for c in s if unicodedata.category(c)!="Mn").upper()).strip()
def clean(s):return re.sub(r"\s+"," ",str(s).strip())
def colnum(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n

def workbook_xlsx(raw):
 z=zipfile.ZipFile(BytesIO(raw));ns="http://schemas.openxmlformats.org/spreadsheetml/2006/main";rn="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 ss=[]
 if "xl/sharedStrings.xml" in z.namelist():
  root=ET.fromstring(z.read("xl/sharedStrings.xml"))
  for si in root.findall(f"{{{ns}}}si"):ss.append("".join(t.text or "" for t in si.iter(f"{{{ns}}}t")))
 wb=ET.fromstring(z.read("xl/workbook.xml"));rels=ET.fromstring(z.read("xl/_rels/workbook.xml.rels"));rm={x.attrib["Id"]:x.attrib["Target"] for x in rels};out={}
 for sh in wb.find(f"{{{ns}}}sheets"):
  t=rm[sh.attrib[f"{{{rn}}}id"]];xp="xl/"+t if not t.startswith("xl/") else t;root=ET.fromstring(z.read(xp));d={};mr=mc=0
  for c in root.iter(f"{{{ns}}}c"):
   m=re.match(r"([A-Z]+)(\d+)",c.attrib.get("r",""))
   if not m:continue
   co,ro=colnum(m.group(1)),int(m.group(2));mr=max(mr,ro);mc=max(mc,co);typ=c.attrib.get("t");v=c.find(f"{{{ns}}}v");val=None
   if typ=="s" and v is not None:val=ss[int(v.text)]
   elif typ=="inlineStr":
    x=c.find(f"{{{ns}}}is");val="".join(t.text or "" for t in x.iter(f"{{{ns}}}t")) if x is not None else None
   elif v is not None:
    try:val=float(v.text)
    except:val=v.text
   d[(ro,co)]=val
  out[sh.attrib["name"]]={"data":d,"max_row":mr,"max_col":mc}
 return out

def workbook_xls(raw):
 import xlrd
 wb=xlrd.open_workbook(file_contents=raw,on_demand=True)
 out={}
 for sname in wb.sheet_names():
  s=wb.sheet_by_name(sname);d={}
  for rr in range(s.nrows):
   for cc in range(s.ncols):
    cell=s.cell(rr,cc)
    if cell.ctype in (xlrd.XL_CELL_EMPTY,xlrd.XL_CELL_BLANK):continue
    v=cell.value
    if cell.ctype==xlrd.XL_CELL_NUMBER:v=float(v)
    elif cell.ctype==xlrd.XL_CELL_DATE:
     try:
      dt=xlrd.xldate.xldate_as_datetime(v,wb.datemode);v=(dt-datetime(1899,12,30)).days
     except:pass
    d[(rr+1,cc+1)]=v
  out[sname]={"data":d,"max_row":s.nrows,"max_col":s.ncols}
 return out

def workbook(raw):
 if raw[:2]==b"PK":return workbook_xlsx(raw)
 if raw[:8]==bytes.fromhex("D0CF11E0A1B11AE1"):return workbook_xls(raw)
 try:return workbook_xlsx(raw)
 except Exception:return workbook_xls(raw)

def xdate(x):return(datetime(1899,12,30)+timedelta(days=float(x))).strftime("%Y-%m-%d")
def url_date(url):
 m=re.search(r"-([a-z]{2})(\d{4})(?:[^/]*)\.xls",url,re.I)
 if m and m.group(1).lower() in MONTHS:
  y=int(m.group(2));mo=MONTHS[m.group(1).lower()];return f"{y:04d}-{mo:02d}-{calendar.monthrange(y,mo)[1]:02d}"
 return None

def discover(page,start_year):
 hp=Links();hp.feed(fetch(page).decode("utf-8","ignore"));out=[]
 for h in hp.links:
  u=urljoin(page,h)
  if ".xls" not in u.lower():continue
  d=url_date(u)
  if d and int(d[:4])>=start_year:out.append(u)
 return list(dict.fromkeys(out))

def candidate_urls(code,start_year,freq="monthly"):
 now=datetime.now()
 out=[]
 for y in range(start_year,now.year+1):
  end=now.month if y==now.year else 12
  months=range(1,end+1)
  if freq=="quarterly":months=[m for m in months if m in (3,6,9,12)]
  for m in months:
   suf=MONTH_CODES[m];folder=MONTH_FOLDERS[m]
   out.append(f"https://intranet2.sbs.gob.pe/estadistica/financiera/{y}/{folder}/{code}-{suf}{y}.XLS")
 return out

def slug(name):
 n=norm(name)
 if "INTERAMERICANO" in n:return"banbif"
 if "CREDITO DEL PERU" in n:return"bcp"
 if "BBVA" in n:return"bbva"
 if "SCOTIABANK" in n:return"scotiabank"
 if "INTERBANK" in n:return"interbank"
 return re.sub(r"[^a-z0-9]+","-",n.lower()).strip("-")[:45]

def fval(rows,label):
 t=norm(label)
 for r in rows:
  if norm(r["label"])==t:return r["total"]
 return None

def credit_provisions(rows):
 vals=[abs(float(r["total"])) for r in rows if norm(r.get("label"))=="PROVISIONES" and isinstance(r.get("total"),(int,float))]
 return max(vals) if vals else 0

def extract_b2201(raw,url):
 sh=workbook(raw);s1=sh.get("1") or list(sh.values())[0];d=s1["data"];date=url_date(url)
 if not date:
  for c in range(1,min(15,s1["max_col"])+1):
   v=d.get((3,c))
   if isinstance(v,(int,float)) and 30000<v<60000:
    try:date=xdate(v);break
    except:pass
 banks=[]
 for c in range(1,s1["max_col"]+1):
  v=d.get((6,c))
  if isinstance(v,str) and norm(d.get((7,c)))=="MN":banks.append((c,clean(v)))
 if not banks:
  raise ValueError("No se detectaron bloques de bancos en B-2201")
 p={"date":date,"source_url":url,"source_file":url.rsplit("/",1)[-1],"banbif":None,"peers":[]}
 sheet_items=list(sh.items())
 s2=sh.get("2") or (sheet_items[1][1] if len(sheet_items)>1 else s1)
 for bc,name in banks:
  lc=1+12*((bc-2)//12);entity={"slug":slug(name),"name":name}
  for sheet,key in [(s1,"balance"),(s2,"income")]:
   dd=sheet["data"];arr=[]
   for r in range(1,sheet["max_row"]+1):
    rawlab=dd.get((r,lc));tot=dd.get((r,bc+2))
    if not isinstance(rawlab,str) or not isinstance(tot,(int,float)):continue
    lab=clean(rawlab)
    if not lab or lab.startswith("Tipo de Cambio") or lab.startswith("1/"):continue
    arr.append({"row":r,"label":lab,"indent":min(4,max(0,len(rawlab)-len(rawlab.lstrip()))//2),"mn":dd.get((r,bc)) if isinstance(dd.get((r,bc)),(int,float)) else None,"me":dd.get((r,bc+1)) if isinstance(dd.get((r,bc+1)),(int,float)) else None,"total":float(tot)})
   entity[key]=arr
  b=entity["balance"];inc=entity["income"];g=(fval(b,"Vigentes")or 0)+(fval(b,"Refinanciados y Reestructurados")or 0)+(fval(b,"Atrasados")or 0)
  p["peers"].append({"name":name,"slug":entity["slug"],"total_assets":fval(b,"TOTAL ACTIVO"),"gross_credits":g,"public_deposits":fval(b,"OBLIGACIONES CON EL PÚBLICO"),"equity":fval(b,"PATRIMONIO"),"overdue":fval(b,"Atrasados"),"refinanced":fval(b,"Refinanciados y Reestructurados"),"provisions":credit_provisions(b),"net_income":fval(inc,"RESULTADO NETO DEL EJERCICIO"),"financial_income":fval(inc,"INGRESOS FINANCIEROS"),"admin_expenses":fval(inc,"GASTOS ADMINISTRATIVOS")})
  if entity["slug"]=="banbif":p["banbif"]={"balance":entity["balance"],"income":entity["income"]}
 if not p["banbif"]:raise ValueError("No se encontró BanBif en B-2201")
 return p

def find_entity_coords(sh,aliases):
 aa=[norm(x) for x in aliases];hits=[]
 for sn,s in sh.items():
  for(r,c),v in s["data"].items():
   if isinstance(v,str):
    nv=norm(v)
    if any(a in nv for a in aa):hits.append((sn,r,c))
 return hits

def label_left(dd,r,c,limit=20):
 vals=[]
 for x in range(c-1,max(0,c-limit)-1,-1):
  v=dd.get((r,x))
  if isinstance(v,str) and clean(v):
   vals.append(clean(v))
   if len(vals)>=2:break
 return " | ".join(reversed(vals)) if vals else None
def label_up(dd,r,c,limit=15):
 vals=[]
 for y in range(r-1,max(0,r-limit)-1,-1):
  v=dd.get((y,c))
  if isinstance(v,str) and clean(v):
   vals.append(clean(v))
   if len(vals)>=2:break
 return " | ".join(reversed(vals)) if vals else None
def put(d,key,v):
 key=clean(key or "Valor");base=key;i=2
 while key in d:key=f"{base} #{i}";i+=1
 d[key]=float(v)

def extract_metrics(sh,aliases):
 out={}
 hits=find_entity_coords(sh,aliases)
 for sn,er,ec in hits:
  s=sh[sn];dd=s["data"]
  # Horizontal bank-row layout: metrics usually to the right.
  hnums=[(c,dd.get((er,c))) for c in range(ec+1,s["max_col"]+1) if isinstance(dd.get((er,c)),(int,float))]
  # Vertical bank-column layout: metrics usually below.
  vnums=[(r,c,dd.get((r,c))) for r in range(er+1,min(s["max_row"],er+180)+1) for c in range(max(1,ec-1),min(s["max_col"],ec+3)+1) if isinstance(dd.get((r,c)),(int,float))]
  if len(hnums)>=3 and len(hnums)>=len(vnums)//3:
   for c,v in hnums:
    lab=label_up(dd,er,c) or f"Columna {c}"
    put(out,lab,v)
  else:
   for r,c,v in vnums:
    lab=label_left(dd,r,c)
    if not lab:continue
    head=label_up(dd,r,c,8)
    key=f"{lab} | {head}" if head and norm(head) not in [norm(x) for x in aliases] and norm(head)!=norm(lab) else lab
    put(out,key,v)
 return out

def extract_generic(raw,url):
 sh=workbook(raw);peers={}
 for s,aliases in ALIASES.items():peers[s]=extract_metrics(sh,aliases)
 p={"date":url_date(url),"source_url":url,"source_file":url.rsplit("/",1)[-1],"banbif_metrics":peers.get("banbif",{}),"peer_metrics":peers}
 if not p["banbif_metrics"]:raise ValueError("BanBif encontrado sin métricas extraíbles")
 return p

def update_report(db,code,title,page,freq):
 r=db["reports"].setdefault(code,{"title":title,"short":title,"source":page,"periods":[]})
 start=FIN_START_YEAR if code=="B-2201" else REG_START_YEAR
 try:links=discover(page,start)
 except Exception as e:
  print("WARN discover",code,e);links=[]
 # SBS pages do not always expose XLS hrefs in static HTML. Build the canonical public XLS paths as fallback.
 if len(links)<3:links=candidate_urls(code,start,freq)
 known={p.get("source_url") for p in (db["financial"]["periods"] if code=="B-2201" else r.get("periods",[]))}
 target=[u for u in links if u not in known]
 for u in links[-3:]:
  if u not in target:target.append(u)
 current=(db["financial"]["periods"] if code=="B-2201" else r.get("periods",[]))
 merged={p["date"]:p for p in current if p.get("date")}
 errors=[];ok=0
 for u in target:
  try:
   p=extract_b2201(fetch(u),u) if code=="B-2201" else extract_generic(fetch(u),u)
   if p.get("date"):merged[p["date"]]=p;ok+=1;print("OK",code,p["date"],len(p.get("banbif_metrics",{})))
  except Exception as e:errors.append({"url":u,"error":str(e)[:240]});print("WARN",code,u,e)
  time.sleep(SLEEP)
 periods=sorted(merged.values(),key=lambda x:x["date"])
 sync={"last_attempt":datetime.now(timezone.utc).isoformat(),"discovered":len(links),"loaded":len(periods),"updated":ok,"errors":len(errors),"error_samples":errors[:5]}
 if code=="B-2201":
  db["financial"]["periods"]=periods;db["meta"]["financial_sync"]=sync
 else:
  r.update({"title":title,"source":page,"frequency":freq,"periods":periods,"sync":sync})
 return sync

def main():
 db=json.loads(DATA.read_text(encoding="utf-8"))
 # v3.7: the Hub uses no figures from rating-agency reports.
 db.pop("ratings",None)
 # Remove obsolete aliases created by v2.
 db.get("reports",{}).pop("B-230809",None);db.get("reports",{}).pop("B-234021",None)
 for code,(title,page,freq) in REPORTS.items():update_report(db,code,title,page,freq)
 db["meta"]["generated_at"]=datetime.now(timezone.utc).isoformat()
 db["meta"]["latest_financial"]=db["financial"]["periods"][-1]["date"] if db["financial"]["periods"] else None
 DATA.write_text(json.dumps(db,ensure_ascii=False,indent=2),encoding="utf-8")
 print("DONE",db["meta"]["generated_at"])

if __name__=="__main__":main()
