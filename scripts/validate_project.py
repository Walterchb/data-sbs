#!/usr/bin/env python3
"""Offline release gate: data, references, source-to-browser period parity, JS syntax."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.refs=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        for key in ('src','href'):
            if a.get(key,'').startswith('./'):self.refs.append(a[key])

def validate():
    errors=[];p=Page();p.feed((ROOT/'index.html').read_text())
    if len(p.ids)!=len(set(p.ids)):errors.append('Duplicate HTML IDs')
    for ref in p.refs:
        if not (ROOT/ref).is_file():errors.append('Missing HTML reference '+ref)
    for js in (ROOT/'assets/js').glob('*.js'):
        subprocess.run(['node','--check',str(js)],check=True,capture_output=True)
        for ref in re.findall(r"from ['\"]([^'\"]+)['\"]",js.read_text()):
            if ref.startswith('.') and not (js.parent/ref).is_file():errors.append('Missing JS import '+ref)
    data={str(f.relative_to(ROOT/'data')):json.loads(f.read_text()) for f in (ROOT/'data').rglob('*.json')}
    manifest=data['manifest.json'];health=data['data_health.json']
    if health['errors']:errors.append('Data health has errors')
    for key in ['overview','financial','health']:
        if manifest[key] not in data:errors.append('Missing manifest resource '+manifest[key])
    f=data['financial.json'];o=data['overview.json'];hub=data['hub.json']
    expected=[p['date'][:7] for p in hub['financial']['periods']]
    if expected!=[p['date'] for p in f['periods']] or expected!=[p['date'] for p in o['periods']]:errors.append('Financial periods lost before frontend')
    if manifest['latest_period']!=max(expected):errors.append('Manifest latest period mismatch')
    for code,path in manifest['reports'].items():
        r=data.get(path)
        if not r:errors.append('Missing report '+code);continue
        if [p['date'] for p in r['periods']]!=[p['date'][:7] for p in hub['reports'][code]['periods']]:errors.append('Report periods lost '+code)
        if r['version']!=manifest['version']:errors.append('Mixed output versions '+code)
        ids=[m['id'] for m in r['catalog']]
        if len(ids)!=len(set(ids)):errors.append('Duplicate report IDs '+code)
        for p in r['periods']:
            if not set(p['values']).issubset(ids):errors.append('Unknown report metric '+code)
    for dataset in [f,o]:
        if dataset['version']!=manifest['version']:errors.append('Mixed financial versions')
    for slug,meta in manifest.get('entities',{}).items():
        entity=data.get(meta['path'])
        if not entity or entity.get('entity')!=slug or entity.get('version')!=manifest['version']:
            errors.append('Missing or mixed entity '+slug);continue
        if slug=='banbif':continue
        if [p['date'] for p in entity['financial']]!=expected:errors.append('Entity periods lost '+slug)
        for p in entity['financial']:
            source=next(x for x in hub['financial']['periods'] if x['date'][:7]==p['date'])
            if bool(p['values'])!=bool(source.get('entity_statements',{}).get(slug)):errors.append('Entity availability mismatch '+slug)
    ids={r['id'] for r in f['catalog']}
    for r in f['catalog']:
        if r['parent'] and r['parent'] not in ids:errors.append('Orphan account '+r['id'])
        seen=set();parent=r['parent'];byid={r['id']:r for r in f['catalog']}
        while parent:
            if parent in seen:errors.append('Hierarchy cycle');break
            seen.add(parent);parent=byid[parent]['parent']
    if errors:raise ValueError('\n'.join(errors))
    print(f'RELEASE CHECK OK: {len(data)} JSON files; {len(expected)} financial periods; {len(manifest["reports"])} reports; imports and JS syntax valid.')

if __name__=='__main__':
    try:validate()
    except Exception as exc:print('RELEASE CHECK FAILED:',exc,file=sys.stderr);sys.exit(1)
