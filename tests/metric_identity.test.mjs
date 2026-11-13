import test from 'node:test';
import assert from 'node:assert/strict';
import {REPORT_METRICS,DISPLAY_BILINGUAL} from '../web/domain/metrics/catalog.js';
import {DICTIONARY} from '../web/domain/report/fields.js';
import {OCR_ALIASES} from '../web/domain/state/ocr_aliases.js';
import {metricIdentity} from '../web/domain/metrics/identity.js';
import {projectMetricSeries} from '../web/domain/state/series.js';
import {metricsPage,metricDetail} from '../web/features/metrics.js';
const row=(name,unit,value='6.00')=>({name,unit,valueLiteral:value,comparator:null,referenceRange:'1-9',abnormalFlag:'',sourceLineIds:['fictional-source-line']});
const event=(id,date,r)=>({id,schema:'ptds-browser/3',sourceBinding:{id:'source-'+id},payload:{nature:'SYNTHETIC',instanceTimezone:'Asia/Shanghai',clinicalDate:date,observedAt:null,observations:[],manualObservations:[],reportRows:[r]}});
const project=events=>projectMetricSeries({revision:'identity-repair',events,dates:[...new Set(events.map(e=>e.payload.clinicalDate))]},{nature:'SYNTHETIC',zone:'Asia/Shanghai'});
const labels=[...REPORT_METRICS.flatMap(([code,,names,units])=>names.map(name=>({code:'report:'+code,name,unit:units[0]}))),...Object.entries(DICTIONARY).flatMap(([code,[name,unit]])=>[name,...(OCR_ALIASES[code]||[])].map(name=>({code,name,unit})))];
test('registered single aliases remain recognizable, while repeated aliases from every display/canonical group stay raw',()=>{
 for(const {code,name,unit}of labels){
  assert.equal(metricIdentity(row(name,unit)).code,code,'valid '+name);
  for(const damaged of [name+name,name+' '+name,name+name+name]){
   const actual=metricIdentity(row(damaged,unit));assert.equal(actual.identity,'REPORT_NAME',damaged);assert.ok(actual.code.startsWith('raw:'),damaged);
  }
 }
});
test('every finitely registered bilingual label stays recognizable, repeated full labels never do',()=>{
 for(const [code,names]of Object.entries(DISPLAY_BILINGUAL)){
  const unit=code.startsWith('report:')?REPORT_METRICS.find(m=>'report:'+m[0]===code)[3][0]:DICTIONARY[code][1];
  for(const name of names){assert.equal(metricIdentity(row(name,unit)).code,code,name);assert.equal(metricIdentity(row(name+name,unit)).identity,'REPORT_NAME',name+name);}
 }
});
test('only explicitly registered bilingual pairs match; duplicate, reordered surplus, prefixes and suffixes do not',()=>{
 for(const name of ['RBC 红细胞','红细胞 RBC','2 RBC *红细胞'])assert.equal(metricIdentity(row(name,'10^12/L')).code,'report:rbc');
 for(const name of ['RBC RBC','RBC红细胞RBC','红细胞红细胞','RBC红细胞红细胞','RBCWBC','脑脊液RBC','RBCunknown','25RBC'])assert.equal(metricIdentity(row(name,'10^12/L')).identity,'REPORT_NAME',name);
 for(const [name,unit]of [['PCTPCT','%'],['PCTPCT','ng/mL'],['NEUT%NEUT%','%'],['HbHb','g/L'],['CRPCRP','mg/L'],['CRP CRP C反应蛋白','mg/L']])assert.equal(metricIdentity(row(name,unit)).identity,'REPORT_NAME',name);
 assert.notEqual(metricIdentity(row('PCT','%')).code,metricIdentity(row('PCT','ng/mL')).code);
});
test('damaged OCR cannot create a false latest or difference in a valid metric; raw source remains reachable',()=>{
 const events=[event('valid1','2020-01-01',row('RBC','10^12/L','4.50')),event('valid2','2020-01-05',row('红细胞','10^12/L','5.50')),event('damaged','2020-01-11',row('RBC RBC','10^12/L','6.00'))];
 const projected=project(events);assert.equal(projected.series.length,2);
 const good=projected.series.find(g=>g.code==='report:rbc'),bad=projected.series.find(g=>g.identity==='REPORT_NAME');
 assert.equal(good.points.length,2);assert.equal(good.change.delta,'1');assert.equal(good.latest,'valid2:row:0');assert.ok(!good.points.some(p=>p.eventId==='damaged'));
 assert.equal(bad.points.length,1);assert.equal(bad.points[0].originalName,'RBC RBC');assert.equal(bad.points[0].valueLiteral,'6.00');assert.equal(bad.points[0].eventId,'damaged');assert.deepEqual(bad.points[0].sourceLineIds,['fictional-source-line']);assert.equal(bad.change.available,false);
 assert.ok(metricsPage({...projected,eventCount:3}).includes('RBC RBC'));const detail=metricDetail(bad);assert.ok(detail.includes('damaged:row:0'));assert.ok(detail.includes('按报告原名对应'));
});

test('Chinese liver names retain a bilingual status label and prealbumin keeps report g/L',()=>{
 assert.equal(metricIdentity(row('谷丙转氨酶','U/L','1506.0')).code,'report:alt');
 assert.equal(metricIdentity(row('谷丙转氨酶','U/L','1506.0')).displayName,'ALT（谷丙转氨酶）');
 assert.equal(metricIdentity(row('谷草转氨酶','U/L','1671.0')).code,'ast');
 assert.equal(metricIdentity(row('谷草转氨酶','U/L','1671.0')).displayName,'AST（谷草转氨酶）');
 assert.deepEqual(metricIdentity(row('前白蛋白','g/L','0.17')),{code:'report:pa',displayName:'前白蛋白',unit:'g/L',identity:'ALIAS'});
});
