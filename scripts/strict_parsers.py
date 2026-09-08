"""Report-specific SBS extraction. Never search neighbouring banks for values.

Each metric retains its source cell, unit and effective period. Layout changes
raise an exception; callers keep the previous validated period.
"""
import calendar
import hashlib
import re
from datetime import datetime, timedelta


def norm(value):
    import unicodedata
    return re.sub(r"\s+", " ", "".join(c for c in unicodedata.normalize('NFD', str(value or '')) if unicodedata.category(c) != 'Mn').upper()).strip()


def entity(value):
    n = norm(value)
    n = re.sub(r'\*+|\s*\d+/$', '', n).strip()
    if 'TOTAL' in n or 'CONSOLIDADO' in n:
        return 'system_foreign' if 'EXTERIOR' in n else 'system'
    if 'INTERAMERICANO' in n or n in ('BANBIF', 'BIF'): return 'banbif'
    if 'CREDITO' in n and ('PERU' in n or 'BANCO DE CREDITO' in n):
        return 'bcp_foreign' if 'EXTERIOR' in n else 'bcp'
    for key, word in [('bbva','BBVA'),('scotiabank','SCOTIABANK'),('interbank','INTERBANK')]:
        if word in n: return key
    if n in ('BANCOM','BANCO DE COMERCIO','B. DE COMERCIO'):return 'bancom'
    n = re.sub(r'^(B\.|BANCO)\s*', '', n)
    return re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')


def number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def text(v):
    return re.sub(r'\s+', ' ', v).strip() if isinstance(v, str) else ''


def end_month(y, m):
    return f'{y:04d}-{m:02d}-{calendar.monthrange(y,m)[1]:02d}'


def label_period(label, default):
    m = re.search(r'\bal\s+(\d{1,2})/(\d{1,2})/(\d{4})', label, re.I)
    return end_month(int(m[3]), int(m[2])) if m else default


def stable_label(label):
    label = re.sub(r'\s*\(al\s+\d{1,2}/\d{1,2}/\d{4}\)', '', label, flags=re.I)
    return re.sub(r'\s+', ' ', label).strip()


def validate_header_date(sheets, expected, code):
    if code=='B-230809':return  # Date is textual quarter caption, retained separately.
    first=next(iter(sheets.values()))['data']
    candidates=[]
    for r in range(1,7):
        for c in (1,2):
            v=first.get((r,c))
            if isinstance(v,str) and v.isdigit():v=float(v)
            if number(v) and 30000<v<70000:candidates.append(v)
    if not candidates:raise ValueError(f'{code}: missing date in workbook header')
    actual=(datetime(1899,12,30)+timedelta(days=candidates[0])).strftime('%Y-%m-%d')
    if actual[:7]!=expected[:7]:raise ValueError(f'{code}: source header date {actual} differs from URL {expected}')


def period_base(url, date, raw):
    return {'date':date, 'source_url':url, 'source_file':url.rsplit('/',1)[-1],
            'source_sha256':hashlib.sha256(raw).hexdigest(), 'parser_version':'5.0',
            'banbif_metrics':{}, 'peer_metrics':{}, 'metric_meta':{}, 'entity_names':{}}


def add(p, bank, label, value, unit, sheet, row, col, effective=None):
    if not number(value): return
    label = stable_label(text(label))
    if not label: raise ValueError('Metric without label')
    metrics = p['peer_metrics'].setdefault(bank,{})
    if label in metrics: raise ValueError(f'Duplicate metric {bank}: {label}')
    metrics[label] = float(value)
    if bank == 'banbif':
        p['banbif_metrics'][label] = float(value)
        p['metric_meta'][label] = {'unit':unit, 'sheet':sheet, 'row':row, 'column':col,
                                  'effective_date':effective or p['date']}


def extract_columns(sheets, p, code):
    """B-2401 / B-2336: banks in exact columns; labels left of bank blocks."""
    for sn,s in sheets.items():
        d=s['data']
        heads=[(r,c) for (r,c),v in d.items() if entity(v)=='banbif']
        if not heads: continue
        hr,_=heads[0]
        banks=[(c,text(v)) for (r,c),v in d.items() if r==hr and isinstance(v,str)
               and c>1 and text(v) and norm(v) not in ('ACTIVO','SECTOR ECONOMICO')]
        for c,name in banks:
            bank=entity(name)
            if bank in p['entity_names']: raise ValueError('Duplicate bank header '+bank)
            p['entity_names'][bank]=name
            for r in range(hr+1,s['max_row']+1):
                v=d.get((r,c));label=text(d.get((r,1)))
                if not number(v) or not label or norm(label).startswith(('NOTA','FUENTE','1/','*')): continue
                if code=='B-2336': unit='PEN_THOUSAND'
                else: unit='TIMES' if 'VECES' in norm(label) else 'PEN_THOUSAND' if 'MILES' in norm(label) else 'PERCENT'
                add(p,bank,label,v,unit,sn,r,c,label_period(label,p['date']))
        return
    raise ValueError(f'{code}: missing exact BanBif column')


def extract_rows(sheets,p,code):
    """B-2340 / B-2368 / B-2402: only the labelled bank row is read."""
    for sn,s in sheets.items():
        d=s['data'];hits=[(r,c) for (r,c),v in d.items() if entity(v)=='banbif']
        if not hits:continue
        br,bc=hits[0]
        header_rows=[r for (r,c),v in d.items() if r<br and c>bc and isinstance(v,str) and text(v)]
        if not header_rows:raise ValueError('Missing metric headers')
        # Explicit header rows prevent data from an earlier bank becoming a header.
        if code=='B-2340':
            hr=next((r for (r,c),v in d.items() if r<br and 'ACTIVOS LIQUIDOS' in norm(v)),None)
        elif code=='B-2368':
            hr=next((r for (r,c),v in d.items() if r<br and 'POSICION DE CAMBIO' in norm(v)),None)
        else:
            hr=next((r for (r,c),v in d.items() if r<br and ('POR RIESGO DE CREDITO' in norm(v) or norm(v)=='DE CREDITO')),None)
        if hr is None:raise ValueError(f'{code}: unknown header structure')
        cols=[c for (r,c),v in d.items() if r==hr and c>bc and text(v)]
        capital_labels={}
        if code=='B-2402':
            old='GLOBAL' in norm(d.get((8,11))) and 'DE CREDITO' in norm(d.get((9,2)))
            earliest='GLOBAL' in norm(d.get((8,7))) and 'DE CREDITO' in norm(d.get((9,2)))
            modern='CAPITAL GLOBAL' in norm(d.get((8,13)))
            if not (old or modern or earliest):raise ValueError('B-2402 unknown capital layout')
            capital_labels={2:'Requerimiento de patrimonio efectivo | Riesgo de crédito',3:'Requerimiento de patrimonio efectivo | Riesgo de mercado',4:'Requerimiento de patrimonio efectivo | Riesgo operacional',6:'APR | Riesgo de crédito',7:'APR | Riesgo de mercado',8:'APR | Riesgo operacional',9:'Activos y contingentes ponderados por riesgo totales (APR)'}
            if earliest:capital_labels={2:'Requerimiento de patrimonio efectivo | Riesgo de crédito',3:'Requerimiento de patrimonio efectivo | Riesgo de mercado',4:'Requerimiento de patrimonio efectivo | Riesgo operacional',5:'Requerimiento de patrimonio efectivo | Total',6:'Patrimonio efectivo total',7:'Ratio de capital global'}
            elif old:capital_labels.update({5:'Requerimiento de patrimonio efectivo | Total',10:'Patrimonio efectivo total',11:'Ratio de capital global'})
            else:capital_labels.update({11:'Capital ordinario de nivel 1 / APR',12:'Patrimonio efectivo de nivel 1 / APR',13:'Ratio de capital global'})
            cols=sorted(capital_labels)
        for r in range(hr+1,s['max_row']+1):
            name=text(d.get((r,bc)))
            if not name or not any(number(d.get((r,c))) for c in cols):continue
            if norm(name).startswith(('FUENTE','NOTA','*','1/','2/')):continue
            bank=entity(name);p['entity_names'][bank]=name
            for c in cols:
                label=capital_labels.get(c) or text(d[(hr,c)]);unit='PEN_THOUSAND'
                if code=='B-2340':
                    group=next((text(d.get((hr-1,k))) for k in range(c,bc,-1) if text(d.get((hr-1,k)))), '')
                    currency='ME' if 'EXTRANJERA' in norm(group) else 'MN'
                    label=f'{label} · {currency}'
                    unit='PERCENT' if 'RATIO' in norm(label) else 'USD_THOUSAND' if currency=='ME' else 'PEN_THOUSAND'
                if code=='B-2402':
                    unit='PERCENT' if '/ APR' in norm(label) or 'CAPITAL GLOBAL' in norm(label) else 'PEN_THOUSAND'
                v=d.get((r,c))
                # SBS uses a dash in this monetary position report for nil amounts.
                if code=='B-2368' and v=='-':v=0.0
                add(p,bank,label,v,unit,sn,r,c)
        return
    raise ValueError(f'{code}: missing exact BanBif row')


def extract_dedicated(sheets,p,code):
    for sn,s in sheets.items():
        bank=entity(sn);d=s['data'];p['entity_names'][bank]=sn
        if code=='B-230809':
            header=next((r for (r,c),v in d.items() if 'IMPORTE BASE' in norm(v)),None)
            if not header:raise ValueError('RCL missing amount header')
            cols=sorted(c for (r,c),v in d.items() if r==header and ('IMPORTE' in norm(v)))
            if len(cols)!=6:raise ValueError('RCL requires 3 currency blocks with base/adjusted values')
            caption=text(d.get((3,2)));effective=p['date']
            months={'ENERO':1,'FEBRERO':2,'MARZO':3,'ABRIL':4,'MAYO':5,'JUNIO':6,'JULIO':7,'AGOSTO':8,'SETIEMBRE':9,'SEPTIEMBRE':9,'OCTUBRE':10,'NOVIEMBRE':11,'DICIEMBRE':12}
            m=re.search(r' A (\w+) DE (\d{4})',norm(caption))
            if m and m[1] in months:effective=end_month(int(m[2]),months[m[1]])
            if bank=='banbif':
                p['source_caption']=caption
                if effective!=p['date']:p['period_warning']='El trimestre del encabezado difiere del periodo del archivo SBS; confirmar con la fuente.'
            for r in range(header+1,s['max_row']+1):
                label=text(d.get((r,3)))
                if not label:continue
                for i,c in enumerate(cols):
                    cur=['MN','ME','Total'][i//2];kind='Base' if i%2==0 else 'Ajustado'
                    ratio='RATIO DE COBERTURA' in norm(label)
                    if ratio and i%2==0:continue
                    unit='PERCENT' if ratio else 'USD_THOUSAND' if cur=='ME' else 'PEN_THOUSAND'
                    lab=f'{label} · {cur}' if ratio else f'{label} · {cur} · {kind}'
                    add(p,bank,lab,d.get((r,c)),unit,sn,r,c,effective)
        else:
            header=next((r for (r,c),v in d.items() if 'VALOR PONDERADO' in norm(v)),None)
            if not header:raise ValueError('RFNE missing weighted header')
            weighted=next(c for (r,c),v in d.items() if r==header and 'VALOR PONDERADO' in norm(v))
            group='';available=required=ratio=None
            for r in range(header+2,s['max_row']+1):
                label=text(d.get((r,3)))
                if not label:continue
                if not any(number(d.get((r,c))) for c in range(4,weighted+1)):
                    if norm(label) in ('FINANCIACION ESTABLE DISPONIBLE','FINANCIACION ESTABLE REQUERIDA','RESUMEN'):group=label
                    continue
                for c in range(4,weighted+1):
                    v=d.get((r,c))
                    isratio='RATIO DE FINANCIACION NETA ESTABLE' in norm(label)
                    qualifier='Ponderado' if c==weighted else text(d.get((header+1,c)))
                    if not qualifier:raise ValueError('RFNE missing maturity header')
                    item=d.get((r,2))
                    item=f'{item:g}' if number(item) else str(item or '')
                    lab=label if isratio or norm(label).startswith('TOTAL FINANCIACION') else f'{group} | {item} {label} · {qualifier}'
                    if isratio and number(v):ratio=v;v*=100
                    if norm(label)=='TOTAL FINANCIACION ESTABLE DISPONIBLE':available=v
                    if norm(label)=='TOTAL FINANCIACION ESTABLE REQUERIDA':required=v
                    add(p,bank,lab,v,'PERCENT' if isratio else 'PEN_THOUSAND',sn,r,c)
            if bank=='banbif' and not (available and required and ratio and abs(available/required-ratio)<1e-6):
                raise ValueError('RFNE ratio does not reconcile with available/required funding')


def extract(raw,url,code,workbook,date):
    p=period_base(url,date,raw);sheets=workbook(raw)
    validate_header_date(sheets,date,code)
    if code in ('B-2401','B-2336'):extract_columns(sheets,p,code)
    elif code in ('B-2340','B-2402','B-2368'):extract_rows(sheets,p,code)
    elif code in ('B-230809','B-234021'):extract_dedicated(sheets,p,code)
    else:raise ValueError('Unsupported report '+code)
    if not p['banbif_metrics']:raise ValueError('No BanBif metrics extracted')
    return p


def extract_financial(raw, url, workbook, date):
    sheets=workbook(raw)
    validate_header_date(sheets,date,'B-2201')
    if '1' not in sheets or '2' not in sheets:
        raise ValueError('B-2201 requires separate balance and income sheets 1/2')
    p={'date':date,'source_url':url,'source_file':url.rsplit('/',1)[-1],
       'source_sha256':hashlib.sha256(raw).hexdigest(),'parser_version':'5.0','banbif':None,'peers':[]}
    d=sheets['1']['data']
    banks=[(c,text(v)) for (r,c),v in d.items() if r==6 and text(v) and norm(d.get((7,c)))=='MN']
    if not banks:raise ValueError('B-2201 missing MN/ME/TOTAL bank headers')
    for bc,name in sorted(banks):
        bank=entity(name);statements={}
        for sn,st in [('1','balance'),('2','income')]:
            s=sheets[sn];dd=s['data']
            if entity(dd.get((6,bc)))!=bank:raise ValueError('B-2201 bank column differs between statements')
            if [norm(dd.get((7,bc+i))) for i in range(3)]!=['MN','ME','TOTAL']:
                raise ValueError('B-2201 changed currency headers')
            # Locate the repeated LABEL column by its header, not a 12-column formula.
            labels=[c for (r,c),v in dd.items() if r==6 and c<bc and
                    (norm(v)=='ACTIVO' if st=='balance' else norm(v) in ('INGRESOS Y GASTOS','INGRESOS Y EGRESOS'))]
            # Income label columns match the balance's repeated label columns.
            if not labels:labels=[c for (r,c),v in d.items() if r==6 and c<bc and norm(v)=='ACTIVO']
            if not labels:raise ValueError('B-2201 missing statement label column')
            lc=max(labels);rows=[]
            for r in range(9,s['max_row']+1):
                label=dd.get((r,lc));v=dd.get((r,bc+2))
                if not isinstance(label,str) or not number(v) or norm(label).startswith(('TIPO DE CAMBIO','1/','NOTA','FUENTE')):continue
                rows.append({'row':r,'label':text(label),'indent':min(4,max(0,len(label)-len(label.lstrip()))//2),
                             'mn':dd.get((r,bc)) if number(dd.get((r,bc))) else None,
                             'me':dd.get((r,bc+1)) if number(dd.get((r,bc+1))) else None,'total':float(v)})
            statements[st]=rows
        def val(st,label):
            matches=[r['total'] for r in statements[st] if norm(r['label'])==norm(label)]
            return matches[0] if len(matches)==1 else None
        # Provisions must be in the credit block, never the largest same-name balance row.
        b=statements['balance'];credit=False;provisions=None
        for r in b:
            if norm(r['label']).startswith('CREDITOS NETOS'):credit=True
            elif credit and norm(r['label'])=='PROVISIONES':provisions=abs(r['total']);break
        components=[val('balance',x) for x in ('Vigentes','Refinanciados y Reestructurados','Atrasados')]
        summary={'name':name,'slug':bank,'total_assets':val('balance','TOTAL ACTIVO'),
                 'gross_credits':sum(components) if all(v is not None for v in components) else None,
                 'public_deposits':next((r['total'] for r in b if r['label']=='OBLIGACIONES CON EL PÚBLICO'),None),
                 'equity':val('balance','PATRIMONIO'),'overdue':val('balance','Atrasados'),
                 'refinanced':val('balance','Refinanciados y Reestructurados'),'provisions':provisions,
                 'net_income':val('income','RESULTADO NETO DEL EJERCICIO'),
                 'financial_income':val('income','INGRESOS FINANCIEROS'),'admin_expenses':val('income','GASTOS ADMINISTRATIVOS')}
        if summary['total_assets'] is None:raise ValueError('B-2201 missing total assets: '+name)
        p['peers'].append(summary)
        if bank=='banbif':p['banbif']=statements
    if not p['banbif']:raise ValueError('B-2201 missing BanBif')
    return p
