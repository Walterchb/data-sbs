#!/usr/bin/env python3
"""Download SBS reports, parse exact entities, keep last valid data, publish atomically."""
import argparse
import calendar
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from sbs_workbook import workbook, url_date, Links, MONTHS
from strict_parsers import extract, extract_financial

ROOT=Path(__file__).resolve().parents[1]
SOURCES=json.loads((ROOT/'config/sources.json').read_text())
MONTH_NAMES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']
MONTH_CODES={v:k for k,v in MONTHS.items()}
VERSION='5.0'


def atomic_json(path, value):
    content=json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n'
    if path.exists() and path.read_text()==content:return False
    path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(content,encoding='utf-8');temp.replace(path)
    return True


def fetch(url):
    error=None
    for attempt in range(2):
        try:
            with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (SBS-Analytics/5.0)'}),timeout=20) as r:
                return r.read()
        except HTTPError as exc:
            if exc.code in (403,404):raise
            error=exc
        except (OSError,TimeoutError) as exc:error=exc
        if attempt==0:time.sleep(.5)
    raise error


def urls(code,period):
    y,m=map(int,period[:7].split('-'))
    folders=[MONTH_NAMES[m-1]]+(['Septiembre'] if m==9 else [])
    return [f'https://intranet2.sbs.gob.pe/estadistica/financiera/{y}/{f}/{code}-{MONTH_CODES[m]}{y}.XLS' for f in folders]


def retrieve(code,date,cache,offline=False):
    f=cache/f'{code}-{date}.xls'
    if offline:
        if not f.exists():raise FileNotFoundError(f)
        raw=f.read_bytes();url=urls(code,date)[0]
    else:
        for url in urls(code,date):
            try:
                raw=fetch(url);break
            except HTTPError as exc:
                if exc.code!=404:raise
        else:raise FileNotFoundError('Not published')
    parser=extract_financial if code=='B-2201' else extract
    p=parser(raw,url,workbook,date) if code=='B-2201' else parser(raw,url,code,workbook,date)
    if not offline:
        cache.mkdir(parents=True,exist_ok=True);f.write_bytes(raw)
    return p


def synchronize(db, args):
    now=datetime.now(timezone.utc);summaries={};tasks=[]
    for code,source in SOURCES.items():
        if args.reports and code not in args.reports:continue
        periods=db.get('financial',{}).get('periods',[]) if code=='B-2201' else db.get('reports',{}).get(code,{}).get('periods',[])
        existing={p['date']:p for p in periods};dates=[]
        for y in range(source['start_year'],now.year+1):
            for m in range(1,(now.month if y==now.year else 12)+1):
                if source['frequency']=='quarterly' and m not in (3,6,9,12):continue
                # RFNE starts in Dec 2025 in the available SBS series.
                if code=='B-234021' and (y,m)<(2025,12):continue
                d=f'{y}-{m:02d}-{calendar.monthrange(y,m)[1]}'
                old=existing.get(d)
                recent=(now.year-y)*12+now.month-m<=3
                if args.refresh_all or not old or old.get('parser_version')!=VERSION or recent:dates.append(d)
        summaries[code]={'existing':existing,'errors':[],'missing':[],'updated':0}
        tasks.extend((code,d) for d in dates)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        pending={pool.submit(retrieve,c,d,args.cache_dir,args.offline):(c,d) for c,d in tasks}
        for f in as_completed(pending):
            code,d=pending[f];s=summaries[code]
            try:
                p=f.result();s['existing'][d]=p;s['updated']+=1
            except FileNotFoundError:s['missing'].append(d)
            except Exception as e:
                s['errors'].append({'date':d,'error':str(e)[:500]})
                print(f'WARNING {code} {d}: {e}',flush=True)
    failed=False
    for code,s in summaries.items():
        source=SOURCES[code]
        # Old parser data cannot be advertised as validated. Preserve it in hub,
        # but the build step refuses to consume it until reprocessed.
        periods=sorted(s['existing'].values(),key=lambda p:p['date'])
        valid=[p for p in periods if p.get('parser_version')==VERSION]
        sync={'status':'error' if not valid else 'partial' if s['errors'] or len(valid)!=len(periods) else 'ok',
              'loaded':len(valid),'latest':valid[-1]['date'] if valid else None,
              'errors':len(s['errors']),'error_samples':sorted(s['errors'],key=lambda x:x['date'])[:6],
              'unpublished_or_missing':sorted(s['missing'])}
        print(f"{code:10} {sync['status']:8} | {sync['latest']} | {len(valid)} periods | {len(s['errors'])} errors",flush=True)
        if code=='B-2201':db['financial']={'periods':periods};db['meta']['financial_sync']=sync
        else:db.setdefault('reports',{})[code]={**source,'source':source['url'],'schema_version':VERSION,'sync':sync,'periods':periods}
        db['meta'].setdefault('source_health',{})[code]=sync
        if code in ('B-2201','B-2401') and (s['errors'] or not valid or len(valid)!=len(periods)):failed=True
    db['meta']['sync_version']=VERSION
    db['meta']['latest_financial']=max((p['date'] for p in db['financial']['periods']),default=None)
    return failed


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--refresh-all',action='store_true',help='Reparse the full history from SBS')
    ap.add_argument('--offline',action='store_true',help='Use previously downloaded XLS files only')
    ap.add_argument('--cache-dir',type=Path,default=ROOT/'.cache/sbs')
    ap.add_argument('--workers',type=int,default=4)
    ap.add_argument('--reports',nargs='+',choices=list(SOURCES))
    ap.add_argument('--skip-build',action='store_true',help='For parser recovery only; does not publish derived files')
    args=ap.parse_args()
    if not 1<=args.workers<=8:ap.error('workers must be between 1 and 8')
    target=ROOT/'data/hub.json';db=json.loads(target.read_text())
    before=json.dumps(db,sort_keys=True)
    db['reports']={k:v for k,v in db.get('reports',{}).items() if k in SOURCES and k!='B-2201'}
    db['meta']['version']=VERSION
    db['meta'].pop('design_reference',None)
    failed=synchronize(db,args)
    if json.dumps(db,sort_keys=True)!=before:db['meta']['generated_at']=datetime.now(timezone.utc).isoformat()
    # Failure diagnostics are retained, but Actions never commits a failed run.
    atomic_json(target,db)
    if not args.skip_build:
        from build_data import build
        health=build(db,ROOT/'data')
        failed=failed or health['errors']>0
    if failed:
        print('ERROR: critical sync failed; outputs must not be published.',file=sys.stderr)
        return 1
    return 0


if __name__=='__main__':sys.exit(main())
