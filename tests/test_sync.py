"""Regression coverage for independently published SBS reports (no network)."""
import copy
from datetime import datetime, timezone, date
import gzip
import json
from pathlib import Path
from types import SimpleNamespace
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import sync_hub as sync
from build_data import build


class FixedClock:
    @staticmethod
    def now(tz):
        return datetime(2026,10,29,tzinfo=timezone.utc)


def period(d):
    return {'date':d,'parser_version':sync.VERSION,'entity_statements':{},'peer_meta':{}}


def database(sources):
    db={'meta':{},'financial':{'periods':[]},'reports':{}}
    for code,source in sources.items():
        p=period('2026-06-30' if source['frequency']=='quarterly' else '2026-08-31')
        if code=='B-2201':db['financial']['periods']=[p]
        else:db['reports'][code]={'periods':[p]}
    return db


class IndependentSyncTests(unittest.TestCase):
    def setUp(self):
        self.sources={k:{**v,'start_year':2026} for k,v in sync.SOURCES.items()}
        self.args=SimpleNamespace(reports=None,refresh_all=False,workers=2,
                                  cache_dir=Path('/unused'),offline=False)

    def run_sync(self,db,retrieve):
        with patch.object(sync,'SOURCES',self.sources),patch.object(sync,'datetime',FixedClock),patch.object(sync,'retrieve',side_effect=retrieve):
            return sync.synchronize(db,self.args)

    def test_each_late_source_preserves_history_and_catches_up_next_run(self):
        # Covers every configured source, including the balance and quarterly RCL.
        for late in self.sources:
            with self.subTest(source=late):
                db=database(self.sources)
                old=copy.deepcopy(db['financial'] if late=='B-2201' else db['reports'][late])
                def retrieve(code,d,*_):
                    if d=='2026-09-30' and code!=late:return period(d)
                    raise FileNotFoundError('Not published')
                self.assertFalse(self.run_sync(db,retrieve))
                self.assertEqual(db['financial'] if late=='B-2201' else {'periods':db['reports'][late]['periods']},old)
                self.assertIn('2026-09-30',db['meta']['source_health'][late]['unpublished_or_missing'])
                for code in self.sources:
                    if code!=late:self.assertEqual(db['meta']['source_health'][code]['latest'],'2026-09-30')
                calls=[]
                def recovered(code,d,*_):
                    calls.append((code,d))
                    if d=='2026-09-30':return period(d)
                    raise FileNotFoundError('Not published')
                self.assertFalse(self.run_sync(db,recovered))
                self.assertIn((late,'2026-09-30'),calls)
                self.assertEqual(db['meta']['source_health'][late]['latest'],'2026-09-30')
                self.assertNotIn('2026-09-30',db['meta']['source_health'][late]['unpublished_or_missing'])
                ps=db['financial']['periods'] if late=='B-2201' else db['reports'][late]['periods']
                self.assertEqual(sum(p['date']=='2026-09-30' for p in ps),1)

    def test_fetch_classifies_transport_failures_and_does_not_retry_denials(self):
        with patch.object(sync,'urlopen',side_effect=TimeoutError('timed out')) as open_url,patch.object(sync.time,'sleep'):
            with self.assertRaises(sync.DownloadError):sync.fetch('https://source.invalid')
            self.assertEqual(open_url.call_count,2)
        for status in (403,404):
            with self.subTest(status=status),patch.object(sync,'urlopen',side_effect=HTTPError('https://source.invalid',status,'Unavailable',{},None)) as open_url:
                with self.assertRaises(HTTPError):sync.fetch('https://source.invalid')
                self.assertEqual(open_url.call_count,1)

    def test_transport_outage_retains_valid_critical_data_without_freezing_others(self):
        for critical in ('B-2201','B-2401'):
            for error in (sync.DownloadError('timed out'),HTTPError('https://source.invalid',503,'Unavailable',{},None)):
                with self.subTest(source=critical,error=type(error).__name__):
                    db=database(self.sources)
                    def retrieve(code,d,*_):
                        if code==critical:raise error
                        if d=='2026-09-30':return period(d)
                        raise FileNotFoundError('Not published')
                    self.assertFalse(self.run_sync(db,retrieve))
                    h=db['meta']['source_health'][critical]
                    self.assertEqual(h['latest'],'2026-08-31')
                    self.assertEqual(h['status'],'partial')
                    self.assertTrue(h['errors'])
                    self.assertTrue(all(e['kind']=='unavailable' for e in h['error_samples']))
                    self.assertEqual(db['meta']['source_health']['B-2369']['latest'],'2026-09-30')

    def test_invalid_critical_source_missing_baseline_and_old_parser_still_fail(self):
        for critical in ('B-2201','B-2401'):
            for mode in ('invalid','empty','old_parser'):
                with self.subTest(source=critical,mode=mode):
                    db=database(self.sources)
                    ps=db['financial']['periods'] if critical=='B-2201' else db['reports'][critical]['periods']
                    if mode=='empty':ps.clear()
                    if mode=='old_parser':ps[0]['parser_version']='old'
                    def retrieve(code,d,*_):
                        if code==critical and mode=='invalid':raise ValueError('Unexpected schema')
                        raise FileNotFoundError('Not published')
                    self.assertTrue(self.run_sync(db,retrieve))

    def test_financial_outage_is_visible_and_existing_data_still_validated(self):
        db=json.loads(gzip.decompress((ROOT/'tests/fixtures/build-july-2026.json.gz').read_bytes()))
        db['meta']['financial_sync']={'errors':1,'error_samples':[{'kind':'unavailable','error':'timed out'}]}
        with tempfile.TemporaryDirectory() as tmp:
            output=Path(tmp)
            health=build(db,output,date(2026,9,7))
            self.assertEqual(health['errors'],0)
            self.assertEqual(health['datasets'][0]['status'],'WARNING')
            self.assertTrue(any('última descarga' in w for w in health['datasets'][0]['warnings']))
            before=(output/'financial.json').read_bytes()
            db['financial']['periods'][-1]['banbif']['balance'][0]['total']=float('inf')
            self.assertGreater(build(db,output,date(2026,9,7))['errors'],0)
            self.assertEqual((output/'financial.json').read_bytes(),before)


if __name__=='__main__':unittest.main()
