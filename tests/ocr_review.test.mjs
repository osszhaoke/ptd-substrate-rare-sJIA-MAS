import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {candidates,validatePayload,digest,reviewContent} from '../web/domain/model.js';
import {RecordService} from '../web/domain/service.js';
import {ocrOrigin,wasCorrected} from '../web/domain/ocr_review.js';
import {evidenceIndex,evidencePolygons,originNote} from '../web/features/ocr_evidence.js';
const ledger=()=>({version:'ocr-ledger/1',provider:'tencent-general-accurate',mapping:'coordinates=Polygon',region:'local',rawText:'CRP +003.40 mg/L',lines:[{id:'fictional_line_0001',order:0,text:'CRP +003.40 mg/L',page:null,confidence:.99,coordinates:[{x:10,y:20},{x:210,y:20},{x:210,y:50},{x:10,y:50}]}]});
const payload=o=>({formatVersion:2,clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'lab',nature:'SYNTHETIC',sourceKind:'OCR',trustTier:'USER_REVIEWED',clinicalFlags:{},observedAt:null,note:'',observations:[o]});
const observation=l=>{const o=candidates(l)[0];return {...o,ocrOrigin:ocrOrigin(o)};};
test('user correction retains exact original literal and source while legacy remains unchanged',async()=>{
 const l=ledger(),o=observation(l),p=payload(o);assert.equal(wasCorrected(o),false);o.valueLiteral='9.50';assert.equal(wasCorrected(o),true);
 validatePayload(p);assert.equal(o.ocrOrigin.valueLiteral,'+003.40');assert.match(originNote(o),/你修改后保存/);
 const before=await digest(p);p.observations[0].ocrOrigin.valueLiteral='1';assert.notEqual(before,await digest(p));
 delete o.ocrOrigin;validatePayload(p);assert.equal(originNote(o),'');
});
test('stage binds snapshot to the recognized row, not the edited result or a reference value',async()=>{
 const service=new RecordService({stage:async r=>r}),l=ledger(),s=await service.source(new File(['synthetic'],'fictional.png',{type:'image/png'}),l);
 const o=observation(l);o.valueLiteral='9.50';o.code='esr';o.displayName='血沉';o.unit='mm/h';
 const r=await service.stage(payload(o),s);assert.equal(r.payload.observations[0].ocrOrigin.code,'crp');assert.equal(r.digest,await digest(reviewContent(r)));
 for(const change of [x=>x.ocrOrigin.valueLiteral='9.50',x=>x.ocrOrigin.unit='g/L',x=>x.ocrOrigin.comparator='>',x=>x.ocrOrigin.code='esr']){
  const copy=observation(l);change(copy);await assert.rejects(()=>service.stage(payload(copy),s),/OCR_ORIGIN_MISMATCH/);
 }
 await assert.rejects(()=>service.stage({...payload(observation(l)),sourceKind:'MANUAL'},s),/OCR_ORIGIN_SOURCE/);
});
test('missing, duplicate, altered, or malformed original references cannot be staged',async()=>{
 const service=new RecordService({stage:async r=>r}),l=ledger(),s=await service.source(new File(['synthetic'],'fictional.png',{type:'image/png'}),l);
 for(const change of [x=>x.ocrOrigin.sourceLineIds=[],x=>x.ocrOrigin.sourceLineIds.push(x.sourceLineIds[0]),x=>x.ocrOrigin.sourceLineIds=['foreign_line_0000'],x=>x.ocrOrigin.version='unknown',x=>x.ocrOrigin.valueLiteral='1e3',x=>x.ocrOrigin.extra=true]){
  const o=observation(l);change(o);await assert.rejects(()=>service.stage(payload(o),s),/OCR_ORIGIN_INVALID/);
 }
 const o=observation(l);o.sourceLineIds=['foreign_line_0000'];o.ocrOrigin.sourceLineIds=[...o.sourceLineIds];await assert.rejects(()=>service.stage(payload(o),s),/SOURCE_LINE_MISSING/);
});
test('source projection keeps all raw text and refuses invented coordinates or missing rows',()=>{
 const source={ledger:ledger()},select=evidenceIndex(source),ids=['fictional_line_0001'],lines=select(ids),before=JSON.stringify(source);
 assert.equal(lines[0].text,'CRP +003.40 mg/L');assert.deepEqual(evidencePolygons(source,lines,300,100),['10,20 210,20 210,50 10,50']);
 assert.equal(select(['foreign_line_0000']),null);assert.equal(select([...ids,...ids]),null);
 for(const change of [s=>s.ledger.lines[0].coordinates=null,s=>s.ledger.lines[0].coordinates[0].x=-1,s=>s.ledger.lines[0].page=2,s=>s.ledger.mapping='unknown',s=>s.ledger.lines[0].coordinates[0].x=301]){
  const s=structuredClone(source);change(s);assert.deepEqual(evidencePolygons(s,s.ledger.lines,300,100),[]);
 }
 assert.equal(JSON.stringify(source),before);
});
test('source indexing stays bounded at tenfold fragment count with no repeated full scans',()=>{
 for(const n of [2000,20000]){
  const l=ledger(),line=l.lines[0];l.lines=Array.from({length:n},(_,i)=>({...line,id:'fictional_line_'+String(i).padStart(8,'0'),order:i}));
  const start=performance.now(),select=evidenceIndex({ledger:l});for(let i=0;i<100;i++)assert.equal(select([l.lines[i*10].id])[0].order,i*10);
  assert.ok(performance.now()-start<1000);
 }
});
