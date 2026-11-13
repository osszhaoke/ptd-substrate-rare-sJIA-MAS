import test from 'node:test';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {reportRows,reportCoverage} from '../web/domain/report/rows.js';
import {reportProjection} from '../web/domain/report/fields.js';
import {CBC_ROWS,cbcLedger,plainLedger} from './fixtures/cbc_report.mjs';
import {parallelLedger} from './fixtures/ocr_parallel.mjs';
const header=['项目','结果','单位','参考范围'];
test('27-row fictional CBC preserves every original row; only explicit supported fields project to rules',()=>{
 const l=cbcLedger(),before=JSON.stringify(l),rows=reportRows(l);assert.equal(rows.length,27);
 for(const [en,cn,value,unit,ref]of CBC_ROWS){const r=rows.find(r=>r.name===en+' '+cn);assert.ok(r,cn);assert.equal(r.valueLiteral,value.replace('↑',''));assert.equal(r.unit,unit);assert.equal(r.referenceRange,ref);assert.equal(r.abnormalFlag,value.includes('↑')?'↑':'');assert.equal(r.checked,false);assert.equal(r.sourceLineIds.length,5);}
 assert.deepEqual(reportProjection(rows).map(o=>o.code).sort(),['anc','crp','hb','plt','wbc']);assert.equal(reportProjection(rows).find(o=>o.code==='wbc').unit,'10^9/L');
 assert.equal(JSON.stringify(l),before);assert.equal(reportCoverage(l,rows).unpairedFragments,10);
});
test('unknown first/middle rows no longer swallow later known rows in a strict flat table',()=>{
 const l=plainLedger([...header,'红细胞','4.50','10^12/L','3-6','白细胞','8.20','10^9/L','3-10','未映射检验','12','pg','0-15','C反应蛋白','4.2','mg/L','0-10']);
 const rows=reportRows(l);assert.equal(rows.length,4);assert.deepEqual(reportProjection(rows).map(o=>o.code),['wbc','crp']);
});
test('unit/arrow/header variants preserve raw evidence with explicit standardized projection',()=>{
 for(const name of ['中文名称','检验名称','项目名称']){const rows=reportRows(cbcLedger({header:name}));assert.equal(rows.length,27);assert.equal(rows.find(r=>r.name.startsWith('WBC ')).origin.abnormalFlag,'↑');}
 for(const flag of ['↑','↓','H','L']){const rows=reportRows(plainLedger(['WBC 8.20'+flag+' 10^9/l']));assert.equal(rows.length,1);assert.equal(rows[0].abnormalFlag,flag);assert.equal(reportProjection(rows)[0].valueLiteral,'8.20');}
});
test('missing geometry, values, units, duplicate result cells, crossing pages and bad headers never borrow neighboring data',()=>{
 const baseline=parallelLedger();assert.equal(reportRows(baseline).length,7);
 for(const which of ['value','unit','geometry','duplicate','page','header']){
  const l=parallelLedger(),v=l.lines.find(x=>x.text==='8.20');
  if(which==='value')v.text='';if(which==='unit')l.lines.find(x=>x.text==='x10^9/L').text='';if(which==='geometry')v.coordinates=null;if(which==='page')v.page=2;
  if(which==='duplicate')l.lines.push({...structuredClone(v),id:'duplicate_result_0001'});if(which==='header')l.lines.find(x=>x.text==='结果').text='';l.lines.forEach((x,i)=>x.order=i);
  assert.ok(!reportRows(l).some(r=>r.name.includes('WBC')),which);
 }
 const l=parallelLedger();l.lines.forEach(x=>x.coordinates=null);assert.equal(reportRows(l).length,0);
 const malformed=plainLedger([...header,'铁蛋白','未检','ng/mL','1520','CRP','4','mg/L','0-10']);assert.equal(reportRows(malformed).length,0);
});
test('unrecognized units/names retained without inventing medical mappings; duplicate evidence rows retained',()=>{
 const rows=reportRows(plainLedger([...header,'某检验','4','strange','0-10','白细胞','8.20','unknownUnit','3-10']));assert.equal(rows.length,2);assert.equal(reportProjection(rows).length,0);
 const repeated=reportRows(plainLedger(['CRP 4.2 mg/L','CRP 4.2 mg/L']));assert.equal(repeated.length,2);assert.notDeepEqual(repeated[0].sourceLineIds,repeated[1].sourceLineIds);
});
test('tenfold 2k/20k fragment projection bounded to 100 rows and under 1000ms',()=>{
 for(const target of [2000,20000]){const ledger=cbcLedger({pages:Math.ceil(target/145)});ledger.lines=ledger.lines.slice(0,target);ledger.rawText=ledger.lines.map(l=>l.text).join('\n');const heap=process.memoryUsage().heapUsed,start=performance.now(),rows=reportRows(ledger),ms=performance.now()-start;
  assert.equal(rows.length,100);assert.ok(ms<1000,`fragments=${ledger.lines.length},ms=${ms}`);console.log(JSON.stringify({scope:'synthetic Node parser; not phone memory',fragments:ledger.lines.length,ms,heapDeltaBytes:process.memoryUsage().heapUsed-heap}));}
});

test('previously accepted inline colon/abutting-name spellings remain visible in the report layer',()=>{
 const rows=reportRows(plainLedger(['CRP:4.2 mg/L','铁蛋白1520 ng/mL']));assert.deepEqual(reportProjection(rows).map(o=>o.code),['crp','ferritin']);assert.equal(rows.length,2);
});

test('name/result merged OCR fragment is visible pending review; never split trailing digits into a guessed value',()=>{
 const ledger=cbcLedger(),name=ledger.lines.find(l=>l.text==='平均红细胞血红蛋白浓度');
 const index=ledger.lines.indexOf(name),result=ledger.lines[index+1];name.text+='333';for(const p of name.coordinates)if(p.x===320)p.x=400;
 ledger.lines=ledger.lines.filter(l=>l!==result).map((l,order)=>({...l,order}));ledger.rawText=ledger.lines.map(l=>l.text).join('\n');
 const rows=reportRows(ledger),pending=rows.find(r=>r.name.includes('平均红细胞血红蛋白浓度333'));assert.equal(rows.length,27);assert.equal(pending.valueLiteral,'');assert.equal(pending.origin.valueLiteral,'');assert.ok(!reportProjection(rows).some(o=>o.valueLiteral==='333'));
});
test('arrow attached to a unit is stored separately; ambiguous reference fragments do not discard the reliable project',()=>{
 const ledger=cbcLedger();ledger.lines.find(l=>l.text==='10^12/L').text='↓10^12/L';const rows=reportRows(ledger),r=rows.find(r=>r.name.startsWith('RBC '));assert.equal(r.unit,'10^12/L');assert.equal(r.abnormalFlag,'↓');
 const ref=ledger.lines.find(l=>l.text==='3.8-5.1');ledger.lines.push({...structuredClone(ref),id:'overlap_reference_0000',order:ledger.lines.length});
 const changed=reportRows(ledger).find(r=>r.name.startsWith('RBC '));assert.equal(changed.valueLiteral,'4.50');assert.equal(changed.referenceRange,'');assert.ok(!changed.sourceLineIds.includes(ref.id));
});

test('contradictory result/unit arrows remain raw evidence rather than a guessed abnormal direction',()=>{
 const l=plainLedger(['项目','结果','单位','参考范围','红细胞','4.50↑','↓10^12/L','3-6']);assert.equal(reportRows(l).length,0);
 const geometric=cbcLedger();geometric.lines.find(x=>x.text==='8.20↑').text='8.20↓';geometric.lines.find(x=>x.text==='10^9/l').text='↑10^9/l';assert.ok(!reportRows(geometric).some(r=>r.name.startsWith('WBC ')));
});

// New layout cases join this existing mandatory Node entry point.
import {layoutLedger} from './fixtures/report_layouts.mjs';
import {reportBoxes} from '../web/domain/report/layout.js';
import {generalTableRows} from '../web/domain/report/tables.js';
test('right-angle coordinate frames, two panels, header aliases, swapped columns and source coordinates are lossless',()=>{
 for(const angle of [0,90,180,270,89.7,269.8])for(const swapped of [false,true]){
  const l=layoutLedger({angle,swapped,slope:.025}),before=JSON.stringify(l),rows=reportRows(l);
  assert.equal(rows.length,6,`${angle}/${swapped}`);assert.deepEqual(rows.map(r=>r.valueLiteral),['7.25','1.70','11.2','7.25','1.70','11.2']);
  assert.deepEqual(rows.map(r=>r.unit),['mg/L','','U/L','mg/L','','U/L']);assert.ok(rows.every(r=>r.origin&&r.checked===false));assert.equal(JSON.stringify(l),before);
  for(const row of rows)for(const id of row.sourceLineIds)assert.ok(l.lines.some(l=>l.id===id));
 }
});
test('explicit joined units/ranges and merged names keep evidence; footer never becomes a project',()=>{
 for(const angle of [0,90,180,270]){
  const l=layoutLedger({angle,joined:true,pending:true}),r=reportRows(l);assert.equal(r.length,6);
  assert.equal(r.filter(r=>!r.valueLiteral).length,2);assert.ok(r.filter(r=>r.name==='虚构甲项目').every(r=>r.unit==='mg/L'&&r.referenceRange==='2-9'));
  assert.ok(!r.some(r=>r.name.includes('页脚')||r.name.includes('人员')));assert.ok(!reportProjection(r).some(r=>r.valueLiteral==='123'));
 }
});
test('missing units, overlapping results and page splits never synthesize an unknown result',()=>{
 for(const kind of ['unit','duplicate','page']){const l=layoutLedger(),value=l.lines.find(l=>l.text==='7.25');
  if(kind==='unit')l.lines.find(l=>l.text==='mg/L').text='';if(kind==='duplicate')l.lines.push({...structuredClone(value),id:'layout_duplicate_0000',order:l.lines.length});if(kind==='page')value.page=2;
  const rows=reportRows(l);assert.ok(!rows.some(r=>r.name==='虚构甲项目'&&r.sourceLineIds.includes(value.id)&&r.valueLiteral==='7.25'),kind);
  assert.ok(rows.filter(r=>r.name==='虚构甲项目'&&!r.valueLiteral).every(r=>r.unit===''));
 }
});
test('cross-panel fragments remain explicit empty correction tasks and retain their literal text',()=>{
 const l=layoutLedger(),name=l.lines.find(l=>l.text==='虚构甲项目'&&l.coordinates[0].x>2200);
 // Crossing the panel divider: no splitting reference text or guessing a value.
 name.text='3-9 12 TEST 虚构跨栏项目';name.coordinates=[{x:2190,y:1645},{x:2450,y:1645},{x:2450,y:1663},{x:2190,y:1663}];
 const rows=reportRows(l),r=rows.find(r=>r.name===name.text);assert.ok(r);assert.equal(r.valueLiteral,'');assert.equal(r.unit,'');assert.deepEqual(r.sourceLineIds,[name.id]);
});
test('generic layout 2k/20k fragments stay bounded without per-row whole-page scans',()=>{
 for(const target of [2000,20000]){const l=layoutLedger({angle:270,pages:Math.ceil(target/38)});l.lines=l.lines.slice(0,target);l.rawText=l.lines.map(l=>l.text).join('\n');const start=performance.now(),rows=reportRows(l),ms=performance.now()-start;assert.equal(rows.length,100);assert.ok(ms<1000,`layout ${target} ${ms}`);console.log(JSON.stringify({scope:'fictional generic rotated layout',fragments:l.lines.length,ms}));}
});
test('removing Angle compensation or generic table wiring is killed by output assertions, with positive controls',()=>{
 const l=layoutLedger({angle:90}),before=JSON.stringify(l),expected=reportRows(l);assert.equal(expected.length,6);
 const changed=structuredClone(l);changed.providerRaw.Response.Angle=0;assert.notDeepEqual(reportRows(changed).map(r=>r.valueLiteral),expected.map(r=>r.valueLiteral));
 assert.equal(generalTableRows(reportBoxes(l)).length,8); // raw helper includes footer; public pipeline trims it
 assert.equal(JSON.stringify(l),before);
});

import {thirdBatchLedger} from './fixtures/report_layouts.mjs';
import {splitResult,metricCode,metricUnit} from '../web/domain/report/fields.js';
import {validatePayload} from '../web/domain/model.js';
test('leading flags preserve numeric literals; conflicting two-sided flags never guess',()=>{
 for(const flag of ['↑','↓','H','L']){assert.deepEqual(splitResult(flag+' 2.50'),{valueLiteral:'2.50',comparator:null,abnormalFlag:flag});assert.equal(splitResult(flag+' <2.50').comparator,'<');}
 assert.equal(splitResult('↑2.50↓'),null);assert.equal(splitResult('↑2.50↑').valueLiteral,'2.50');assert.equal(splitResult('阴性'),null);
 assert.equal(metricCode('2★白细胞'),'wbc');assert.equal(metricUnit('wbc','*10~9/L'),'10^9/L');assert.equal(metricCode('铁蛋白(1:20)'),null);assert.equal(metricCode('★白细胞(粒)'),null);
});
test('categorical results, dimensionless urine, dilution labels and split headers remain literal report-only rows',()=>{
 const l=thirdBatchLedger({qualitative:true,splitHeader:true,headerMetadata:true}),before=JSON.stringify(l),rows=reportRows(l);assert.equal(rows.length,6);
 assert.equal(rows.filter(r=>r.valueLiteral==='阴性').length,2);assert.equal(rows.filter(r=>r.name==='★比重'&&r.valueLiteral==='1.015'&&r.unit==='').length,2);
 assert.equal(rows.filter(r=>r.name==='1 ★虚构甲(1:10)'&&r.abnormalFlag==='↑').length,2);assert.equal(reportProjection(rows).length,0);assert.equal(JSON.stringify(l),before);
 validatePayload({formatVersion:3,clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'lab',sourceKind:'OCR',nature:'SYNTHETIC',trustTier:'USER_REVIEWED',clinicalFlags:{},observedAt:null,note:'',reportRows:rows.map(r=>({...r,checked:true})),manualObservations:[],observations:[]});
});
test('stacked report pages keep later tables; footer and preceding metadata never become data',()=>{
 const l=thirdBatchLedger({stacked:true,headerMetadata:true}),rows=reportRows(l);assert.equal(rows.length,12);assert.ok(!rows.some(r=>r.name.includes('页脚')||r.name.includes('时间')||r.name.includes('人员')));
 const one=thirdBatchLedger();one.lines[0].text='项 目';one.lines[1].text='测 定 结 果';one.rawText=one.lines.map(l=>l.text).join('\n');assert.equal(reportRows(one).length,6);
});
test('unit FEU suffix, reverse reference/unit merge and neutral flag preserve raw cell IDs and valid contract',()=>{
 const l=layoutLedger();for(const line of l.lines){if(line.text==='mg/L')line.text='mg/L FEU';}
 assert.ok(reportRows(l).filter(r=>r.valueLiteral==='7.25').every(r=>r.unit==='mg/L FEU'));
 const rev=layoutLedger({swapped:true});for(const line of rev.lines){if(line.text==='2-9')line.text='2-9mg/L';if(line.text==='mg/L')line.text='';}
 const r=reportRows(rev);assert.equal(r.filter(r=>r.name==='虚构甲项目'&&r.valueLiteral==='7.25'&&r.unit==='mg/L'&&r.referenceRange==='2-9').length,2);
});
import {neutralFlagLedger} from './fixtures/report_layouts.mjs';
test('neutral dashes in a flag column are not persisted as an invalid directional flag',()=>{
 const l=neutralFlagLedger(),rows=reportRows(l);assert.equal(rows.length,6);assert.ok(rows.every(r=>['','↑'].includes(r.abnormalFlag)));
 validatePayload({formatVersion:3,clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'lab',sourceKind:'OCR',nature:'SYNTHETIC',trustTier:'USER_REVIEWED',clinicalFlags:{},observedAt:null,note:'',reportRows:rows.map(r=>({...r,checked:true})),manualObservations:[],observations:[]});assert.ok(l.lines.some(l=>l.text==='-'));
});

import {asymmetricFooterLedger} from './fixtures/report_layouts.mjs';
test('R27-A01: each side keeps its own footer, including the short-right mirror and rotated coordinates',()=>{
 for(const mirror of [false,true])for(const angle of [0,90,180,270]){
  const l=asymmetricFooterLedger({mirror,angle}),before=JSON.stringify(l),r=reportRows(l);
  assert.equal(r.length,5,`mirror=${mirror},angle=${angle}`);
  assert.equal(r.filter(x=>x.name==='虚构乙项目').length,1);assert.equal(JSON.stringify(l),before);
 }
});
test('R27-A02: legacy table incomplete unit remains literal and visibly requires review',()=>{
 const l=cbcLedger();l.lines.find(x=>x.text==='10^12/L').text='mg/';l.rawText=l.lines.map(x=>x.text).join('\n');
 const before=JSON.stringify(l),r=reportRows(l),row=r.find(x=>x.name.startsWith('RBC '));
 assert.equal(row.valueLiteral,'4.50');assert.equal(row.unit,'mg/');assert.equal(row.origin.unit,'mg/');
 assert.equal(reportCoverage(l,r).pendingRows,1);assert.equal(JSON.stringify(l),before);
});

import {incompleteUnitLedger} from './fixtures/report_layouts.mjs';
import {reportUnitNeedsReview} from '../web/domain/report/table_fields.js';
test('R27-A02: all five parser entries expose incomplete units or empty correction tasks, with immutable origins',()=>{
 for(const kind of ['legacy','generic','flat','cells','inline']){
  const l=incompleteUnitLedger(kind),before=JSON.stringify(l),rows=reportRows(l),pending=rows.filter(r=>!r.valueLiteral||reportUnitNeedsReview(r));
  assert.ok(pending.length>0,kind);assert.equal(reportCoverage(l,rows).pendingRows,pending.length,kind);assert.equal(JSON.stringify(l),before,kind);
  for(const row of pending)if(row.valueLiteral){assert.equal(row.unit,'mg/');assert.equal(row.origin.unit,'mg/');}
 }
 assert.equal(reportUnitNeedsReview({name:'RBC',valueLiteral:'4.50',unit:'',origin:{unit:'mg/'}}),true);
 assert.equal(reportUnitNeedsReview({name:'INR',valueLiteral:'1.1',unit:'',origin:{unit:'mg/'}}),false);
 assert.equal(reportUnitNeedsReview({name:'某检验',valueLiteral:'阴性',unit:'',origin:{unit:'mg/'}}),false);
 assert.equal(reportUnitNeedsReview({name:'RBC',valueLiteral:'4.50',unit:'unknownUnit',origin:{unit:'mg/'}}),false);
});

import {bilingualFooterLedger} from './fixtures/report_layouts.mjs';
test('R27-A01: legacy supported-metric fallback cannot resurrect a project beyond its own footer',()=>{
 const l=bilingualFooterLedger(),before=JSON.stringify(l),r=reportRows(l);assert.equal(r.length,27);assert.ok(!r.some(r=>r.valueLiteral==='999'));assert.equal(JSON.stringify(l),before);
});
