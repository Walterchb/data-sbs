#!/usr/bin/env python3
"""
BanBif Regulatory & Financial Intelligence Hub
Monthly SBS synchronizer.

Sources:
- B-2201  Balance General y Estado de Ganancias y Pérdidas
- C-1203  Créditos Directos por Sector Económico
- B-2401  Indicadores Financieros
- B-3302  Patrimonio Efectivo / Ratio de Capital Global
- B-2340  Ratios de Liquidez
- B-230809 Ratio de Cobertura de Liquidez
- B-234021 Ratio de Financiación Neta Estable
- B-2368  Posición Global en Moneda Extranjera

B-2201 is normalized explicitly.
Other reports are normalized with an orientation-agnostic entity extractor and
the original metric labels are preserved. Missing data is never estimated.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin
from urllib.error import URLError, HTTPError
from html.parser import HTMLParser
from io import BytesIO
import json, re, time, zipfile, unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"hub.json"
UA="Mozilla/5.0 (compatible; BanBif-Regulatory-Hub/1.0; GitHubActions)"
FIN_START_YEAR=2021
REG_START_YEAR=2024
TIMEOUT=45
SLEEP=.15

REPORTS={
 "B-2201":("Balance y P&L","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2201"),
 "C-1203":("Créditos Directos por Sector Económico","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=C-1203"),
 "B-2401":("Indicadores Financieros","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2401"),
 "B-3302":("Patrimonio Efectivo y Ratio de Capital Global","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-3302"),
 "B-2340":("Ratios de Liquidez","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2340"),
 "B-230809":("Ratio de Cobertura de Liquidez","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-230809"),
 "B-234021":("Ratio de Financiación Neta Estable","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-234021"),
 "B-2368":("Posición Global en Moneda Extranjera","https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2368")
}
ENTITY_ALIASES={
 "banbif":["BANCO INTERAMERICANO DE FINANZAS","BANBIF"],
 "bcp":["BANCO DE CREDITO DEL PERU","BANCO DE CRÉDITO DEL PERÚ"],
 "bbva":["BANCO BBVA PERU","BANCO BBVA PERÚ"],
 "scotiabank":["SCOTIABANK PERU","SCOTIABANK PERÚ"],
 "interbank":["INTERBANK"]
}
MONTHS={"en":1,"fe":2,"ma":3,"ab":4,"my":5,"jn":6,"jl":7,"ag":8,"se":9,"oc":10,"no":11,"di":12}

class Links(HTMLParser):
 def __init__(self): super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag.lower()=="a":
   h=dict(attrs).get("href")
   if h:self.links.append(h)

def fetch(url,tries=4):
 err=None
 for i in range(tries):
  try:
   with urlopen(Request(url,headers={"User-Agent":UA,"Accept":"*/*"}),timeout=TIMEOUT) as r:return r.read()
  except (URLError,HTTPError,TimeoutError) as e:
   err=e;time.sleep(1.2*(i+1))
 raise err

def norm(s):
 s=unicodedata.normalize("NFD",str(s or ""))
 return re.sub(r"\s+"," ","".join(c for c in s if unicodedata.category(c)!="Mn").upper()).strip()

def colnum(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n

def workbook(raw):
 z=zipfile.ZipFile(BytesIO(raw))
 ns="http://schemas.openxmlformats.org/spreadsheetml/2006/main";relns="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 shared=[]
 if "xl/sharedStrings.xml" in z.namelist():
  r=ET.fromstring(z.read("xl/sharedStrings.xml"))
  for si in r.findall(f"{{{ns}}}si"):shared.append("".join(t.text or "" for t in si.iter(f"{{{ns}}}t")))
 wb=ET.fromstring(z.read("xl/workbook.xml"));rels=ET.fromstring(z.read("xl/_rels/workbook.xml.rels"));rm={x.attrib["Id"]:x.attrib["Target"] for x in rels};out={}
 for sh in wb.find(f"{{{ns}}}sheets"):
  t=rm[sh.attrib[f"{{{relns}}}id"]];xp="xl/"+t if not t.startswith("xl/") else t;root=ET.fromstring(z.read(xp));d={};mr=mc=0
  for c in root.iter(f"{{{ns}}}c"):
   m=re.match(r"([A-Z]+)(\d+)",c.attrib.get("r",""))
   if not m:continue
   co,ro=colnum(m.group(1)),int(m.group(2));mr=max(mr,ro);mc=max(mc,co);typ=c.attrib.get("t");v=c.find(f"{{{ns}}}v");val=None
   if typ=="s" and v is not None:val=shared[int(v.text)]
   elif typ=="inlineStr":
    isel=c.find(f"{{{ns}}}is");val="".join(t.text or "" for t in isel.iter(f"{{{ns}}}t")) if isel is not None else None
   elif v is not None:
    try:val=float(v.text)
    except:val=v.text
   d[(ro,co)]=val
  out[sh.attrib["name"]]={"data":d,"max_row":mr,"max_col":mc}
 return out

def xdate(x):return (datetime(1899,12,30)+timedelta(days=float(x))).strftime("%Y-%m-%d")
def clean(s):return re.sub(r"\s+"," ",str(s).strip())

def url_date(url):
 m=re.search(r"-([a-z]{2})(\d{4})\.xls",url,re.I)
 if m and m.group(1).lower() in MONTHS:
  y=int(m.group(2));mo=MONTHS[m.group(1).lower()]
  import calendar
  return f"{y:04d}-{mo:02d}-{calendar.monthrange(y,mo)[1]:02d}"
 return None

def discover(page,start_year):
 hp=Links();hp.feed(fetch(page).decode("utf-8","ignore"));out=[]
 for h in hp.links:
  u=urljoin(page,h)
  if re.search(r"\.xls$",u,re.I):
   d=url_date(u)
   if d and int(d[:4])>=start_year:out.append(u)
 return list(dict.fromkeys(out))

def slug(name):
 n=norm(name)
 if "INTERAMERICANO" in n:return "banbif"
 if "CREDITO DEL PERU" in n:return "bcp"
 if "BBVA" in n:return "bbva"
 if "SCOTIABANK" in n:return "scotiabank"
 if "INTERBANK" in n:return "interbank"
 return re.sub(r"[^a-z0-9]+","-",n.lower()).strip("-")[:45]

def fval(rows,label):
 t=norm(label)
 for r in rows:
  if norm(r["label"])==t:return r["total"]
 return None

def extract_b2201(raw,url):
 sh=workbook(raw);d=sh["1"]["data"];date=url_date(url) or xdate(d.get((3,1)))
 banks=[]
 for c in range(1,sh["1"]["max_col"]+1):
  v=d.get((6,c))
  if isinstance(v,str) and d.get((7,c))=="MN":banks.append((c,clean(v)))
 p={"date":date,"source_url":url,"source_file":url.rsplit("/",1)[-1],"banbif":None,"peers":[]}
 for bc,name in banks:
  lc=1+12*((bc-2)//12);entity={"slug":slug(name),"name":name}
  for sn,key in [("1","balance"),("2","income")]:
   dd=sh[sn]["data"];arr=[]
   for r in range(1,sh[sn]["max_row"]+1):
    rawlab=dd.get((r,lc));tot=dd.get((r,bc+2))
    if not isinstance(rawlab,str) or not isinstance(tot,(int,float)):continue
    lab=clean(rawlab)
    if not lab or lab.startswith("Tipo de Cambio") or lab.startswith("1/"):continue
    arr.append({"row":r,"label":lab,"indent":min(4,max(0,len(rawlab)-len(rawlab.lstrip()))//2),"mn":dd.get((r,bc)) if isinstance(dd.get((r,bc)),(int,float)) else None,"me":dd.get((r,bc+1)) if isinstance(dd.get((r,bc+1)),(int,float)) else None,"total":float(tot)})
   entity[key]=arr
  b=entity["balance"];inc=entity["income"];gross=(fval(b,"Vigentes") or 0)+(fval(b,"Refinanciados y Reestructurados") or 0)+(fval(b,"Atrasados") or 0)
  p["peers"].append({"name":name,"slug":entity["slug"],"total_assets":fval(b,"TOTAL ACTIVO"),"gross_credits":gross,"public_deposits":fval(b,"OBLIGACIONES CON EL PÚBLICO"),"equity":fval(b,"PATRIMONIO"),"overdue":fval(b,"Atrasados"),"refinanced":fval(b,"Refinanciados y Reestructurados"),"provisions":abs(fval(b,"Provisiones") or 0),"net_income":fval(inc,"RESULTADO NETO DEL EJERCICIO"),"financial_income":fval(inc,"INGRESOS FINANCIEROS"),"admin_expenses":fval(inc,"GASTOS ADMINISTRATIVOS")})
  if entity["slug"]=="banbif":p["banbif"]={"balance":entity["balance"],"income":entity["income"]}
 return p

def nearest_left(dd,r,c,maxback=14):
 for x in range(c-1,max(0,c-maxback)-1,-1):
  v=dd.get((r,x))
  if isinstance(v,str) and clean(v):return clean(v)
 return None

def nearest_up(dd,r,c,maxback=12):
 for y in range(r-1,max(0,r-maxback)-1,-1):
  v=dd.get((y,c))
  if isinstance(v,str) and clean(v):return clean(v)
 return None

def find_entity_coords(sh,aliases):
 al=[norm(x) for x in aliases];hits=[]
 for sname,s in sh.items():
  for (r,c),v in s["data"].items():
   if isinstance(v,str):
    nv=norm(v)
    if any(a in nv for a in al):hits.append((sname,r,c))
 return hits

def unique_put(d,key,value):
 base=key or "Valor";k=base;i=2
 while k in d:k=f"{base} #{i}";i+=1
 d[k]=float(value)

def extract_metrics_for_entity(sh,aliases):
 out={}
 for sname,er,ec in find_entity_coords(sh,aliases):
  s=sh[sname];dd=s["data"]
  below=sum(1 for r in range(er+1,min(s["max_row"],er+70)+1) for c in range(ec,min(s["max_col"],ec+3)+1) if isinstance(dd.get((r,c)),(int,float)))
  right=sum(1 for c in range(ec+1,min(s["max_col"],ec+70)+1) if isinstance(dd.get((er,c)),(int,float)))
  if below>=right:
   for r in range(er+1,s["max_row"]+1):
    for c in range(ec,min(s["max_col"],ec+3)+1):
     v=dd.get((r,c))
     if not isinstance(v,(int,float)):continue
     lab=nearest_left(dd,r,c)
     if not lab:continue
     sub=nearest_up(dd,r,c,8)
     if sub and norm(sub) not in [norm(x) for x in aliases] and norm(sub)!=norm(lab): key=f"{lab} | {sub}"
     else:key=lab
     unique_put(out,key,v)
  else:
   for c in range(ec+1,s["max_col"]+1):
    v=dd.get((er,c))
    if not isinstance(v,(int,float)):continue
    head=nearest_up(dd,er,c) or f"Columna {c}"
    unique_put(out,head,v)
 return out

def extract_generic(raw,url):
 sh=workbook(raw);date=url_date(url)
 peers={}
 for slugname,aliases in ENTITY_ALIASES.items():
  peers[slugname]=extract_metrics_for_entity(sh,aliases)
 return {"date":date,"source_url":url,"source_file":url.rsplit("/",1)[-1],"banbif_metrics":peers.get("banbif",{}),"peer_metrics":peers}

def main():
 db=json.loads(DATA.read_text(encoding="utf-8"))
 # B-2201
 page=REPORTS["B-2201"][1];links=discover(page,FIN_START_YEAR);known={p.get("source_url") for p in db["financial"]["periods"]};merged={p["date"]:p for p in db["financial"]["periods"]}
 targets=[u for u in links if u not in known]+[u for u in links[-3:] if u not in [x for x in links if x not in known]]
 for u in targets:
  try:
   p=extract_b2201(fetch(u),u);merged[p["date"]]=p;print("OK B-2201",p["date"])
  except Exception as e:print("WARN B-2201",u,e)
  time.sleep(SLEEP)
 db["financial"]["periods"]=sorted(merged.values(),key=lambda x:x["date"])

 # Regulatory reports
 for code,(title,page) in REPORTS.items():
  if code=="B-2201":continue
  r=db["reports"].setdefault(code,{"title":title,"source":page,"periods":[]})
  links=discover(page,REG_START_YEAR);known={p.get("source_url") for p in r.get("periods",[])};merged={p["date"]:p for p in r.get("periods",[]) if p.get("date")}
  targets=[u for u in links if u not in known]
  for u in links[-2:]:
   if u not in targets:targets.append(u)
  for u in targets:
   try:
    p=extract_generic(fetch(u),u)
    if p.get("date"):merged[p["date"]]=p;print("OK",code,p["date"],len(p["banbif_metrics"]))
   except Exception as e:print("WARN",code,u,e)
   time.sleep(SLEEP)
  r["periods"]=sorted(merged.values(),key=lambda x:x["date"])
  r["source"]=page
 db["meta"]["generated_at"]=datetime.now(timezone.utc).isoformat()
 db["meta"]["latest_financial"]=db["financial"]["periods"][-1]["date"] if db["financial"]["periods"] else None
 DATA.write_text(json.dumps(db,ensure_ascii=False,indent=2),encoding="utf-8")

if __name__=="__main__":main()
