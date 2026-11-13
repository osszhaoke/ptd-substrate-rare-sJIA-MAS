import test from 'node:test';
import assert from 'node:assert/strict';
import {metricIdentity,metricRows} from '../web/domain/metrics/identity.js';
import {projectMetricSeries} from '../web/domain/state/series.js';
import {metricsPage,metricDetail,metricChart} from '../web/features/metrics.js';
import {reportRows} from '../web/domain/report/rows.js';
import {cbcLedger} from './fixtures/cbc_report.mjs';
const row=(name,value='1',unit='U/L',extra={})=>({name,valueLiteral:value,unit,sourceLineIds:['fictional_line_01'],comparator:null,referenceRange:'1-9',abnormalFlag:'',...extra});
const event=(id,date,rows,extra={})=>({id,schema:'ptds-browser/3',sourceBinding:{id:'source_'+id},payload:{nature:'SYNTHETIC',instanceTimezone:'Asia/Shanghai',clinicalDate:date,observedAt:null,reportRows:rows,manualObservations:[],observations:[],...extra}});
const project=(events,extra={})=>projectMetricSeries({revision:'r33',events,dates:[...new Set(events.map(e=>e.payload.clinicalDate))],...extra},{nature:'SYNTHETIC',zone:'Asia/Shanghai'});

test('every one of 27 OCR CBC rows appears once, with full sources instead of five medical projections',()=>{
 const rows=reportRows(cbcLedger()),e=event('cbc','2020-01-01',rows),result=project([e]);
 assert.equal(rows.length,27);assert.equal(result.series.length,27);assert.equal(result.series.flatMap(g=>g.points).length,27);
 assert.deepEqual(new Set(result.series.flatMap(g=>g.points).map(p=>p.rowIndex)),new Set(rows.map((_,i)=>i)));
 for(const g of result.series)assert.deepEqual(g.points[0].sourceLineIds,rows[g.points[0].rowIndex].sourceLineIds);
});
test('exact bilingual aliases correspond, percentage/count and PCT meanings stay apart',()=>{
 assert.equal(metricIdentity(row('2 RBC *红细胞','4','10^12/L')).code,metricIdentity(row('红细胞计数','5','10^12/L')).code);
 assert.notEqual(metricIdentity(row('NEUT%','40','%')).code,metricIdentity(row('NEUT#','4','10^9/L')).code);
 assert.notEqual(metricIdentity(row('PCT','0.2','%')).code,metricIdentity(row('PCT','0.2','ng/mL')).code);
 assert.notEqual(metricIdentity(row('白蛋白','4','g/L')).code,metricIdentity(row('Alb% 白蛋白','4','%')).code);
 assert.equal(metricIdentity(row('25羟维生素D','1','ng/mL')).displayName,'25羟维生素D');
});
test('unknown, damaged, qualitative and blank-unit results all remain visible without guessed codes',()=>{
 const rows=[row('未知甲','7','U/L'),row('损坏名称123','8','U/L'),row('尿蛋白','阴性',''),row('抗体滴度','1:20',''),row('未知空单位','2','')];
 const r=project([event('all','2020-01-01',rows)]);assert.equal(r.series.length,5);
 assert.ok(r.series.every(g=>g.identity==='REPORT_NAME'));
 assert.equal(r.series.find(g=>g.displayName==='尿蛋白').points[0].status,'TEXT');
 assert.equal(r.series.find(g=>g.displayName==='未知空单位').points[0].status,'INVALID');
 const html=metricsPage({...r,eventCount:1});for(const x of rows)assert.ok(html.includes(x.name));
});
test('current reportRows is authoritative, corrections and manual additions have distinct references',()=>{
 const e=event('corrected','2020-01-01',[row('RBC','3','10^12/L')],{observations:[{code:'ferritin',valueLiteral:'999',unit:'ng/mL',sourceLineIds:[]}],manualObservations:[{code:'ferritin',valueLiteral:'5',unit:'ng/mL',sourceLineIds:[]}]});
 assert.equal(metricRows(e).length,2);const r=project([e]);assert.equal(r.series.length,2);assert.equal(r.series.find(g=>g.code==='ferritin').points[0].value,'5');
 assert.equal(r.series.find(g=>g.code==='report:rbc').points[0].ref,'corrected:row:0');
});
test('unknown label variants cannot silently alias; same label with different units never shares arithmetic',()=>{
 const r=project([event('a','2020-01-01',[row('虚构甲','1','mg/L'),row('虚构甲','2','g/L'),row('虚构乙','3','mg/L')])]);
 assert.equal(r.series.length,3);assert.ok(r.series.every(g=>!g.change.available));
 assert.notEqual(metricIdentity(row('脑脊液AST','1','U/L')).code,metricIdentity(row('AST','1','U/L')).code);
});
test('actual per-report reference and raw literal survive in history; no combined normal band',()=>{
 const r=project([event('a','2020-01-01',[row('MCV','86.00','fL',{referenceRange:'82-100'})]),event('b','2020-01-09',[row('MCV','87.20','fL',{referenceRange:'80-96'})])]);
 const g=r.series[0];assert.equal(g.change.delta,'1.2');const html=metricDetail(g);
 assert.ok(html.includes('86.00'));assert.ok(html.includes('82-100'));assert.ok(html.includes('80-96'));
});
test('page splitting a clinical date suppresses false latest and graph order',()=>{
 const r=project([event('a','2020-01-01',[row('MCV','86','fL')])],{partialDates:['2020-01-01']});
 assert.equal(r.series[0].latest,null);assert.equal(r.series[0].points[0].reason,'PAGE_DATE_PARTIAL');assert.deepEqual(r.series[0].segments,[]);
});
test('chart time spacing uses sample time rather than point index; conflicting/interval data is not a line',()=>{
 const g=project([event('a','2020-01-01',[row('MCV','80','fL')]),event('b','2020-01-02',[row('MCV','90','fL')]),event('c','2020-01-11',[row('MCV','100','fL')])]).series[0];
 const chart=metricChart(g);assert.ok(chart.includes('45.60'));assert.ok(!chart.includes('180.00'));
 const bound=project([event('b','2020-01-02',[row('MCV','90','fL',{comparator:'>'})])]).series[0];assert.ok(!metricChart(bound).includes('<path'));
});
test('card paging and escaping retain all items; chart cap is explicit and source history stays complete',()=>{
 const rows=Array.from({length:50},(_,i)=>row('虚构'+i,'1','U/L'));const r=project([event('a','2020-01-01',rows)]);
 const first=metricsPage({...r,eventCount:1}),second=metricsPage({...r,eventCount:1},{offset:24}),third=metricsPage({...r,eventCount:1},{offset:48});
 assert.equal((first.match(/data-metric-key=/g)||[]).length,24);assert.equal((second.match(/data-metric-key=/g)||[]).length,24);assert.equal((third.match(/data-metric-key=/g)||[]).length,2);
 const bad=project([event('x','2020-01-01',[row('<img src=x onerror=alert(1)>','阴性','')])]);assert.ok(!metricsPage({...bad,eventCount:1}).includes('<img'));
});

test('ambiguous latest is never selected by lexical id for the card heading; unknown reference remains flagged',()=>{
 const r=project([event('a','2020-01-01',[row('MCV','86','fL',{referenceRange:'-100'})]),event('b','2020-01-01',[row('MCV','87','fL')])]);
 const page=metricsPage({...r,eventCount:2}),detail=metricDetail(r.series[0]);assert.ok(page.includes('有多条待核对结果'));assert.ok(detail.includes('有多条待核对结果'));assert.ok(detail.includes('data-reference-quality="ambiguous"'));
});

test('overlapping metric mounts cannot publish a late previous page with the same data revision',async()=>{
 const {MetricsFlow}=await import('../web/app/metrics_flow.js'),pending=[],seen=[];
 const store={metricSnapshot:()=>new Promise(resolve=>pending.push(resolve)),get:async()=>({value:'same-revision'})};
 const flow=new MetricsFlow(store);flow.render=()=>seen.push(flow.snapshot.series[0].points[0].value);
 const config={zone:'Asia/Shanghai',nature:'SYNTHETIC',current:()=>true,published:()=>{}};
 const a=flow.mount({innerHTML:''},config),b=flow.mount({innerHTML:''},config);
 const snap=value=>({revision:'same-revision',dates:['2020-01-01'],events:[event('e'+value,'2020-01-01',[row('MCV',value,'fL')])]});
 pending[1](snap('2'));await b;pending[0](snap('1'));await a;
 assert.deepEqual(seen,['2']);assert.equal(flow.snapshot.series[0].points[0].value,'2');
});

test('a cancelled metric read failure cannot report an error on the next view',async()=>{
 const {MetricsFlow}=await import('../web/app/metrics_flow.js');let reject;
 const flow=new MetricsFlow({metricSnapshot:()=>new Promise((_,r)=>{reject=r;})});
 const job=flow.mount({innerHTML:''},{zone:'Asia/Shanghai',nature:'SYNTHETIC',current:()=>true});flow.dispose();reject(Error('STORE_CLOSED'));
 await assert.doesNotReject(job);assert.equal(flow.snapshot,null);
});
