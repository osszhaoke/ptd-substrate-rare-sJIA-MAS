from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2];C=ROOT/'runtime/r29-candidate01'
p=C/'tests/browser.report-rows.js'
s=p.read_text();needle=' if(cfg.layout){'
branch=''' if(cfg.historical){
  const password='fictional-history-password',emit=v=>window.webkit.messageHandlers.result.postMessage(v);
  if(cfg.mode==='history-read'){
   const marker=await store.get('meta','r29-history'),d=await store.detail(marker.idValue);
   ok(m.canonical(d.event)===marker.event&&m.canonical(d.receipt)===marker.receipt,'HISTORICAL_NEW_PID_CHANGED');
   ok(d.event.payload.reportRows.length===28&&d.event.payload.reportRows.some(r=>r.valueLiteral==='999'),'HISTORICAL_ROWS_CHANGED');
   ok(await m.hash(await d.source.blob.arrayBuffer())===marker.sourceHash&&(await store.reviews()).length===0,'HISTORICAL_SOURCE_OR_AUTHORITY_CHANGED');
   store.close();emit({ok:true,eventId:d.event.id,rows:28,newProcessRead:true});return;
  }
  const raw=Uint8Array.from(atob(cfg.backupBase64),c=>c.charCodeAt(0)),file=new Blob([raw]);
  ok(await m.hash(raw)==='8130233a30cc090d05655aed74445ee0bb7c6e66b9ac380d2b36ea04708661e2','HISTORICAL_FIXTURE_CHANGED');
  let inspection;try{inspection=await backup.inspectBackup(file,password,store);}catch(e){throw Error('HISTORICAL_BACKUP_REJECTED '+e.message);}
  const original=inspection.data.events[0],source=inspection.data.sources[0],receipt=inspection.data.receipts[0];
  ok(original.payload.reportRows.length===28&&original.payload.reportRows.some(r=>r.valueLiteral==='999'),'HISTORICAL_FIXTURE_ROWS');
  ok((await store.page()).items.length===0&&(await store.reviews()).length===0,'HISTORICAL_INSPECT_WRITES');
  if(cfg.mode==='history-negative'){
   const snap={events:inspection.data.events,receipts:inspection.data.receipts,sources:inspection.data.sources,meta:[]};
   const rejected={};
   for(const kind of ['origin','line','source','receipt','duplicate','cipher']){
    const copy=structuredClone(snap),e=copy.events[0];let invalid;
    if(kind==='origin'){e.payload.reportRows.at(-1).origin.valueLiteral='123456';}
    if(kind==='line'){e.payload.reportRows.at(-1).origin.sourceLineIds=['foreign_line_0001'];e.payload.reportRows.at(-1).sourceLineIds=['foreign_line_0001'];e.payload.observations=(await import('/domain/report/fields.js')).reportProjection(e.payload.reportRows);}
    if(kind==='source'){copy.sources[0].blob=new Blob(['forged original'],{type:copy.sources[0].type});}
    if(kind==='receipt'){copy.receipts[0].digest='f'.repeat(64);}
    if(kind==='duplicate'){e.payload.reportRows.push(structuredClone(e.payload.reportRows.at(-1)));e.payload.observations=(await import('/domain/report/fields.js')).reportProjection(e.payload.reportRows);}
    if(['origin','line','duplicate'].includes(kind)){e.digest=await m.digest(m.reviewContent(e));copy.receipts[0].digest=e.digest;}
    if(kind==='cipher'){const bad=raw.slice();bad[bad.length-20]^=1;invalid=new Blob([bad]);}
    else invalid=await backup.exportBackup({backupSnapshot:async()=>copy,meta:async()=>{}},password);
    let error='';try{await backup.inspectBackup(invalid,password,store);}catch(e){error=e.message;}
    const expected={origin:'REPORT_ORIGIN_MISMATCH',line:'BACKUP_SOURCE_LINE',source:'BACKUP_SOURCE_HASH',receipt:'BACKUP_RECEIPT',duplicate:'REPORT_ORIGIN_MISMATCH'};
    ok(error&&(kind==='cipher'||error===expected[kind]),'HISTORICAL_FORGED_ACCEPTED '+kind+' '+error);
    ok((await store.page()).items.length===0&&(await store.reviews()).length===0,'HISTORICAL_REJECTION_WRITES');rejected[kind]=error;
   }
   store.close();emit({ok:true,negativeControls:rejected,records:0,paidCalls:0});return;
  }
  await backup.restoreBackup(store,inspection);const d=await store.detail(original.id);
  ok(m.canonical(d.event)===m.canonical(original)&&m.canonical(d.receipt)===m.canonical(receipt),'HISTORICAL_RESTORE_CHANGED');
  ok(m.canonical({...d.source,blob:null})===m.canonical({...source,blob:null})&&await m.hash(await d.source.blob.arrayBuffer())===source.hash,'HISTORICAL_SOURCE_CHANGED');
  ok((await store.reviews()).length===0,'HISTORICAL_AUTHORITY_REPLAY');
  const again=await backup.exportBackup(store,password),target=new RecordStore('history-roundtrip-'+crypto.randomUUID());
  await backup.restoreBackup(target,await backup.inspectBackup(again,password,target));const r=await target.detail(original.id);
  ok(m.canonical(r.event)===m.canonical(original)&&m.canonical(r.receipt)===m.canonical(receipt)&&await m.hash(await r.source.blob.arrayBuffer())===source.hash&&(await target.reviews()).length===0,'HISTORICAL_ROUNDTRIP_CHANGED');
  await store.meta({id:'r29-history',idValue:d.event.id,event:m.canonical(d.event),receipt:m.canonical(d.receipt),sourceHash:source.hash});
  target.close();store.close();emit({ok:true,eventId:original.id,rows:28,exactOldBytes:true,inspectionReadOnly:true,originalEventReceiptUnchanged:true,roundTrip:true,noAuthorityReplay:true,policies:inspection.summary.originPolicies});return;
 }
'''
assert needle in s;p.write_text(s.replace(needle,branch+needle,1))
