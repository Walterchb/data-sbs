"""B-2349/B-2350: regional percentage structure, with a separate PEN total."""
import math
from strict_parsers import norm, text, entity, number, add


def extract_regions(sheets, period, code):
    expected = 'CREDITOS DIRECTOS' if code == 'B-2349' else 'DEPOSITOS'
    for sheet, data in sheets.items():
        cells = data['data']
        title = ' '.join(text(v) for (r, _), v in cells.items() if r <= 4)
        if expected not in norm(title) or 'DEPARTAMENTO' not in norm(title):
            continue
        if 'PORCENTAJE' not in norm(title):
            raise ValueError(f'{code}: expected percentage structure')
        header = next((r for (r,c),v in cells.items() if c == 1 and norm(v) == 'EMPRESAS'), None)
        if header is None:
            raise ValueError(f'{code}: missing Empresas header')
        columns = sorted((c,text(v)) for (r,c),v in cells.items() if r == header and c > 1 and text(v))
        totals = [(c,label) for c,label in columns if norm(label).startswith('TOTAL') and 'MILES DE SOLES' in norm(label)]
        regions = [(c,label) for c,label in columns if not norm(label).startswith('TOTAL')]
        if len(totals) != 1 or len(regions) < 25 or 'LIMA' not in [norm(label) for _,label in regions]:
            raise ValueError(f'{code}: unexpected region/total columns')
        total_col = totals[0][0]
        has_exterior = any('EXTERIOR' in norm(label) for _,label in regions)
        for row in range(header+1,data['max_row']+1):
            name = text(cells.get((row,1)))
            total = cells.get((row,total_col))
            if not name or not number(total):
                continue
            if total < 0 or not math.isfinite(total):
                raise ValueError(f'{code}: invalid total {name}')
            bank = entity(name)
            # The official total includes the separately published foreign branches.
            if bank == 'system' and has_exterior:
                bank = 'system_foreign'
            if bank in period['entity_names']:
                raise ValueError(f'{code}: duplicate bank {bank}')
            period['entity_names'][bank] = name
            shares = [cells.get((row,c)) for c,_ in regions]
            if total == 0 and all(v in (None, '', '-', '—') for v in shares):
                add(period,bank,'Total del reporte regional',total,'PEN_THOUSAND',sheet,row,total_col)
                continue
            if any(not number(v) or not math.isfinite(v) or v < 0 or v > 100 for v in shares):
                raise ValueError(f'{code}: missing or invalid region percentage {name}')
            if abs(sum(shares) - (100 if total > 0 else 0)) > .1:
                raise ValueError(f'{code}: regional percentages do not reconcile {name}')
            for (col,label),value in zip(regions,shares):
                add(period,bank,label,value,'PERCENT',sheet,row,col)
            add(period,bank,'Total del reporte regional',total,'PEN_THOUSAND',sheet,row,total_col)
        if 'banbif' not in period['entity_names'] or not any(b.startswith('system') for b in period['entity_names']):
            raise ValueError(f'{code}: missing BanBif or official system')
        system = next(b for b in period['peer_metrics'] if b.startswith('system'))
        system_values = period['peer_metrics'][system]
        banks = [v for b,v in period['peer_metrics'].items() if not b.startswith('system')]
        total_key = 'Total del reporte regional'
        if abs(sum(v[total_key] for v in banks)-system_values[total_key]) > max(1,system_values[total_key]*1e-6):
            raise ValueError(f'{code}: bank totals do not reconcile')
        for _,label in regions:
            amount = sum(v[total_key]*v[label]/100 for v in banks if v[total_key] > 0)
            official = system_values[total_key]*system_values[label]/100
            if abs(amount-official) > max(1,system_values[total_key]*1e-6):
                raise ValueError(f'{code}: regional system amount does not reconcile: {label}')
        return
    raise ValueError(f'{code}: missing regional worksheet')
