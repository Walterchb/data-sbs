import copy
from datetime import date
import json
from pathlib import Path
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from strict_parsers import extract,extract_financial,entity
from sbs_workbook import parse_number_text,workbook,url_date
from build_data import build,inspect,normalize_financial,summary


def fixture(code):
    raw=(ROOT/'tests/fixtures'/f'{code}.json').read_bytes();j=json.loads(raw)
    return {k:{**v,'data':{(r,c):x for r,c,x in v['data']}} for k,v in j.items()}

def parse(code):
    period='2026-07-31' if code in ['B-2201','B-2401','B-2336','B-234021'] else '2026-06-30'
    w=fixture(code)
    return extract_financial(b'fixture','fixture',lambda _:w,period) if code=='B-2201' else extract(b'fixture','fixture',code,lambda _:w,period)

class ParserTests(unittest.TestCase):
    def test_indicator_entity_boundaries(self):
        p=parse('B-2401');label='Utilidad Neta Anualizada / Patrimonio Promedio'
        self.assertAlmostEqual(p['banbif_metrics'][label],13.996537093213156)
        self.assertNotEqual(p['banbif_metrics'][label],p['peer_metrics']['bcp_foreign'][label])
        self.assertEqual(len(p['banbif_metrics']),22)
        self.assertEqual(p['banbif_metrics']['Ratio de Liquidez ME (Promedio de saldos del mes)'],48.39)
    def test_sparse_fx_bank_row(self):
        p=parse('B-2368');self.assertAlmostEqual(p['banbif_metrics']['Posición Global en M.E. (a)+(b)+(c)'],10226.93692)
        self.assertEqual(p['banbif_metrics']['Delta de las Posiciones Netas en Opciones sobre M. E. (c)'],0)
    def test_rfne_scale_and_no_serial_dates(self):
        p=parse('B-234021');self.assertAlmostEqual(p['banbif_metrics']['RATIO DE FINANCIACIÓN NETA ESTABLE (%)'],105.01729878270626)
        self.assertNotIn('Ratio de Financiación Neta Estable',p['banbif_metrics'])
        self.assertTrue(all(not label.startswith('Fuente:') for label in p['banbif_metrics']))
    def test_rfne_reconciliation_is_required(self):
        w=fixture('B-234021');w['B. Interamericano de Finanzas']['data'][(55,8)]=46234
        with self.assertRaisesRegex(ValueError,'does not reconcile'):extract(b'fixture','fixture','B-234021',lambda _:w,'2026-07-31')
    def test_rcl_preserves_period_conflict(self):
        p=parse('B-230809');self.assertIn('period_warning',p)
        label='RATIO DE COBERTURA DE LIQUIDEZ (%) (2) · Total'
        self.assertAlmostEqual(p['banbif_metrics'][label],140.8531746031747)
        self.assertEqual(p['metric_meta'][label]['effective_date'],'2026-03-31')
    def test_units_liquidity(self):
        p=parse('B-2340');units={k:v['unit'] for k,v in p['metric_meta'].items()}
        self.assertEqual(sum(v=='USD_THOUSAND' for v in units.values()),2)
        self.assertEqual(sum(v=='PERCENT' for v in units.values()),2)
    def test_financial_tail_banks_and_system(self):
        p=parse('B-2201');b={b['slug']:b for b in p['peers']}
        self.assertAlmostEqual(b['system']['total_assets'],604336732.035)
        self.assertAlmostEqual(b['efectiva']['total_assets'],2213993.352)
        self.assertTrue(all(v['total_assets'] is not None for v in b.values()))
        self.assertAlmostEqual(summary(normalize_financial(p))['coverage'],191.31,places=2)
    def test_capital_apr_is_amount(self):
        p=parse('B-2402');self.assertEqual(p['metric_meta']['Activos y contingentes ponderados por riesgo totales (APR)']['unit'],'PEN_THOUSAND')
        self.assertEqual(p['metric_meta']['Ratio de capital global']['unit'],'PERCENT')
    def test_all_source_parsers(self):
        for c in ['B-2201','B-2401','B-2336','B-2402','B-2340','B-2368','B-230809','B-234021']:
            with self.subTest(code=c):self.assertTrue(parse(c))
    def test_date_mismatch_fails(self):
        with self.assertRaisesRegex(ValueError,'differs from URL'):extract(b'fixture','fixture','B-2401',lambda _:fixture('B-2401'),'2025-07-31')
    def test_no_cross_entity_fallback(self):
        w=fixture('B-2401');w['3']['data'][(6,6)]='Banco desconocido'
        with self.assertRaisesRegex(ValueError,'missing exact'):extract(b'x','fixture','B-2401',lambda _:w,'2026-07-31')
    def test_entity_notes_do_not_change_identity(self):
        self.assertEqual(entity('Alfin Banco* 2/'),entity('Alfin Banco* 1/'))
        self.assertEqual(entity('B. de Comercio'),'bancom')
    def test_numeric_locale(self):
        self.assertEqual(parse_number_text('1,234.50'),1234.5)
        self.assertEqual(parse_number_text('(2,125.75)'),-2125.75)
        self.assertEqual(parse_number_text('12,50'),12.5)
        self.assertEqual(parse_number_text('1.234,56'),1234.56)
        self.assertIsNone(parse_number_text('N/D'))

class HealthTests(unittest.TestCase):
    def test_missing_duplicate_empty_and_stale(self):
        p=parse('B-2401');q=copy.deepcopy(p);q['date']='2026-05-31'
        h=inspect('B-2401',[q,p,p],date(2027,1,1))
        self.assertTrue(any('duplicados' in e for e in h['errors']))
        self.assertIn('2026-06',h['missing_periods'])
        self.assertTrue(any('desactualizada' in w for w in h['warnings']))
        self.assertEqual(inspect('B-2401',[],date.today())['status'],'ERROR')
    def test_wrong_statement_schema_fails(self):
        p=parse('B-2201');p['banbif']['balance'][0]['label']='NUEVO FORMATO'
        with self.assertRaises(ValueError):normalize_financial(p)
    def test_nonfinite_and_currency_mismatch(self):
        p=parse('B-2201');p['banbif']['balance'][0]['total']=float('inf')
        self.assertTrue(inspect('B-2201',[p],date.today())['errors'])
        p=parse('B-2201');p['banbif']['balance'][0]['mn']+=10000
        self.assertTrue(inspect('B-2201',[p],date.today())['errors'])
    def test_build_idempotent_and_fails_without_replacing_data(self):
        db=json.loads((ROOT/'data/hub.json').read_text())
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp);result=build(db,out,date(2026,9,7));self.assertEqual(result['errors'],0)
            before={str(f.relative_to(out)):f.read_bytes() for f in out.rglob('*.json')}
            build(db,out,date(2026,9,7));self.assertEqual(before,{str(f.relative_to(out)):f.read_bytes() for f in out.rglob('*.json')})
            db['financial']['periods'][-1]['banbif']['balance'][0]['label']='INVALID'
            bad=build(db,out,date(2026,9,7));self.assertGreater(bad['errors'],0)
            self.assertEqual((out/'overview.json').read_bytes(),before['overview.json'])

if __name__=='__main__':unittest.main()
