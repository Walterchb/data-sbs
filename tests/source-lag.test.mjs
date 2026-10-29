import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPreset} from '../assets/js/report-presets.js';
import {sbsRatios,writeoffs12m} from '../assets/js/sbs-ratios.js';
import {shift} from '../assets/js/analytics.js';

// Synthetic data, deliberately independent of the moving production snapshot.
const date='2026-09';
const months=Array.from({length:13},(_,i)=>shift(date,i-12));
const financial={catalog:[26,37,38].map(n=>({id:`balance:${n}`,label:`Test ${n}`,kind:'stock',path:[]})),
 periods:months.map(date=>({date,source_url:'fixture',values:{'balance:26':[0,0,900],'balance:37':[0,0,60],'balance:38':[0,0,40]}}))};
const complete={catalog:[{id:'casts',label:'Castigos del mes'}],periods:months.map(date=>({date,values:{casts:10},source_url:'fixture'}))};
const context=writeoffs=>({financial,writeoffs,entity:'banbif',entityName:'Synthetic test bank'});

test('new balance remains usable while writeoffs lag, then ratios recover when the missing source arrives',()=>{
 const lagged={...complete,periods:complete.periods.filter(p=>p.date!==date)};
 const before=JSON.stringify(lagged);
 assert.equal(buildPreset('npl',context(lagged),date).value,0.04);
 for(const id of ['mora_real','npl_writeoffs']){
  assert.throws(()=>buildPreset(id,context(lagged),date),/B-2369 de 2026-09/);
  assert.equal(sbsRatios(financial,lagged).get(date)[id],null);
  assert.ok(Number.isFinite(buildPreset(id,context(lagged),shift(date,-1)).value));
  const recovered=buildPreset(id,context(complete),date).value;
  const expected=(id==='mora_real'?100+120:40+120)/(1000+120);
  assert.ok(Math.abs(recovered-expected)<1e-12);
  assert.ok(Math.abs(sbsRatios(financial,complete).get(date)[id]-expected*100)<1e-10);
 }
 assert.equal(JSON.stringify(lagged),before,'must not fill gaps or mutate source history');
});

test('every missing month and null value blocks only dependent ratios; an actual zero is valid',()=>{
 for(const missingDate of months.slice(1)){
  for(const periods of [complete.periods.filter(p=>p.date!==missingDate),complete.periods.map(p=>p.date===missingDate?{...p,values:{casts:null}}:p)]){
   const report={...complete,periods};
   assert.equal(writeoffs12m(report,'banbif',date),null);
   assert.equal(buildPreset('npl',context(report),date).value,0.04);
   for(const id of ['mora_real','npl_writeoffs'])assert.throws(()=>buildPreset(id,context(report),date),/Falta el flujo de castigos/);
  }
 }
 const zero={...complete,periods:complete.periods.map(p=>({...p,values:{casts:0}}))};
 assert.equal(writeoffs12m(zero,'banbif',date),0);
 assert.equal(buildPreset('mora_real',context(zero),date).value,0.1);
 assert.equal(writeoffs12m(complete,'system',date),null,'must not substitute another bank or scope');
});
