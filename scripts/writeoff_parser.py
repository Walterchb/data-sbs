"""B-2369 monthly write-off flows. Never use off-balance-sheet stocks as flows."""
import re
from strict_parsers import add, entity, norm, number, text

MONTHS=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
def extract_writeoffs(sheets,p):
    sn,s=next(iter(sheets.items()));d=s['data'];y,m=map(int,p['date'][:7].split('-'))
    caption=norm(d.get((3,1))).replace('SEPTIEMBRE','SETIEMBRE')
    if not re.search(r'\b'+MONTHS[m-1]+r'\s+DE\s+'+str(y)+r'\b',caption):raise ValueError('B-2369: monthly caption does not match URL')
    if norm(d.get((6,10)))!='TOTAL':raise ValueError('B-2369: unknown total column')
    labels={3:'Corporativos',4:'Grandes empresas',5:'Medianas empresas',6:'Pequeñas empresas',7:'Microempresas',8:'Consumo',9:'Hipotecarios',10:'Castigos del mes'}
    expected=['CORPORATIVOS','GRANDES EMPRESAS','MEDIANAS EMPRESAS','PEQUENAS EMPRESAS','MICROEMPRESAS','CONSUMO','HIPOTECARIOS']
    if [norm(d.get((7,c))) for c in range(3,10)]!=expected:raise ValueError('B-2369: type columns changed')
    totals={};foreign=any('EXTERIOR' in norm(v) for (r,c),v in d.items() if c==1 and r>=8)
    for r in range(8,s['max_row']+1):
        name=text(d.get((r,1)))
        if not name or norm(name).startswith(('FUENTE','*','NOTA')):continue
        raw=d.get((r,10))
        if not(number(raw) or raw=='-'):continue
        bank=entity(name)
        if 'EXTERIOR' in norm(name) and not bank.endswith('_foreign'):bank+='_foreign'
        if bank=='system' and foreign:bank='system_foreign'
        if bank in totals:raise ValueError('B-2369: duplicate entity '+bank)
        p['entity_names'][bank]=name;vals=[]
        for c,label in labels.items():
            value=d.get((r,c));value=0.0 if value=='-' else value
            if not number(value):raise ValueError(f'B-2369: invalid flow at {r},{c}')
            add(p,bank,label,float(value),'PEN_THOUSAND',sn,r,c);vals.append(value)
        if abs(sum(vals[:-1])-vals[-1])>max(.01,vals[-1]*1e-8):raise ValueError('B-2369: components do not reconcile')
        totals[bank]=vals[-1]
    system='system_foreign' if foreign else 'system'
    if 'banbif' not in totals or system not in totals:raise ValueError('B-2369: missing bank or total')
    if abs(sum(v for k,v in totals.items() if k!=system)-totals[system])>max(.05,totals[system]*1e-8):raise ValueError('B-2369: bank totals do not reconcile')
    p['source_caption']=text(d.get((3,1)))
