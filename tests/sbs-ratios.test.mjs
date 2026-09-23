import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sbsRatios,returnOnAverage,writeoffs12m,withLocalIndicators} from '../assets/js/sbs-ratios.js';
import {selectReport} from '../assets/js/entities.js';
import {peerModel,peerHistory} from '../assets/js/peers.js';
import {METRICS} from '../assets/js/config.js';
import {EXTRA_RATIOS} from '../assets/js/analysis-ratios.js';
Object.assign(METRICS,EXTRA_RATIOS);
const read=p=>JSON.parse(fs.readFileSync(new URL('../data/'+p,import.meta.url)));
const f=read('financial.json'),w=read('reports/B-2369.json'),official=read('reports/B-2401.json');
test('ROAE/ROAA reproduce published SBS values across all available BanBif months',()=>{
 const result=sbsRatios(f,w);
 let checked=0;
 for(const p of official.periods){for(const [calc,key]of [['roae','roe'],['roaa','roa']]){
  const value=result.get(p.date)?.[calc];if(!Number.isFinite(value))continue;
  assert.ok(Math.abs(value-p.keys[key].value)<1e-7,p.date+' '+key);checked++;
 }}assert.ok(checked>=100);
 assert.equal(result.get('2026-06').roae.toFixed(2),'13.89');
 assert.equal(result.get('2026-06').roaa.toFixed(2),'1.32');
 assert.equal(result.get('2026-06').mora_real.toFixed(2),'5.33');
 assert.equal(result.get('2026-06').npl_writeoffs.toFixed(2),'4.05');
 assert.ok(Math.abs(result.get('2026-06').writeoffs_12m-152349.806)<1e-7);
});
test('SBS ratios require exact months; null is not zero and local castigos are not foreign castigos',()=>{
 const missing={...w,periods:w.periods.filter(p=>p.date!=='2026-02')};
 assert.equal(writeoffs12m(missing,'banbif','2026-06'),null);
 assert.equal(writeoffs12m(w,'system','2026-06'),null);
 const none=returnOnAverage(()=>100,d=>d==='2026-02'?null:200,'2026-06');assert.equal(none.value,null);
 const local={...f,periods:read('entities/system.json').financial};
 const result=withLocalIndicators(selectReport(official,'system'),local,'system',w,{'B-2340':read('reports/B-2340.json'),'B-2402':read('reports/B-2402.json')});
 const p=result.periods.find(p=>p.date==='2026-06');
 assert.ok(p.values.c2fc8dfb2b1132c2>0);assert.ok(p.calculated.c2fc8dfb2b1132c2);
 assert.equal(p.values.b0a34c3fc7712c6e,null);assert.equal(p.values['calc:mora_real'],null);
 assert.equal(p.values['37473705943c6830'],read('reports/B-2340.json').periods.at(-1).peers.system['868f609caf5bd530']);
 assert.equal(official.periods.at(-1).peers.system,undefined,'original data not mutated');
});
test('peer shares use exact official domestic and foreign totals and never divide ratios',()=>{
 const state={entity:'banbif',peerBanks:[],peerExtra:[],peerMetric:'credits',peerMode:'level',range:12,date:'2026-06'};
 const r=peerModel(f,{},state).rows[0],p=f.periods.find(p=>p.date===state.date);
 for(const [key,bank]of [['share_local','system'],['share_foreign','system_foreign']])assert.equal(r[key],r.value/p.peers.find(b=>b.slug===bank).gross_credits*100);
 const foreign=peerModel(f,{}, {...state,entity:'bcp_foreign'}).rows[0];assert.equal(foreign.share_local,null);assert.ok(foreign.share_foreign>0);
 const ratio=peerModel(f,{}, {...state,peerMetric:'npl'}).rows[0];assert.equal(ratio.share_local,null);assert.equal(ratio.share_foreign,null);
 const h=peerHistory(f,{},'system','roe','2026-06');assert.ok(h.get('2026-06').calculated);
 const mora=peerHistory(f,{'B-2369':w},'banbif','mora_real','2026-06');assert.equal(mora.get('2026-06').value.toFixed(2),'5.33');
});
