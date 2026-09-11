"""Exact bank rows and validated components for B-2334 / B-2344."""
from strict_parsers import add, entity, norm, number, text

CREDIT_TYPES={2:'Corporativos',6:'Grandes empresas',10:'Medianas empresas',14:'Pequeñas empresas',18:'Microempresas',22:'Consumo revolvente',25:'Consumo no revolvente',29:'Hipotecarios'}
DEPOSITS={2:'Vista',3:'Ahorro',4:'Plazo',5:'Restringidos',6:'Público',7:'Sistema financiero'}
STATUSES=['Vigentes','Refinanciados y reestructurados','Atrasados']

def extract_structure(sheets,p,code):
    sn,s=next(iter(sheets.items()));d=s['data']
    if code=='B-2334':
        expected={2:'CORPORATIVO',6:'GRANDES EMPRESAS',10:'MEDIANAS EMPRESAS',14:'PEQUENAS EMPRESAS',18:'MICROEMPRESAS',22:'CONSUMO',29:'HIPOTECARIOS PARA VIVIENDA'}
        if any(norm(d.get((6,c))).rstrip('*').strip()!=v for c,v in expected.items()) or not norm(d.get((6,33))).startswith('TOTAL CREDITOS DIRECTOS'):
            raise ValueError('B-2334: unexpected type headers')
        for c in CREDIT_TYPES:
            if [norm(d.get((8,c+i))) for i in range(3)]!=['VIGENTES','REFINANC. Y REESTRUCT.','ATRASADOS']:
                raise ValueError('B-2334: unexpected situation headers')
        totalcol=33
    else:
        if not norm(d.get((6,8))).startswith('DEPOSITOS TOTALES') or [norm(d.get((7,c))) for c in range(2,7)]!=['VISTA','AHORROS','PLAZO','RESTRINGIDOS 1/','TOTAL']:
            raise ValueError('B-2344: unexpected deposit headers')
        totalcol=8
    rows=[r for r in range(10,s['max_row']+1) if text(d.get((r,1))) and number(d.get((r,totalcol)))]
    has_foreign=any(entity(d[(r,1)])=='bcp_foreign' for r in rows)
    totals={}
    for r in rows:
        name=text(d[(r,1)]);bank=entity(name)
        if bank=='system' and has_foreign:bank='system_foreign'
        if bank in p['entity_names']:raise ValueError('Duplicate entity '+bank)
        p['entity_names'][bank]=name
        def value(c):
            v=d.get((r,c))
            # SBS prints a dash for nil balances/shares; blanks are not imputed.
            if v=='-':return 0.0
            if not number(v):raise ValueError(f'{code} {bank}: missing numeric cell {r},{c}')
            return float(v)
        total=value(totalcol);totals[bank]=total
        add(p,bank,'Total',total,'PEN_THOUSAND',sn,r,totalcol)
        if code=='B-2334':
            sums={};allparts=[]
            for c,kind in CREDIT_TYPES.items():
                vals=[value(c+i) for i in range(3)];allparts.extend(vals);sums[kind]=vals
                for i,status in enumerate(STATUSES):add(p,bank,f'{kind} · {status}',vals[i],'PEN_THOUSAND',sn,r,c+i)
                add(p,bank,f'{kind} · Total',sum(vals),'PEN_THOUSAND',sn,r,c)
            if abs(sum(allparts)-total)>max(.05,abs(total)*1e-8):
                p.setdefault('peer_warnings',{})[bank]='La suma de los tipos de crédito difiere del total publicado por SBS en este archivo. Se conservan los valores originales, sin ajustar el residual.'
            combined=[sum(sums[k][i] for k in ('Consumo revolvente','Consumo no revolvente')) for i in range(3)]
            for i,status in enumerate(STATUSES):
                add(p,bank,f'Consumo · {status}',combined[i],'PEN_THOUSAND',sn,r,22)
                add(p,bank,f'Total · {status}',sum(v[i] for v in sums.values()),'PEN_THOUSAND',sn,r,33)
            add(p,bank,'Consumo · Total',sum(combined),'PEN_THOUSAND',sn,r,22)
        else:
            shares={c:value(c) for c in DEPOSITS}
            if abs(sum(shares[c] for c in (2,3,4,5))-shares[6])>1e-5 or abs(shares[6]+shares[7]-(100 if total else 0))>1e-5:
                raise ValueError(f'{code} {bank}: percentages do not reconcile')
            for c,label in DEPOSITS.items():
                add(p,bank,f'{label} · Participación',shares[c],'PERCENT',sn,r,c)
                add(p,bank,f'{label} · Monto',total*shares[c]/100,'PEN_THOUSAND',sn,r,c)
    system='system_foreign' if has_foreign else 'system'
    if system not in totals or 'banbif' not in totals:raise ValueError('Missing system or BanBif')
    if abs(sum(v for k,v in totals.items() if k!=system)-totals[system])>max(.1,abs(totals[system])*1e-8):
        raise ValueError('System total does not reconcile with bank rows')
    p['structure_notes']=[text(v) for (r,c),v in d.items() if c==1 and isinstance(v,str) and (v.startswith('*') or v.startswith('1/'))]
