import sys, unittest, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from strict_parsers import extract
from sbs_workbook import workbook
class GuaranteesTests(unittest.TestCase):
 def test_published_shares_scope_and_corrections(self):
  raw=(ROOT/'tests/fixtures/B-2366-2026-07.xls').read_bytes()
  p=extract(raw,'https://intranet2.sbs.gob.pe/B-2366-jl2026.XLS','B-2366',workbook,'2026-07-31')
  b=p['banbif_metrics'];self.assertAlmostEqual(b['Total créditos directos'],15692393.887)
  self.assertAlmostEqual(b['Garantías preferidas · Total'],28.436910716960774)
  self.assertNotIn('system',p['peer_metrics']);self.assertIn('system_foreign',p['peer_metrics']);self.assertNotIn('bcp',p['peer_metrics'])
  f=next(v for k,v in p['peer_metrics'].items() if 'falabella' in k)
  self.assertLess(f['Garantías preferidas · Primera hipoteca sobre inmuebles'],0)
  self.assertEqual(p['metric_meta']['Total créditos directos']['unit'],'PEN_THOUSAND')
  self.assertEqual(p['metric_meta']['Créditos sin garantías']['unit'],'PERCENT')
  for alter in ('header','value','scope'):
   sheets=workbook(raw);s=next(iter(sheets.values()))['data']
   if alter=='header':s[(6,9)]='Changed'
   elif alter=='value':s[(13,10)]+=1
   else:s[(11,1)]='B. Interamericano de Finanzas'
   with self.assertRaises(ValueError):extract(raw,'source','B-2366',lambda _:sheets,'2026-07-31')
  with self.assertRaisesRegex(ValueError,'date'):extract(raw,'source','B-2366',workbook,'2026-06-30')
 def test_all_months_reconcile_with_independent_financial_credit_totals(self):
  report=json.loads((ROOT/'data/reports/B-2366.json').read_text());fin=json.loads((ROOT/'data/financial.json').read_text());by_date={p['date']:p for p in fin['periods']}
  total=next(r['id'] for r in report['catalog'] if r['label']=='Total créditos directos')
  self.assertEqual(len(report['periods']),67)
  for p in report['periods']:
   v=by_date[p['date']]['values'];credit=sum(v['balance:'+str(n)][2] for n in (26,37,38))
   self.assertAlmostEqual(credit,p['values'][total],delta=.1,msg=p['date'])
