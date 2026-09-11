import sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from strict_parsers import extract
from sbs_workbook import workbook
class StructureTests(unittest.TestCase):
 def read(self,code):
  raw=(ROOT/'tests/fixtures'/f'{code}-2026-07.xls').read_bytes()
  return extract(raw,'https://intranet2.sbs.gob.pe/'+code+'.XLS',code,workbook,'2026-07-31')
 def test_credit_components_scope_and_situations(self):
  p=self.read('B-2334');v=p['banbif_metrics']
  self.assertAlmostEqual(v['Total'],15692393.887,places=3)
  groups=['Corporativos','Grandes empresas','Medianas empresas','Pequeñas empresas','Microempresas','Consumo','Hipotecarios']
  self.assertAlmostEqual(sum(v[g+' · Total'] for g in groups),v['Total'],delta=.05)
  self.assertAlmostEqual(v['Consumo · Total'],v['Consumo revolvente · Total']+v['Consumo no revolvente · Total'])
  self.assertIn('system_foreign',p['peer_metrics']);self.assertNotIn('system',p['peer_metrics'])
 def test_deposit_unit_and_reconstructed_amounts(self):
  p=self.read('B-2344');v=p['banbif_metrics']
  self.assertAlmostEqual(v['Total'],16489585.034,places=3)
  kinds=['Vista','Ahorro','Plazo','Restringidos','Sistema financiero']
  self.assertAlmostEqual(sum(v[k+' · Monto'] for k in kinds),v['Total'],places=5)
  self.assertAlmostEqual(sum(v[k+' · Participación'] for k in kinds),100)
  self.assertEqual(p['metric_meta']['Total']['unit'],'PEN_THOUSAND')
  self.assertEqual(p['metric_meta']['Vista · Participación']['unit'],'PERCENT')
  self.assertEqual(p['peer_metrics']['falabella-peru']['Vista · Monto'],0)
