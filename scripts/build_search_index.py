"""Lightweight navigation metadata only; no entity financial observations."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def build_search_index():
    reports = {}
    for path in sorted((ROOT / 'data/reports').glob('*.json')):
        report = json.loads(path.read_text())
        code = report.get('code', path.stem)
        catalog = report.get('catalog', [])
        if code == 'B-2344':
            catalog = [r for r in catalog if r['label'] == 'Total' or r['label'].endswith(' · Monto')]
        if code in ('B-2349','B-2350'):
            catalog = [r for r in catalog if r['label'] not in ('Total', 'TOTAL')]
        reports[code] = {'title': report.get('title', code), 'catalog': catalog}
    (ROOT / 'assets/search-index.json').write_text(json.dumps({'schema_version': 1, 'reports': reports}, ensure_ascii=False, separators=(',', ':')))
if __name__ == '__main__':
    build_search_index()
