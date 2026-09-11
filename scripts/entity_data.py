"""Build independent entity bundles; all balances come from SBS bank columns.

Shared catalogs and peer summaries stay in financial.json. The browser downloads
only the chosen entity's statements and overview, never the raw multi-bank hub.
"""
from build_data import SCHEMA, normalize_financial, summary, finite


def compile_entities(raw, financial, reports, config):
    names={}
    for p in raw:
        for bank in p['peers']:names[bank['slug']]=bank['name']
    # Legacy snapshots used by parser/unit fixtures are still readable. Production
    # sync migrates every B-2201 period before publishing the selector.
    if not all(p.get('entity_statements') for p in raw):return {}
    result={}
    for slug,name in names.items():
        if slug=='banbif':continue
        periods=[];overview=[]
        for p,base in zip(raw,financial):
            statements=p['entity_statements'].get(slug)
            values={}
            if statements:
                f=normalize_financial({**p,'banbif':statements})
                values=f['values']
                for row in values.values():
                    mn,me,total=row
                    if finite(mn) and finite(me) and abs(mn+me-total)>max(.02,abs(total)*1e-6):
                        raise ValueError(f'{slug} {base["date"]}: MN + ME no reconcilia')
                a,l,e=(values[f'balance:{i}'][2] for i in (59,124,126))
                if abs(a-l-e)>max(.02,abs(a)*1e-6):raise ValueError(f'{slug}: balance no reconcilia')
            f={'date':base['date'],'source_url':base['source_url'],'values':values}
            periods.append(f)
            keys={k:{'value':v,'date':f['date'],'source':'B-2201'} for k,v in summary(f).items()} if statements else {}
            for code,r in reports.items():
                rp=next((x for x in reversed(r['periods']) if x['date']<=f['date']),None)
                if not rp:continue
                dates=rp.get('peer_effective',{}).get(slug,rp['effective'])
                for k,m in rp['keys'].items():
                    value=rp.get('peers',{}).get(slug,{}).get(m['id'])
                    effective=dates.get(m['id'],m['date'])
                    warning=rp.get('warning')
                    if code=='B-230809':warning='El trimestre declarado difiere del archivo SBS.' if effective!=rp['date'] else None
                    keys[k]={**m,'value':value,'date':effective,'file_date':rp['date'],'warning':warning}
            overview.append({'date':f['date'],'metrics':keys})
        result[slug]={'entity':slug,'name':name,'financial':periods,'overview':overview}
    result['banbif']={'entity':'banbif','name':'BanBif','financial':[], 'overview':[]}
    return result
