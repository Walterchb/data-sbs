import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from strict_parsers import extract
from sbs_workbook import workbook
ROOT=Path(__file__).parent/'fixtures'

class RegionalReports(unittest.TestCase):
    def parsed(self, code, transform=None):
        raw=(ROOT/(code+'-2026-06.xls')).read_bytes()
        sheets=workbook(raw)
        if transform:transform(next(iter(sheets.values()))['data'])
        return extract(raw,'https://intranet2.sbs.gob.pe/'+code+'.XLS',code,lambda _:sheets,'2026-06-30')

    def test_official_regions_totals_and_units(self):
        for code,lima,total in [('B-2349',95.94825872358818,15766471.115),('B-2350',88.02064189451198,15926993.126)]:
            p=self.parsed(code)
            self.assertAlmostEqual(p['banbif_metrics']['Lima'],lima)
            self.assertAlmostEqual(p['banbif_metrics']['Total del reporte regional'],total)
            self.assertEqual(p['metric_meta']['Lima']['unit'],'PERCENT')
            self.assertEqual(p['metric_meta']['Total del reporte regional']['unit'],'PEN_THOUSAND')
            self.assertIn('system_foreign',p['peer_metrics'])
            self.assertNotIn('system',p['peer_metrics'])
            self.assertEqual(len(p['banbif_metrics']),27)

    def test_blanks_are_not_filled_from_another_bank(self):
        with self.assertRaisesRegex(ValueError,'missing or invalid'):
            self.parsed('B-2349',lambda d:d.update({(13,16):None}))
        def zero_bank(d):
            d[(24,28)]=0
            # Preserve the system reconciliation by removing this bank's prior amount.
            total=d[(29,28)]-233130.8
            for col in range(2,28):
                amount=d[(29,col)]*d[(29,28)]/100 - (233130.8 if col==16 else 0)
                d[(29,col)]=amount/total*100
                d[(24,col)]='-'
            d[(29,28)]=total
        p=self.parsed('B-2349',zero_bank)
        self.assertNotIn('Lima',p['peer_metrics']['bank-of-china'])
        self.assertEqual(p['peer_metrics']['bank-of-china']['Total del reporte regional'],0)

    def test_rejects_wrong_unit_date_and_inconsistent_structure(self):
        for update, error in [({(4,1):'(En miles de soles)'},'percentage'),({(13,16):90},'percentages do not reconcile'),({(3,1):46173},'differs from URL')]:
            with self.assertRaisesRegex(ValueError,error):self.parsed('B-2350',lambda d:d.update(update))

if __name__=='__main__':unittest.main()
