"""B-2366: published credit shares, not collateral valuations."""
from strict_parsers import add, entity, norm, number, text

LABELS={2:'Garantías preferidas · Autoliquidables',3:'Garantías preferidas · De muy rápida realización',4:'Garantías preferidas · Primera hipoteca sobre inmuebles',5:'Garantías preferidas · Otras garantías preferidas',6:'Garantías preferidas · Total',7:'Créditos con responsabilidad subsidiaria',8:'Créditos de arrendamiento financiero',9:'Créditos con garantías no preferidas',10:'Créditos sin garantías',11:'Total créditos directos'}

def extract_guarantees(sheets,p):
    sn,s=next(iter(sheets.items()));d=s['data']
    if 'CREDITOS DIRECTOS POR TIPO DE GARANTIA' not in norm(d.get((2,1))):raise ValueError('B-2366: unexpected title')
    if norm(d.get((4,1)))!='(EN PORCENTAJE)':raise ValueError('B-2366: unexpected share unit')
    if 'MILES DE SOLES' not in norm(d.get((6,11))):raise ValueError('B-2366: unexpected total unit')
    expected={2:'AUTOLIQUIDABLES',3:'DE MUY RAPIDA REALIZACION',4:'PRIMERA HIPOTECA SOBRE INMUEBLES',5:'OTRAS GARANTIAS PREFERIDAS',6:'TOTAL'}
    if any(norm(d.get((7,c)))!=label for c,label in expected.items()):raise ValueError('B-2366: preferred columns changed')
    if any(norm(d.get((6,c)))!=norm(LABELS[c]) for c in range(7,11)):raise ValueError('B-2366: credit columns changed')
    foreign=any('EXTERIOR' in norm(v) for (r,c),v in d.items() if c==1 and r>=9)
    totals={}
    for r in range(9,s['max_row']+1):
        name=text(d.get((r,1)));raw=d.get((r,11))
        if not name or norm(name).startswith(('FUENTE','NOTA','*')):continue
        if not number(raw) and raw!='-':continue
        bank=entity(name)
        if 'EXTERIOR' in norm(name) and not bank.endswith('_foreign'):bank+='_foreign'
        if bank=='system' and foreign:bank='system_foreign'
        if bank in totals:raise ValueError('B-2366: duplicate entity '+bank)
        p['entity_names'][bank]=name;vals={}
        for c,label in LABELS.items():
            value=d.get((r,c));value=0.0 if value=='-' else value
            if not number(value):raise ValueError(f'B-2366: missing numeric value at {r},{c}')
            vals[c]=value
            add(p,bank,label,value,'PEN_THOUSAND' if c==11 else 'PERCENT',sn,r,c)
        if vals[11]<0:raise ValueError('B-2366: negative credit total')
        if abs(sum(vals[c] for c in range(2,6))-vals[6])>.002:raise ValueError('B-2366: preferred subtotal does not reconcile')
        if vals[11]>0 and abs(sum(vals[c] for c in range(6,11))-100)>.002:raise ValueError('B-2366: shares do not reconcile')
        # Preserve occasional source corrections outside 0–100; never silently clip them.
        totals[bank]=vals
    system='system_foreign' if foreign else 'system'
    if 'banbif' not in totals or system not in totals:raise ValueError('B-2366: missing bank or system')
    total=totals[system][11]
    if abs(sum(v[11] for k,v in totals.items() if k!=system)-total)>max(.05,total*1e-8):raise ValueError('B-2366: credit totals do not reconcile')
    for c in range(2,11):
        weighted=sum(v[c]*v[11] for k,v in totals.items() if k!=system)/total if total else 0
        if abs(weighted-totals[system][c])>.002:raise ValueError('B-2366: weighted shares do not reconcile')
