"""Validate and compile compact frontend datasets, without network access.

hub.json is the traceable parsed source. The browser consumes a compact overview
and loads the full financial tree or each report only when requested.
"""
import argparse
from collections import Counter
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import re
import sys
from strict_parsers import norm, stable_label

ROOT=Path(__file__).resolve().parents[1]
SCHEMA=json.loads((ROOT/'config/statement_schema.json').read_text())
CONFIG=json.loads((ROOT/'config/analytics.json').read_text())
SOURCES=json.loads((ROOT/'config/sources.json').read_text())


def encode(value):return json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n'
def write(path,value):
    content=encode(value)
    if path.exists() and path.read_text()==content:return False
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix('.tmp');tmp.write_text(content,encoding='utf-8');tmp.replace(path);return True
def finite(x):return isinstance(x,(float,int)) and not isinstance(x,bool) and math.isfinite(x)
def ratio(a,b):return a/b*100 if finite(a) and finite(b) and b!=0 else None
def idx(d):y,m=map(int,d[:7].split('-'));return y*12+m-1
def ym(i):return f'{i//12:04d}-{i%12+1:02d}'
def metric_id(label):return hashlib.sha256(norm(stable_label(label)).encode()).hexdigest()[:16]


def financial_catalog():
    out=[]
    for st,rows in SCHEMA.items():
        byid={r['id']:r for r in rows}
        for r in rows:
            path=[r['label']];par=r['parent'];depth=0
            while par:path.insert(0,byid[par]['label']);par=byid[par]['parent'];depth+=1
            out.append({**r,'statement':st,'depth':depth,'path':path,'unit':'PEN_THOUSAND','kind':'ytd' if st=='income' else 'stock'})
    return out


def normalize_financial(period):
    values={}
    for st,expected in SCHEMA.items():
        rows=period.get('banbif',{}).get(st,[])
        if len(rows)!=len(expected):raise ValueError(f'{period["date"]} {st}: row count changed {len(rows)} != {len(expected)}')
        for source,spec in zip(rows,expected):
            if source['row']!=spec['row'] or norm(source['label'])!=norm(spec['label']):
                raise ValueError(f'{period["date"]}: unknown statement schema at {spec["id"]}')
            if not finite(source['total']):raise ValueError('Non-numeric financial value')
            values[spec['id']]=[source.get('mn'),source.get('me'),source['total']]
    return {'date':period['date'][:7],'source_url':period['source_url'],'values':values,'peers':period['peers']}


def get(f,row,st='balance'):return f['values'].get(f'{st}:{row}',[None,None,None])[2]


def summary(f):
    parts=[get(f,n) for n in (26,37,38)];gross=sum(parts) if all(finite(v) for v in parts) else None
    pr=abs(get(f,41)) if finite(get(f,41)) else None
    return {'assets':get(f,59),'credits':gross,'deposits':get(f,76),'equity':get(f,126),
            'available':get(f,9),'investments':get(f,17),'net_income':get(f,79,'income'),
            'npl':ratio(get(f,38),gross),'coverage':ratio(pr,get(f,38)),
            'car':ratio(get(f,38)+get(f,37),gross),'loans':get(f,31),'mortgages':get(f,33),
            'foreign_trade':get(f,34),'refinanced':get(f,37),'overdue':get(f,38),
            'provisions':pr,'loan_deposit':ratio(gross,get(f,76)),
            'coverage_car':ratio(pr,get(f,38)+get(f,37)),
            'refi_ratio':ratio(get(f,37),gross),'provisions_direct':ratio(pr,gross),
            'available_public':ratio(get(f,9),get(f,76)),
            'liab_cap_res':get(f,124)/(get(f,127)+get(f,129)) if get(f,127)+get(f,129) else None,
            'net_fin_margin':ratio(get(f,38,'income'),get(f,9,'income')),
            'operating_margin':ratio(get(f,62,'income'),get(f,9,'income')+get(f,40,'income')),
            'admin_gross_margin':ratio(get(f,56,'income'),get(f,34,'income')),
            'leverage':get(f,124)/get(f,126) if get(f,126) else None,
            'net_margin':ratio(get(f,79,'income'),get(f,9,'income')),
            'admin_eff':ratio(get(f,56,'income'),get(f,9,'income')+get(f,40,'income'))}


# Explicit source patterns; no fuzzy matching and no cross-entity fallback.
KEY_METRICS={
 'B-2401':{'roe':r'^UTILIDAD NETA ANUALIZADA / PATRIMONIO PROMEDIO$',
           'roa':r'^UTILIDAD NETA ANUALIZADA / ACTIVO PROMEDIO$',
           'efficiency':r'^GASTOS DE OPERACION / MARGEN FINANCIERO TOTAL$',
           'liq_mn':r'^RATIO DE LIQUIDEZ MN', 'liq_me':r'^RATIO DE LIQUIDEZ ME'},
 'B-2402':{'rcg':r'RATIO DE CAPITAL GLOBAL','cet1':r'CAPITAL ORDINARIO.*NIVEL 1 / APR','tier1':r'PATRIMONIO EFECTIVO DE NIVEL 1 / APR'},
 'B-230809':{'rcl':r'^RATIO DE COBERTURA DE LIQUIDEZ.* · TOTAL$'},
 'B-234021':{'rfne':r'^RATIO DE FINANCIACION NETA ESTABLE \(%\)$'},
 'B-2368':{'fx_global':r'^POSICION GLOBAL EN M.E.'}}


def report_output(code,report):
    catalog={};periods=[]
    for p in report.get('periods',[]):
        if p.get('parser_version')!='5.0':continue
        values={};effective={};keys={};bank_values={}
        for label,value in p['banbif_metrics'].items():
            meta=p.get('metric_meta',{}).get(label)
            if not meta:raise ValueError(f'{code}: missing unit or provenance: {label}')
            mid=metric_id(label)
            if mid in values:raise ValueError(f'{code}: duplicate canonical metric: {label}')
            catalog[mid]={'id':mid,'label':label,'unit':meta['unit'],'kind':'ratio' if meta['unit']=='PERCENT' else 'stock'}
            values[mid]=value;effective[mid]=meta['effective_date'][:7]
            for key,pattern in KEY_METRICS.get(code,{}).items():
                if re.search(pattern,norm(label)):
                    if key in keys:raise ValueError(f'{code}: ambiguous key metric {key}')
                    keys[key]={'value':value,'date':effective[mid],'source':code,'id':mid}
        for bank,metrics in p.get('peer_metrics',{}).items():
            bank_values[bank]={metric_id(k):v for k,v in metrics.items() if metric_id(k) in catalog}
        periods.append({'date':p['date'][:7],'source_url':p['source_url'],'values':values,'effective':effective,
                        'keys':keys,'peers':bank_values,'warning':p.get('period_warning'),
                        'source_caption':p.get('source_caption')})
    return {'code':code,'title':SOURCES[code]['title'],'frequency':SOURCES[code]['frequency'],
            'catalog':list(catalog.values()),'periods':periods}


def inspect(code,periods,today,critical=False):
    dates=[p['date'][:7] for p in periods];errors=[];warnings=[];issues=[]
    if not dates:errors.append('Dataset vacío')
    if len(set(dates))!=len(dates):errors.append('Periodos duplicados')
    if dates!=sorted(dates):errors.append('Periodos desordenados')
    for d in dates:
        try:date.fromisoformat(d+'-01')
        except ValueError:errors.append('Fecha inválida '+d)
    latest=max(dates,default=None);freq=SOURCES[code]['frequency']
    step=3 if freq=='quarterly' else 1
    gaps=[ym(i) for i in range(idx(min(dates)),idx(latest)+1,step) if ym(i) not in dates] if dates else []
    if gaps:warnings.append(f'{len(gaps)} periodos faltantes')
    maxage=CONFIG['health']['quarterly_max_age_months' if step==3 else 'monthly_max_age_months']
    if latest and idx(today.isoformat())-idx(latest)>maxage:warnings.append('Fuente desactualizada según tolerancia de publicación')
    if latest and idx(latest)>idx(today.isoformat()):errors.append('Fecha futura')
    rows=0
    for p in periods:
        obs=[r for st in p.get('banbif',{}).values() for r in st] if code=='B-2201' else list(p.get('banbif_metrics',{}).items())
        rows+=len(obs)
        if not obs:errors.append('Periodo vacío '+p['date'])
        if p.get('parser_version')!='5.0':errors.append('Periodo pendiente de reprocesar '+p['date'])
        if code=='B-2201':
            for r in obs:
                if not finite(r.get('total')):errors.append('Valor no numérico')
                mn,me,t=r.get('mn'),r.get('me'),r.get('total')
                if finite(mn) and finite(me) and finite(t) and abs(mn+me-t)>max(.02,abs(t)*1e-6):
                    errors.append(f'MN + ME no reconcilia: {p["date"]} fila {r["row"]}')
            peerids=[b['slug'] for b in p.get('peers',[])]
            if len(set(peerids))!=len(peerids):errors.append('Bancos duplicados '+p['date'])
        else:
            for label,v in obs:
                if not finite(v):errors.append('Valor no numérico: '+label)
                if label not in p.get('metric_meta',{}):errors.append('Metadatos faltantes: '+label)
            if p.get('period_warning'):issues.append({'date':p['date'][:7],'message':p['period_warning'],'caption':p.get('source_caption')})
    if issues:warnings.append(f'{len(issues)} archivos con discrepancia de periodo en el encabezado')
    transitions=[]
    if code!='B-2201':
        prior=None
        for p in periods:
            signature=tuple(sorted(norm(stable_label(k)) for k in p.get('banbif_metrics',{})))
            if prior and signature!=prior:transitions.append(p['date'][:7])
            prior=signature
        if transitions:warnings.append(f'{len(transitions)} cambios de catálogo; las métricas nuevas no se empalman por similitud')
    return {'dataset':code,'title':SOURCES[code]['title'],'source':SOURCES[code]['url'],
            'latest_period':latest,'periods':len(dates),'rows':rows,'institution':'BanBif',
            'latest_observation_period':max((m['effective_date'][:7] for p in periods for m in p.get('metric_meta',{}).values()),default=latest),
            'frequency':freq,'unit':'Mixta, explícita por métrica' if code!='B-2201' else 'Miles de PEN',
            'currency':'MN / ME expresadas en PEN' if code=='B-2201' else 'PEN, USD o porcentaje según métrica',
            'critical':critical,'status':'ERROR' if errors else 'WARNING' if warnings else 'OK',
            'errors':sorted(set(errors)),'warnings':warnings,'missing_periods':gaps,'period_issues':issues}


def build(db,output,today=None):
    today=today or date.today();health=[];out={};financial=[]
    raw=db.get('financial',{}).get('periods',[])
    health.append(inspect('B-2201',raw,today,True))
    for p in raw:
        try:
            f=normalize_financial(p)
            if abs(get(f,59)-get(f,124)-get(f,126))>max(.02,abs(get(f,59))*1e-6):raise ValueError('Balance no reconcilia '+p['date'])
            # Official domestic system: never add totals or foreign-branch variants.
            peers=[b for b in f['peers'] if b['slug'] not in ('system','system_foreign','bcp_foreign')]
            system=next((b for b in f['peers'] if b['slug']=='system'),None)
            if not system:raise ValueError('Missing official system total '+p['date'])
            for key in ('total_assets','gross_credits','public_deposits'):
                if not all(finite(b.get(key)) for b in peers):raise ValueError('Incomplete peer universe '+p['date'])
                if abs(sum(b[key] for b in peers)-system[key])>max(.1,abs(system[key])*1e-6):raise ValueError('System total does not reconcile '+p['date']+' '+key)
            financial.append(f)
        except (ValueError,KeyError,TypeError) as exc:health[0]['errors'].append(str(exc));health[0]['status']='ERROR'
    for code in SOURCES:
        if code=='B-2201':continue
        report=db.get('reports',{}).get(code,{})
        h=inspect(code,report.get('periods',[]),today,code=='B-2401');health.append(h)
        try:out[code]=report_output(code,report)
        except (ValueError,KeyError,TypeError) as exc:h['errors'].append(str(exc));h['status']='ERROR';out[code]={'code':code,'catalog':[],'periods':[]}
        sync=report.get('sync',{})
        if sync.get('errors'):h['warnings'].append(f"{sync['errors']} errores en la última descarga; se conservan datos previos");h['status']='ERROR' if h['errors'] else 'WARNING'
    latest=max((h['latest_period'] or '' for h in health),default='')
    for h in health:
        if h['latest_period'] and h['latest_period']<latest:
            h['warnings'].append(f'Rezago frente a fuentes disponibles hasta {latest}')
            if h['status']=='OK':h['status']='WARNING'
    errors=sum(len(h['errors']) for h in health);warnings=sum(len(h['warnings']) for h in health)
    report={'schema_version':1,'as_of':today.isoformat(),'latest_period':latest,'datasets':health,'errors':errors,'warnings':warnings}
    # Always write diagnostic output, but never replace consumable outputs on failure.
    write(output/'data_health.json',report)
    print('\nDATA HEALTH')
    for h in health:print(f"{h['dataset']:10} {h['status']:8} | {h['latest_period']} | rows={h['rows']}")
    print(f'Errors: {errors} | Warnings: {warnings}')
    if errors:return report
    overview=[]
    for f in financial:
        keys={k:{'value':v,'date':f['date'],'source':'B-2201'} for k,v in summary(f).items()}
        for code,r in out.items():
            p=next((p for p in reversed(r['periods']) if p['date']<=f['date']),None)
            if p:
                for k,v in p['keys'].items():keys[k]={**v,'file_date':p['date'],'warning':p.get('warning')}
        overview.append({'date':f['date'],'metrics':keys,'peers':f['peers']})
    version=hashlib.sha256(encode({'financial':financial,'reports':out}).encode()).hexdigest()[:16]
    shared={'schema_version':1,'version':version}
    write(output/'financial.json',{**shared,'catalog':financial_catalog(),'periods':financial})
    for c,r in out.items():write(output/'reports'/f'{c}.json',{**shared,**r})
    write(output/'overview.json',{**shared,'latest_period':financial[-1]['date'],'periods':overview,'config':CONFIG})
    manifest={**shared,'latest_period':financial[-1]['date'],'generated_at':db['meta'].get('generated_at'),
              'overview':'overview.json','financial':'financial.json','health':'data_health.json',
              'reports':{c:f'reports/{c}.json' for c in out},'sources':SOURCES}
    write(output/'manifest.json',manifest)
    print('Files generated: 12 (including data health and manifest)')
    return report


if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--as-of',type=date.fromisoformat);args=ap.parse_args()
    result=build(json.loads((ROOT/'data/hub.json').read_text()),ROOT/'data',args.as_of)
    sys.exit(1 if result['errors'] else 0)
