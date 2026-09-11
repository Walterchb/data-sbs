"""Bootstrap new sources without replacing any existing hub history."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def with_supplemental_reports(db):
    reports = dict(db.get('reports', {}))
    for code in ('B-2334', 'B-2344'):
        # An existing source, even an empty one, remains authoritative.
        if code in reports:
            continue
        path = ROOT / 'data/supplemental' / f'{code}.json'
        if not path.exists():
            continue
        source = json.loads(path.read_text(encoding='utf-8'))
        if source.get('code') != code or not isinstance(source.get('periods'), list):
            raise ValueError('Invalid supplemental source: ' + code)
        reports[code] = source
    return {**db, 'reports': reports}
