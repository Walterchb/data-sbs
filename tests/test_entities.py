import json
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_data import summary

class EntityDataTests(unittest.TestCase):
    def test_all_entity_statements_match_official_peer_totals(self):
        manifest=json.loads((ROOT/'data/manifest.json').read_text())
        base=json.loads((ROOT/'data/financial.json').read_text())
        peers={p['date']:{b['slug']:b for b in p['peers']} for p in base['periods']}
        self.assertGreater(len(manifest['entities']),20)
        for slug,meta in manifest['entities'].items():
            if slug=='banbif':continue
            bundle=json.loads((ROOT/'data'/meta['path']).read_text())
            for p in bundle['financial']:
                bank=peers[p['date']].get(slug)
                self.assertEqual(bool(p['values']),bank is not None)
                if not bank:continue
                calculated=summary(p)
                for key,source in [('assets','total_assets'),('credits','gross_credits'),('net_income','net_income'),('equity','equity'),('provisions','provisions')]:
                    self.assertAlmostEqual(calculated[key],bank[source],places=3,msg=f'{slug} {p["date"]} {key}')

if __name__=='__main__':unittest.main()
