import test from 'node:test';import assert from 'node:assert/strict';
import {validatePayload,SCHEMA_V2,SCHEMA_V3,dictionaryForSchema,digest,reviewContent} from '../web/domain/model.js';
import {RecordService} from '../web/domain/service.js';
import {reportRows} from '../web/domain/report/rows.js';
import {reportProjection} from '../web/domain/report/fields.js';
import {reportDetails} from '../web/features/report_rows.js';
import {selectInputs} from '../web/domain/state/select.js';
import {cbcLedger} from './fixtures/cbc_report.mjs';
const payload=()=>{const rows=reportRows(cbcLedger()).map(r=>({...r,checked:true}));return {formatVersion:3,clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'lab',sourceKind:'OCR',nature:'SYNTHETIC',trustTier:'USER_REVIEWED',clinicalFlags:{},observedAt:null,note:'',reportRows:rows,manualObservations:[],observations:reportProjection(rows)};};
test('v3 explicit schema and one authoritative report projection; v2 cannot silently accept new fields',()=>{
 const p=payload();validatePayload(p);assert.equal(dictionaryForSchema(SCHEMA_V3),'cbc-report/1');
 assert.throws(()=>validatePayload({...p,formatVersion:2},SCHEMA_V2),/V3_FIELDS_REQUIRE_V3/);
 p.observations[0].valueLiteral='999';assert.throws(()=>validatePayload(p),/REPORT_PROJECTION_MISMATCH/);
 const other=payload();other.reportRows[0].checked=false;assert.throws(()=>validatePayload(other),/REPORT_REVIEW_REQUIRED/);
});
test('stage reparses exact immutable origins; corrections retain original values and no medical projection for unmapped rows',async()=>{
 const service=new RecordService({stage:async r=>r}),source=await service.source(new File(['fictional'],'cbc.png',{type:'image/png'}),cbcLedger()),p=payload();
 const row=p.reportRows.find(r=>r.name.startsWith('RBC '));row.valueLiteral='4.60';row.referenceRange='3.9-5.2';row.abnormalFlag='H';
 const review=await service.stage(p,source);assert.equal(review.schema,SCHEMA_V3);assert.equal(review.digest,await digest(reviewContent(review)));assert.equal(row.origin.valueLiteral,'4.50');
 const html=reportDetails(p);assert.match(html,/红细胞/);assert.match(html,/你修改后保存/);assert.match(html,/4.50/);assert.match(html,/4.60/);
 assert.equal(selectInputs([{id:'fictional_event_01',payload:p}]).values.WBC,undefined);assert.equal(Object.keys(selectInputs([{id:'fictional_event_01',payload:p}]).values).length,3);
 for(const mutate of [r=>r.origin.valueLiteral='99',r=>r.origin.referenceRange='999',r=>r.origin.abnormalFlag='L',r=>r.origin.name='换名']){
  const copy=payload();mutate(copy.reportRows.find(r=>r.name.startsWith('RBC ')));await assert.rejects(()=>service.stage(copy,source),/REPORT_ORIGIN_MISMATCH/);
 }
 const copy=payload();copy.reportRows[0].sourceLineIds=['foreign_line_0001'];copy.reportRows[0].origin.sourceLineIds=['foreign_line_0001'];copy.observations=reportProjection(copy.reportRows);await assert.rejects(()=>service.stage(copy,source),/SOURCE_LINE_MISSING/);
});
test('raw report schema bounded and no silent arbitrary fields or missing source allowed',async()=>{
 const service=new RecordService({stage:async r=>r});await assert.rejects(()=>service.stage(payload()),/OCR_SOURCE_REQUIRED/);
 for(const mutate of [p=>p.reportRows[0].extra=true,p=>p.reportRows[0].origin.extra=true,p=>p.reportRows[0].abnormalFlag='critical',p=>p.reportRows[0].name='',p=>p.manualObservations.push({code:'unknown'})]){
  const p=payload();mutate(p);assert.throws(()=>validatePayload(p));
 }
});

test('pending original without a value requires an actual reviewed correction before save',async()=>{
 const ledger=cbcLedger(),name=ledger.lines.find(l=>l.text==='平均红细胞血红蛋白浓度'),result=ledger.lines[ledger.lines.indexOf(name)+1];name.text+='333';for(const point of name.coordinates)if(point.x===320)point.x=400;ledger.lines=ledger.lines.filter(l=>l!==result).map((l,order)=>({...l,order}));ledger.rawText=ledger.lines.map(l=>l.text).join('\n');
 const rows=reportRows(ledger).map(r=>({...r,checked:true})),p={...payload(),reportRows:rows,observations:reportProjection(rows)},pending=rows.find(r=>!r.valueLiteral);assert.throws(()=>validatePayload(p),/REPORT_ROW_EMPTY/);
 pending.name='MCHC 平均红细胞血红蛋白浓度';pending.valueLiteral='333';p.observations=reportProjection(rows);validatePayload(p);
 const service=new RecordService({stage:async r=>r}),source=await service.source(new File(['fictional'],'cbc.png',{type:'image/png'}),ledger);assert.equal((await service.stage(p,source)).payload.reportRows.length,27);assert.equal(pending.origin.valueLiteral,'');
});

import {incompleteUnitLedger} from './fixtures/report_layouts.mjs';
import {reportUnitNeedsReview} from '../web/domain/report/table_fields.js';
test('R27-A02: new stage/save reject incomplete OCR units across entries without invalidating historical literal schemas',async()=>{
 for(const kind of ['legacy','generic','flat','cells','inline']){
  const ledger=incompleteUnitLedger(kind),rows=reportRows(ledger).map(r=>({...r,checked:true})),p={...payload(),reportRows:rows,observations:reportProjection(rows)},calls=[];
  const service=new RecordService({stage:async r=>(calls.push('stage'),r),get:async name=>name==='sources'?source:null,commit:async()=>calls.push('commit')}),source=await service.source(new File(['fictional'],'units.png',{type:'image/png'}),ledger);
  if(rows.some(r=>!r.valueLiteral))await assert.rejects(()=>service.stage(p,source),/REPORT_ROW_EMPTY/,kind);
  else{
   validatePayload(p); // An old stored event remains structurally readable; the write gates differ.
   await assert.rejects(()=>service.stage(p,source),/REPORT_UNIT_INCOMPLETE/,kind);
   const broken=rows.find(reportUnitNeedsReview),literal=broken.unit;broken.unit='';await assert.rejects(()=>service.stage(p,source),/REPORT_UNIT_INCOMPLETE/,kind);broken.unit=literal;
  }
  assert.equal(calls.length,0,kind);
  for(const row of rows)if(!row.valueLiteral||reportUnitNeedsReview(row)){row.valueLiteral||='7.25';row.unit='unknownUnit';}
  p.observations=reportProjection(rows);const review=await service.stage(p,source);assert.equal(calls.length,1,kind);
  const bad=structuredClone(review);bad.payload.reportRows[0].unit='mg/';bad.payload.observations=reportProjection(bad.payload.reportRows);bad.digest=await digest(reviewContent(bad));
  await assert.rejects(()=>service.save(bad),/REPORT_UNIT_INCOMPLETE/,kind);assert.deepEqual(calls,['stage'],kind);
 }
});

import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {canonical,need} from '../web/domain/model.js';
import {validateRestoredReportBinding} from '../web/domain/report/restore_binding.js';
import {reportRows as historicalRows} from '../web/compat/r27/web/domain/report/rows.js';
import {bilingualFooterLedger,asymmetricFooterLedger} from './fixtures/report_layouts.mjs';
test('R29 frozen restore parser is an exact complete pure import closure; historical fixture bytes fixed',async()=>{
 const root=new URL('../web/compat/r27/',import.meta.url),lock=JSON.parse(await readFile(new URL('LOCK.json',root)));
 assert.equal(lock.commit,'fd59e94b4847d7881f5a90fe662a0c710f6738e5');assert.equal(Object.keys(lock.files).length,14);
 const visited=new Set();async function walk(rel){if(visited.has(rel))return;visited.add(rel);assert.ok(lock.files[rel],rel);const b=await readFile(new URL(rel,root));assert.equal(b.length,lock.files[rel].bytes);assert.equal(createHash('sha256').update(b).digest('hex'),lock.files[rel].sha256);
  const text=b.toString();assert.doesNotMatch(text,/\b(?:fetch|indexedDB|setInterval|setTimeout)\s*\(/);for(const match of text.matchAll(/from\s*['"]([^'"]+)['"]/g)){assert.ok(match[1].startsWith('.'));await walk(path.posix.normalize(path.posix.join(path.posix.dirname(rel),match[1])));}}
 await walk(lock.entry);assert.deepEqual([...visited].sort(),Object.keys(lock.files).sort());
 const all=await readdir(root,{recursive:true,withFileTypes:true});assert.equal(all.filter(d=>d.isFile()).length,15);
 assert.equal(createHash('sha256').update(await readFile(new URL('./fixtures/r27-footer-backup.ptds',import.meta.url))).digest('hex'),'8130233a30cc090d05655aed74445ee0bb7c6e66b9ac380d2b36ea04708661e2');
});
test('R29 current-first whole-record history policy, strict origins/duplicate/foreign lines and unchanged new stage',async()=>{
 const ledger=bilingualFooterLedger(),source={ledger},old=historicalRows(ledger).map(r=>({...r,checked:true})),current=reportRows(ledger).map(r=>({...r,checked:true}));assert.equal(old.length,28);assert.equal(current.length,27);assert.ok(!current.some(r=>r.valueLiteral==='999'));
 const build=rows=>({...payload(),reportRows:rows,observations:reportProjection(rows)}),helpers={need,canonical};
 assert.equal(await validateRestoredReportBinding(build(current),source,helpers),'current');assert.equal(await validateRestoredReportBinding(build(old),source,helpers),'cbc-report/r27-exact-source/1');
 const service=new RecordService({stage:async r=>r}),bound=await service.source(new File(['fictional'],'cbc.png',{type:'image/png'}),ledger);
 await assert.rejects(()=>service.stage(build(old),bound),/REPORT_ORIGIN_MISMATCH/);assert.equal((await service.stage(build(current),bound)).payload.reportRows.length,27);
 for(const mutate of [rs=>rs.at(-1).origin.valueLiteral='12345',rs=>rs.at(-1).ocrOrigin={fake:true},rs=>rs.push(structuredClone(rs.at(-1)))]){const rows=structuredClone(old);mutate(rows);await assert.rejects(()=>validateRestoredReportBinding(build(rows),source,helpers),/REPORT_ORIGIN_MISMATCH/);}
 const foreign=structuredClone(old);foreign[0].sourceLineIds=['foreign_00001'];await assert.rejects(()=>validateRestoredReportBinding(build(foreign),source,helpers),/SOURCE_LINE_MISSING/);
 const units=incompleteUnitLedger('legacy'),historical=historicalRows(units).map(r=>({...r,checked:true})),p=build(historical);validatePayload(p);assert.ok(historical.some(r=>r.unit==='mg/'));assert.equal(await validateRestoredReportBinding(p,{ledger:units},helpers),'current');
 const damaged=await service.source(new File(['fictional'],'cbc.png',{type:'image/png'}),units);await assert.rejects(()=>service.stage(p,damaged),/REPORT_UNIT_INCOMPLETE/);
});

test('R29 no row-wise mixing of two otherwise supported source interpretations',async()=>{
 const ledger=bilingualFooterLedger(),second=asymmetricFooterLedger();
 for(const row of second.lines)ledger.lines.push({...row,id:'second_'+row.id,order:ledger.lines.length,coordinates:row.coordinates.map(p=>({x:p.x+5000,y:p.y}))});ledger.rawText=ledger.lines.map(r=>r.text).join('\n');
 const current=reportRows(ledger),old=historicalRows(ledger),key=r=>canonical({origin:r.origin,ocrOrigin:r.ocrOrigin||null}),currentOnly=current.filter(r=>!old.some(t=>key(t)===key(r))),oldOnly=old.filter(r=>!current.some(t=>key(t)===key(r)));
 assert.equal(currentOnly.length,1);assert.equal(oldOnly.length,1);
 const rows=[currentOnly[0],oldOnly[0]].map(r=>({...r,checked:true})),p={...payload(),reportRows:rows,observations:reportProjection(rows)};
 await assert.rejects(()=>validateRestoredReportBinding(p,{ledger},{need,canonical}),/REPORT_ORIGIN_MISMATCH/);
});

test('R30 first save revalidates current source policy, retained source integrity and unit gates before any commit',async()=>{
 const ledger=bilingualFooterLedger();let source,commits=0;const store={stage:async r=>r,get:async name=>name==='sources'?source:null,commit:async()=>{commits++;}},service=new RecordService(store);source=await service.source(new File(['fictional'],'cbc.png',{type:'image/png'}),ledger);
 const rows=reportRows(ledger).map(r=>({...r,checked:true})),p={...payload(),reportRows:rows,observations:reportProjection(rows)},r=await service.stage(p,source);
 const old=structuredClone(r);old.payload.reportRows=historicalRows(ledger).map(r=>({...r,checked:true}));old.payload.observations=reportProjection(old.payload.reportRows);old.digest=await digest(reviewContent(old));await assert.rejects(()=>service.save(old),/REPORT_ORIGIN_MISMATCH/);assert.equal(commits,0);
 const original=source;source={...source,blob:new Blob(['forged'],{type:source.type})};await assert.rejects(()=>service.save(r),/SOURCE_HASH/);source={...original,ledger:cbcLedger()};await assert.rejects(()=>service.save(r),/SOURCE_BINDING/);source=null;await assert.rejects(()=>service.save(r),/SOURCE_MISSING/);source=original;
 const bad=structuredClone(r);bad.payload.reportRows[0].unit='mg/';bad.payload.observations=reportProjection(bad.payload.reportRows);bad.digest=await digest(reviewContent(bad));await assert.rejects(()=>service.save(bad),/REPORT_UNIT_INCOMPLETE/);assert.equal(commits,0);
 await service.save(r);assert.equal(commits,1);
 for(const error of ['STALE_REVIEW','SOURCE_MISSING','CONFIRMATION_REQUIRED']){store.commit=async()=>{throw Error(error);};await assert.rejects(()=>service.save(r),new RegExp(error));}
});
test('R30 existing historical receipt delegates idempotency/conflict/deleted authority without reparsing old event',async()=>{
 const ledger=bilingualFooterLedger(),rows=historicalRows(ledger).map(r=>({...r,checked:true})),p={...payload(),reportRows:rows,observations:reportProjection(rows)};
 const r={id:'historical_review_01',revision:1,schema:SCHEMA_V3,dictionary:'cbc-report/1',payload:p,sourceBinding:{id:'historical_source_01',hash:'a'.repeat(64),bindingDigest:'b'.repeat(64)},requestId:'historical_request_01',confirmation:null};r.digest=await digest(reviewContent(r));
 const receipt={id:r.requestId,eventId:'historical_event_01',digest:r.digest};let count=0;const store={get:async name=>{assert.equal(name,'receipts');return receipt;},commit:async(review,id)=>{assert.equal(id,r.requestId);assert.equal(review.digest,r.digest);count++;return receipt;}};const service=new RecordService(store);assert.equal(await service.save(r),receipt);assert.equal(count,1);
 for(const error of ['IDEMPOTENCY_CONFLICT','RECORD_DELETED']){store.commit=async()=>{throw Error(error);};await assert.rejects(()=>service.save(r),new RegExp(error));}
});
test('R30 save validates one detached review snapshot while caller changes original object during source read',async()=>{
 let source,captured,review;const ledger=cbcLedger(),store={stage:async r=>r,get:async name=>{if(name==='receipts'){review.payload.reportRows[0].origin.name='caller changed during await';return null;}return source;},commit:async r=>{captured=r;return {};}};const service=new RecordService(store);source=await service.source(new File(['fictional'],'cbc.png',{type:'image/png'}),ledger);review=await service.stage(payload(),source);await service.save(review);assert.notEqual(captured.payload.reportRows[0].origin.name,review.payload.reportRows[0].origin.name);assert.equal(captured.digest,await digest(reviewContent(captured)));
});
