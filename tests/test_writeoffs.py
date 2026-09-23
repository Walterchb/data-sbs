import sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from strict_parsers import extract
from sbs_workbook import workbook
class WriteoffTests(unittest.TestCase):
 def test_monthly_flow_keeps_reported_corrections_and_exact_scope(self):
  raw=(ROOT/'tests/fixtures/B-2369-2026-07.xls').read_bytes()
  p=extract(raw,'https://intranet2.sbs.gob.pe/B-2369-jl2026.XLS','B-2369',workbook,'2026-07-31')
  self.assertEqual(p['banbif_metrics']['Pequeñas empresas'],-.388)
  self.assertIn('system_foreign',p['peer_metrics']);self.assertNotIn('system',p['peer_metrics'])
  self.assertIn('interbank_foreign',p['peer_metrics']);self.assertNotIn('interbank',p['peer_metrics'])
  self.assertAlmostEqual(sum(v for k,v in p['banbif_metrics'].items() if k!='Castigos del mes'),p['banbif_metrics']['Castigos del mes'])
  self.assertEqual(p['metric_meta']['Castigos del mes']['unit'],'PEN_THOUSAND')
  with self.assertRaisesRegex(ValueError,'caption'):
   extract(raw,'https://intranet2.sbs.gob.pe/B-2369-jn2026.XLS','B-2369',workbook,'2026-06-30')
