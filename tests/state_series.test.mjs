import test from 'node:test';
import assert from 'node:assert/strict';
import {projectMetricSeries} from '../web/domain/state/series.js';

const options = {nature: 'SYNTHETIC', zone: 'Asia/Shanghai'};
const observation = (value='1', more={}) => ({code:'ferritin', valueLiteral:value, unit:'ng/mL', sourceLineIds:['line8'], comparator:null, ...more});
const event = (id='a', date='2020-01-01', value='1', more={}) => ({
  id, schema:'ptds-browser/3', sourceBinding:{id:'source-'+id}, payload:{
    nature:'SYNTHETIC', instanceTimezone:'Asia/Shanghai', clinicalDate:date, observedAt:null,
    observations:[observation(value)], ...more
  }
});
const snapshot = (events, dates=[...new Set(events.map(e=>e.payload.clinicalDate))]) => ({revision:'revision-1',events,dates,next:'2019-12-31'});
const project = (events, dates) => projectMetricSeries(snapshot(events, dates), options);
const first = events => project(events).series[0];

test('series keeps every observation and exact raw source, without double counting derived observations', () => {
  const a=event('a','2020-01-01','+001.200');
  a.payload.reportRows=[{name:'铁蛋白',valueLiteral:'+001.200',unit:'ng/mL',sourceLineIds:['line8']},{name:'铁蛋白',valueLiteral:'2',unit:'ng/mL',sourceLineIds:['line9']}];
  a.payload.observations.push(observation('2',{sourceLineIds:['line9']}));
  const original=structuredClone(a), result=first([a]);
  assert.equal(result.points.length,2);
  assert.equal(result.points[0].valueLiteral,'+001.200');
  assert.equal(result.points[0].value,'1.2');
  assert.equal(result.points[0].sourceId,'source-a');
  assert.deepEqual(result.points[0].sourceLineIds,['line8']);
  result.points[0].sourceLineIds.push('mutated-output');
  assert.deepEqual(a,original);
});

test('snapshot revision, paging, input ordering, and input bytes stay stable', () => {
  const input=snapshot([event('b','2020-01-02'),event('a')]);
  const original=structuredClone(input), result=projectMetricSeries(input,options);
  assert.equal(result.revision,'revision-1');assert.equal(result.next,'2019-12-31');
  assert.deepEqual(result.dates,['2020-01-01','2020-01-02']);
  assert.deepEqual(result.series[0].points.map(p=>p.eventId),['a','b']);
  assert.deepEqual(input,original);
  assert.deepEqual(projectMetricSeries({...input,events:[...input.events].reverse()},options),result);
});

test('nature, zone and canonical code are separate; names cannot merge unsupported rows', () => {
  const real=event('r',undefined,'900',{nature:'REAL'});
  const other=event('z',undefined,'800',{instanceTimezone:'UTC'});
  const unknown=event('u',undefined,'700',{observations:[observation('700',{code:'unknown',displayName:'铁蛋白'})]});
  const result=project([event(),real,other,unknown]);
  assert.equal(result.series[0].points.length,1);
  assert.deepEqual(result.excluded,{nature:1,timezone:1,unsupportedCode:1});
  assert.deepEqual(projectMetricSeries(snapshot([event()]),{...options,codes:['plt']}).series,[]);
});

test('units remain separate even for convertible measurements; unknown unit is not numeric', () => {
  const e=event();e.payload.observations=[observation('3',{code:'tg',unit:'mmol/L'}),observation('265.71',{code:'tg',unit:'mg/dL'}),observation('1200',{unit:'mg/L'})];
  const groups=project([e]).series;
  assert.equal(groups.length,3);
  assert.deepEqual(groups.filter(g=>g.code==='tg').map(g=>g.unit),['mg/dL','mmol/L']);
  const bad=groups.find(g=>g.code==='ferritin');assert.equal(bad.points[0].status,'INVALID');assert.equal(bad.latest,null);
});

test('all existing stored units stay usable, including glucose mg/dL and wbc count spelling', () => {
  const e=event();
  e.payload.observations=[observation('90',{code:'lab_glucose',unit:'mg/dL'}),observation('5',{code:'lab_glucose',unit:'mmol/L'}),observation('5',{code:'wbc',unit:'×10^9/L'})];
  const groups=project([e]).series;
  assert.equal(groups.length,3);
  assert.ok(groups.every(g=>g.points[0].status==='EXACT'));
  assert.deepEqual(groups.filter(g=>g.code==='lab_glucose').map(g=>g.unit),['mg/dL','mmol/L']);
});

test('same day exact times retain both values and never apply rule max-temperature selection', () => {
  const events=[event('late',undefined,'38',{observedAt:'2020-01-01T02:00:00Z',observations:[observation('38',{code:'body_temp',unit:'°C'})]}),event('early',undefined,'40',{observedAt:'2020-01-01T01:00:00Z',observations:[observation('40',{code:'body_temp',unit:'°C'})]})];
  const g=first(events);
  assert.deepEqual(g.points.map(p=>p.value),['40','38']);assert.equal(g.latest,'late:0');assert.equal(g.change.delta,'-2');
});

test('date-only same-day readings keep both sources and suppress invented latest/difference', () => {
  const g=first([event('b',undefined,'2'),event('a',undefined,'1')]);
  assert.equal(g.points.length,2);assert.ok(g.points.every(p=>p.status==='CONFLICT'));
  assert.equal(g.latest,null);assert.equal(g.change.available,false);assert.deepEqual(g.segments,[]);
  const mixed=first([event('a'),event('b',undefined,'2',{observedAt:'2020-01-01T02:00:00Z'})]);
  assert.ok(mixed.points.every(p=>p.status==='CONFLICT'));
});

test('duplicate instants expressed with different offsets are conflict even with equal values', () => {
  const g=first([event('a',undefined,'2',{observedAt:'2020-01-01T00:00:00Z'}),event('b',undefined,'2',{observedAt:'2020-01-01T08:00:00+08:00'})]);
  assert.equal(g.latest,null);assert.ok(g.points.every(p=>p.reason==='DUPLICATE_INSTANT'));
});

test('explicit missing metric breaks segments, creates no zero, and disables adjacent delta', () => {
  const events=[event('a','2020-01-01','1'),event('b','2020-01-02','2',{observations:[observation('2',{code:'plt',unit:'10^9/L'})]}),event('c','2020-01-03','3')];
  const g=project(events).series.find(g=>g.code==='ferritin');
  assert.deepEqual(g.points.map(p=>p.value),['1','3']);assert.deepEqual(g.gaps,['2020-01-02']);
  assert.deepEqual(g.segments,[['a:0'],['c:0']]);assert.equal(g.change.available,false);
  // Non-daily real samples do not invent a daily grid between sample dates.
  const sparse=first([events[0],events[2]]);assert.deepEqual(sparse.gaps,[]);assert.equal(sparse.segments.length,1);
});

test('each comparator is a bound, not an exact chart point or arithmetic operand', () => {
  for(const comparator of ['<','<=','>','>=']) {
    const g=first([event('a'),event('b','2020-01-02','2',{observations:[observation('2',{comparator})]})]);
    assert.equal(g.points[1].comparator,comparator);assert.equal(g.points[1].status,'BOUND');
    assert.equal(g.latest,'b:0');assert.equal(g.change.available,false);assert.deepEqual(g.segments,[['a:0']]);
  }
});

test('decimal change stays exact and zero/negative previous values are explicit', () => {
  const g=first([event('a',undefined,'0.1'),event('b','2020-01-02','0.3')]);
  assert.equal(g.change.delta,'0.2');assert.equal(g.change.percent,'200');
  assert.equal(first([event('a',undefined,'0'),event('b','2020-01-02','2')]).change.percent,null);
  assert.equal(first([event('a',undefined,'-2'),event('b','2020-01-02','-1')]).change.percent,'50');
});

test('invalid latest is visible and never falls back to earlier precise result', () => {
  for(const more of [{valueLiteral:'NaN'},{valueLiteral:'1e3'},{comparator:'~'},{unit:'unknown'}]) {
    const result=project([event('a'),event('b','2020-01-02','2',{observations:[observation('2',more)]})]);
    const g=result.series.find(g=>g.unit=== (more.unit||'ng/mL'));
    assert.equal(g.points.at(-1).status,'INVALID');assert.equal(g.latest,null);assert.equal(g.change.available,false);
  }
});

test('legacy data does not acquire injected v2 times/comparators', () => {
  const e=event('old',undefined,'4',{observedAt:'2020-01-01T02:00:00Z',observations:[observation('4',{comparator:'>'})]});e.schema='ptds-browser/1';
  const p=first([e]).points[0];assert.equal(p.observedAt,null);assert.equal(p.comparator,null);assert.equal(p.status,'EXACT');
});

test('missing zone, snapshot dates/revision, duplicate IDs and unsupported schemas fail explicitly', () => {
  const good=snapshot([event()]);
  assert.throws(()=>projectMetricSeries(good,{nature:'SYNTHETIC'}),/ZONE_REQUIRED/);
  assert.throws(()=>projectMetricSeries(good,{...options,zone:'invalid'}),/ZONE_INVALID/);
  assert.throws(()=>projectMetricSeries(good,{...options,nature:'DEMO'}),/NATURE_REQUIRED/);
  assert.throws(()=>projectMetricSeries({...good,revision:null},options),/REVISION_REQUIRED/);
  assert.throws(()=>projectMetricSeries({...good,dates:['2020-02-30']},options),/DATES_INVALID/);
  assert.throws(()=>project([event()],[]),/EVENT_DATE_INVALID/);
  assert.throws(()=>project([event(),event()]),/EVENT_ID_INVALID/);
  assert.throws(()=>project([{...event(),schema:'future/9'}]),/SCHEMA_UNSUPPORTED/);
});

test('instants require explicit offset, real calendar time and clinical date in requested zone', () => {
  for(const observedAt of ['2020-01-01T08:00:00','2020-01-01T24:00:00Z','2020-02-30T00:00:00Z','2020-01-01T20:00:00Z']) {
    assert.throws(()=>project([event('a',undefined,'1',{observedAt})]),/INSTANT_INVALID/);
  }
  assert.throws(()=>project([event('a',undefined,'1',{instanceTimezone:null})]),/ZONE_REQUIRED/);
});

test('1000/10000/20000 synthetic records retain all sources; record cap rejects overflow', () => {
  for(const count of [1000,10000,20000]) {
    const events=Array.from({length:count},(_,i)=>event('scale-'+i,'2020-01-01',String(i)));
    const start=performance.now(), g=first(events), elapsedMs=performance.now()-start;
    assert.equal(g.points.length,count);assert.equal(new Set(g.points.map(p=>p.ref)).size,count);
    assert.equal(g.latest,null);assert.deepEqual(g.segments,[]);
    console.log(JSON.stringify({seriesScale:count,elapsedMs,diagnosticOnly:true}));
  }
  assert.throws(()=>project(Array.from({length:20001},(_,i)=>event('limit-'+i))),/EVENT_LIMIT/);
});
