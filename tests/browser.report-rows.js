(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);},pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async f=>{for(let i=0;i<700;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 const cfg=window.__PROBE_INPUT__,{RecordStore}=await import('/storage/store.js'),m=await import('/domain/model.js'),backup=await import('/storage/backup.js');
 const store=new RecordStore();window.confirm=()=>true;
 if(cfg.historical){
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
    const expected={origin:'REPORT_ORIGIN_MISMATCH',line:'SOURCE_LINE_MISSING',source:'BACKUP_SOURCE_HASH',receipt:'BACKUP_RECEIPT',duplicate:'REPORT_ORIGIN_MISMATCH'};
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
 if(cfg.layout){
  const expected=Number(cfg.rows),ledger=JSON.parse(cfg.ledger);
  if(cfg.mode==='read'){
   const marker=await store.get('meta','r26-event'),d=await store.detail(marker.eventId);
   ok(m.canonical(d.event.payload.reportRows||[])===marker.rows,'LAYOUT_NEW_PROCESS_CHANGED');
   ok(d.source.ledger.lines.length===ledger.lines.length&&(await store.reviews()).length===0,'LAYOUT_NEW_PROCESS_SOURCE_OR_PERMISSION');
   store.close();window.webkit.messageHandlers.result.postMessage({ok:true,eventId:marker.eventId,reportRows:expected,newProcessRead:true});return;
  }
  await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
  $('[data-nav="capture"]').click();await wait(()=>$('#ocr'));
  let blob;
  if(cfg.imageBase64){const bytes=Uint8Array.from(atob(cfg.imageBase64),c=>c.charCodeAt(0));blob=new Blob([bytes],{type:cfg.imageMime||'image/jpeg'});}
  else{const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=3200;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,3200,3200);ctx.fillStyle='black';ctx.font='14px sans-serif';for(const l of ledger.lines)ctx.fillText(l.text,l.coordinates?.[0]?.x??20,l.coordinates?.[0]?.y??20+l.order*25);blob=await new Promise(r=>canvas.toBlob(r,'image/png'));}
  const file=new File([blob],'authorized-layout-test.'+(blob.type==='image/jpeg'?'jpg':'png'),{type:blob.type});
  Object.defineProperty($('#image'),'files',{value:[file],configurable:true});$('#image').dispatchEvent(new Event('change'));await wait(()=>$('#source-name').textContent===file.name);
  const savedFetch=window.fetch;let ocrFailure='';window.fetch=async(...a)=>{const r=await savedFetch(...a);if(a[0]==='/api/ocr'&&!r.ok)ocrFailure=(await r.clone().json()).error;return r;};
  $('#trial-token').value=cfg.token;$('#upload-consent').checked=true;$('#ocr').click();await wait(()=>!$('#ocr').disabled&&$('#ocr-review-status').textContent.length>0).catch(()=>{throw Error('LAYOUT_OCR_FAILED '+ocrFailure+' '+$('#notice').textContent);});ok(document.querySelectorAll('[data-report]').length===expected,'LAYOUT_CANDIDATE_ROWS_LOST');
  const elements=[...document.querySelectorAll('[data-report]')],pending=elements.filter(e=>!e.querySelector('.metric-value').value);
  ok(pending.length===Number(cfg.pending||0),'LAYOUT_PENDING_CHANGED');ok(elements.every(e=>!e.querySelector('.report-checked').checked),'LAYOUT_AUTOCHECK');ok((await store.page()).items.length===0,'LAYOUT_AUTOSAVE');
  $('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));
  if(expected===0){ok($('#ledger').textContent.includes(ledger.rawText.split('\n')[0]),'LAYOUT_RAW_TEXT_HIDDEN');$('#note').value='虚构测试操作员备注：保留原图和识别原文，不自动推断医学指标。';$('#note').dispatchEvent(new Event('input',{bubbles:true}));}
  if(pending.length){$('#prepare-review').click();await wait(()=>$('#notice').textContent.includes('还缺结果'));ok((await store.reviews()).length===0,'LAYOUT_PENDING_STAGED');}
  if(cfg.unitReview){
   const damaged=elements.filter(e=>/[/／]\s*$/.test(e.querySelector('.metric-unit').value));ok(damaged.length===Number(cfg.unitReview),'REPORT_UNIT_FIXTURE_NOT_PRESENT');
   const checkAll=()=>{for(const el of elements){const box=el.querySelector('.report-checked');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}};
   checkAll();$('#notice').textContent='';$('#prepare-review').click();await wait(()=>!$('#confirmation').hidden||$('#notice').textContent.includes('单位没识全'));
   ok($('#confirmation').hidden&&(await store.reviews()).length===0&&(await store.page()).items.length===0,'REPORT_INCOMPLETE_UNIT_STAGED');
   ok(damaged.every(e=>e.textContent.includes('单位没识全')),'REPORT_INCOMPLETE_UNIT_HIDDEN');
   for(const el of damaged){el.querySelector('.metric-unit').value='';el.querySelector('.metric-unit').dispatchEvent(new Event('input',{bubbles:true}));ok(!el.querySelector('.report-checked').checked,'REPORT_UNIT_EDIT_REUSES_CHECK');}
   checkAll();$('#notice').textContent='';$('#prepare-review').click();await wait(()=>!$('#confirmation').hidden||$('#notice').textContent.includes('单位没识全'));
   ok($('#confirmation').hidden&&(await store.reviews()).length===0,'REPORT_INCOMPLETE_UNIT_BLANK_STAGED');
  }
  const changes=JSON.parse(cfg.corrections||'[]');
  for(const [index,el]of elements.entries()){
   const change=changes.find(c=>c.index===index)||{};
   if(!cfg.imageBase64&&!el.querySelector('.metric-value').value){change.name='虚构校正项目'+index;change.valueLiteral='17.0';}
   if(cfg.unitReview&&change.unit!==undefined){el.querySelector('.report-checked').checked=true;el.querySelector('.report-checked').dispatchEvent(new Event('change',{bubbles:true}));}
   for(const [key,selector]of [['name','.report-name'],['valueLiteral','.metric-value'],['unit','.metric-unit']])if(change[key]!==undefined){const node=el.querySelector(selector);ok(node,'LAYOUT_CORRECTION_FIELD');node.value=change[key];node.dispatchEvent(new Event('input',{bubbles:true}));}
   if(cfg.unitReview&&change.unit!==undefined)ok(!el.querySelector('.report-checked').checked&&JSON.parse(el.dataset.report).origin.unit==='mg/','REPORT_UNIT_CORRECTION_OR_ORIGIN_LOST');
   const source=el.querySelector('[data-ocr-source]');ok(source,'LAYOUT_SOURCE_BUTTON');source.click();await wait(()=>$('.ocr-review-preview img')?.naturalWidth>0);
   const origin=JSON.parse(el.dataset.report).origin,sourceIds=new Set(JSON.parse(el.dataset.lines));ok([...sourceIds].every(id=>origin.sourceLineIds.includes(id)),'LAYOUT_SOURCE_REBOUND');const polygons=[...document.querySelectorAll('.ocr-review-preview polygon')];
   const sourceLines=ledger.lines.filter(l=>sourceIds.has(l.id)),img=$('.ocr-review-preview img');ok(sourceLines.length===sourceIds.size,'LAYOUT_SOURCE_IDS_LOST');
   const reliable=sourceLines.every(l=>l.coordinates?.length>=3&&l.coordinates.every(p=>p.x>=0&&p.y>=0&&p.x<=img.naturalWidth&&p.y<=img.naturalHeight));
   const expectedPolygons=reliable?sourceLines.map(l=>l.coordinates.map(p=>p.x+','+p.y).join(' ')):[];
   ok(expectedPolygons.length===polygons.length&&polygons.every(p=>expectedPolygons.includes(p.getAttribute('points'))),'LAYOUT_ROTATED_SOURCE_CHANGED');
   if(!reliable)ok($('.ocr-evidence-status').textContent.includes('没有可靠的位置')&&$('.ocr-evidence-lines').textContent.length>0,'LAYOUT_UNRELIABLE_SOURCE_GUESSED');
  }
  ok(elements.every(e=>e.querySelector('.metric-value').value),'LAYOUT_CORRECTION_MISSING');
  if(expected){$('#prepare-review').click();await wait(()=>$('#notice').textContent.includes('逐项对照报告'));ok((await store.reviews()).length===0,'LAYOUT_UNCHECKED_STAGED');}
  for(const e of elements){const check=e.querySelector('.report-checked');check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}
  $('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);ok(!$('#confirmed').checked&&$('#save').disabled,'LAYOUT_AUTOCONFIRM');
  if(cfg.upgradeOldStage){
   const reviews=await store.reviews();ok(reviews.length===1&&!reviews[0].confirmation&&(await store.page()).items.length===0,'UPGRADE_OLD_NOT_UNCONFIRMED');
   const r=reviews[0],savedSource=await store.get('sources',r.sourceBinding.id);
   await store.meta({id:'r30-upgrade',reviewId:r.id,requestId:r.requestId,revision:r.revision,digest:r.digest,rows:r.payload.reportRows.length,sourceId:savedSource.id,sourceHash:savedSource.hash,sourceBinding:savedSource.bindingDigest,sourceLedger:m.canonical(savedSource.ledger)});
   for(const registration of await navigator.serviceWorker.getRegistrations())await registration.unregister();for(const key of await caches.keys())await caches.delete(key);
   store.close();window.webkit.messageHandlers.result.postMessage({ok:true,reviewId:r.id,requestId:r.requestId,rows:r.payload.reportRows.length,unconfirmed:true,records:0});return;
  }
  $('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
  const page=await store.page(),eventId=page.items[0].id,d=await store.detail(eventId);ok(page.items.length===1&&(d.event.payload.reportRows||[]).length===expected,'LAYOUT_SAVE_LOST');
  ok(d.source.ledger.rawText===ledger.rawText&&m.canonical(d.source.ledger.lines)===m.canonical(ledger.lines),'LAYOUT_LEDGER_TRUNCATED');
  ok(await m.hash(await d.source.blob.arrayBuffer())===await m.hash(await file.arrayBuffer()),'LAYOUT_ORIGINAL_CHANGED');
  ok((d.event.payload.reportRows||[]).every(r=>r.checked&&r.origin&&r.sourceLineIds.every(id=>d.source.ledger.lines.some(l=>l.id===id))),'LAYOUT_SOURCE_LOST');
  for(const c of changes)for(const k of ['name','valueLiteral','unit'])if(c[k]!==undefined)ok(d.event.payload.reportRows[c.index][k]===c[k],'LAYOUT_CORRECTION_NOT_SAVED');
  const encrypted=await backup.exportBackup(store,'fictional-layout-password'),target=new RecordStore('layout-restore-'+crypto.randomUUID());
  await backup.restoreBackup(target,await backup.inspectBackup(encrypted,'fictional-layout-password',target));const restored=await target.detail(eventId);
  ok(m.canonical(restored.event)===m.canonical(d.event)&&await m.hash(await restored.source.blob.arrayBuffer())===d.source.hash,'LAYOUT_BACKUP_CHANGED');
  await store.meta({id:'r26-event',eventId,rows:m.canonical(d.event.payload.reportRows||[])});target.close();store.close();
  window.webkit.messageHandlers.result.postMessage({ok:true,eventId,reportRows:expected,pendingRows:pending.length,allRowSourcePolygons:true,rawOnly:expected===0,incompleteUnitsBlocked:Number(cfg.unitReview||0),explicitAutomatedChecks:true,explicitAutomatedSave:true,backupRoundTrip:true,noAutomaticSave:true});return;
 }
 if(cfg.mode==='read'){
  const marker=await store.get('meta','r24-event'),d=await store.detail(marker.idValue);
  ok(d.event.schema===m.SCHEMA_V3&&d.event.payload.reportRows.length===27,'REPORT_NEW_PROCESS_LOST');
  ok(d.event.payload.reportRows.some(r=>r.name==='RBC 红细胞（人工校正）'&&r.origin.name==='RBC 红细胞'&&r.valueLiteral==='4.60'&&r.origin.valueLiteral==='4.50'),'REPORT_NEW_PROCESS_CORRECTION_LOST');
  ok((await store.reviews()).length===0,'REPORT_REVIEW_PERMISSION_REPLAY');store.close();window.webkit.messageHandlers.result.postMessage({ok:true,eventId:marker.idValue,reportRows:27,newProcessRead:true});return;
 }
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
 $('[data-nav="capture"]').click();await wait(()=>$('#ocr'));
 const ledger=JSON.parse(cfg.ledger),canvas=document.createElement('canvas');canvas.width=1300;canvas.height=550;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1300,550);ctx.fillStyle='black';ctx.font='14px sans-serif';ctx.textBaseline='top';
 for(const l of ledger.lines)ctx.fillText(l.text,l.coordinates[0].x,l.coordinates[0].y);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png')),file=new File([blob],'fictional-cbc-27.png',{type:'image/png'});
 Object.defineProperty($('#image'),'files',{value:[file],configurable:true});$('#image').dispatchEvent(new Event('change'));await wait(()=>$('#source-name').textContent===file.name);
 $('#trial-token').value=cfg.token;$('#upload-consent').checked=true;$('#ocr').click();await wait(()=>document.querySelectorAll('.metric-row').length===5&&!$('#ocr').disabled);
 ok(document.querySelectorAll('[data-report]').length===27,'REPORT_UNMAPPED_HIDDEN');
 ok(!$('#review-step').hidden&&$('#ocr-review-status').textContent.includes('已整理 27 项'),'REPORT_COUNT_OR_REVIEW_LOST');
 ok(document.querySelectorAll('.metric-row').length===5&&document.querySelectorAll('.report-row').length===22,'REPORT_UNMAPPED_HIDDEN');ok(document.documentElement.scrollWidth<=innerWidth+2,'REPORT_MOBILE_OVERFLOW');
 ok([...document.querySelectorAll('.report-checked')].every(e=>!e.checked),'REPORT_CHECKS_PREAPPROVED');ok((await store.page()).items.length===0,'REPORT_OCR_AUTO_SAVE');
 if(cfg.pendingRows){
  const pending=[...document.querySelectorAll('[data-report]')].filter(e=>!e.querySelector('.metric-value').value);ok(pending.length===Number(cfg.pendingRows),'REPORT_PENDING_HIDDEN');
  $('#prepare-review').click();await wait(()=>$('#notice').textContent.includes('还缺结果'));ok((await store.reviews()).length===0,'REPORT_PENDING_STAGED');
  for(const el of pending){el.querySelector('.report-name').value='MCHC 平均红细胞血红蛋白浓度';el.querySelector('.metric-value').value='333';el.querySelector('.metric-value').dispatchEvent(new Event('input',{bubbles:true}));ok(JSON.parse(el.dataset.report).origin.valueLiteral==='','REPORT_PENDING_GUESSED');}
 }
 const rbc=[...document.querySelectorAll('[data-report]')].find(e=>JSON.parse(e.dataset.report).name.startsWith('RBC '));
 $('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));
 const {readReportRow}=await import('/features/report_rows.js'),mapped=document.querySelector('.metric-row[data-report]'),select=mapped.querySelector('.metric-code'),oldCode=select.value;
 select.value='crp';select.dispatchEvent(new Event('change',{bubbles:true}));ok(readReportRow(mapped).name===m.DICTIONARY.crp[0],'REPORT_MAPPED_NAME_SWITCH_LOST');
 select.value=oldCode;select.dispatchEvent(new Event('change',{bubbles:true}));ok(readReportRow(mapped).name===JSON.parse(mapped.dataset.report).name,'REPORT_MAPPED_ORIGINAL_NAME_LOST');
 for(const blank of ['', '   ']){
  const input=rbc.querySelector('.report-name');input.value=blank;input.dispatchEvent(new Event('input',{bubbles:true}));
  for(const check of document.querySelectorAll('.report-checked')){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}
  $('#notice').textContent='';$('#prepare-review').click();
  await wait(()=>!$('#confirmation').hidden||$('#notice').textContent.includes('请填写项目名称'));
  ok($('#confirmation').hidden&&(await store.reviews()).length===0&&(await store.page()).items.length===0,'REPORT_EMPTY_NAME_STAGED');
  ok(input.value===blank&&readReportRow(rbc).name==='','REPORT_EMPTY_NAME_REPLACED');
 }
 rbc.querySelector('.report-name').value='RBC 红细胞（人工校正）';rbc.querySelector('.report-name').dispatchEvent(new Event('input',{bubbles:true}));
 ok(!rbc.querySelector('.report-checked').checked,'REPORT_EDIT_REUSES_CHECK');
 ok(JSON.parse(rbc.dataset.report).origin.name==='RBC 红细胞','REPORT_RENAME_ORIGIN_LOST');

 rbc.querySelector('[data-ocr-source]').click();await wait(()=>$('.ocr-review-preview img').naturalWidth>0);ok(document.querySelectorAll('.ocr-review-preview polygon').length===5,'REPORT_UNMAPPED_SOURCE_MISSING');
 rbc.querySelector('.report-checked').checked=true;rbc.querySelector('.report-checked').dispatchEvent(new Event('change',{bubbles:true}));
 rbc.querySelector('.metric-value').value='4.60';rbc.querySelector('.metric-value').dispatchEvent(new Event('input',{bubbles:true}));
 ok(!rbc.querySelector('.report-checked').checked,'REPORT_EDIT_REUSES_CHECK');ok(rbc.querySelector('.ocr-row-status').textContent.includes('你已修改'),'REPORT_CORRECTION_NOT_VISIBLE');
 $('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));$('#prepare-review').click();
 await wait(()=>$('#notice').textContent.includes('逐项对照报告'));ok($('#confirmation').hidden&&(await store.reviews()).length===0,'REPORT_UNCHECKED_STAGED');
 for(const check of document.querySelectorAll('.report-checked')){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}
 $('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);
 ok($('#review-summary').textContent.includes('4.60')&&$('#review-summary').textContent.includes('4.50'),'REPORT_SUMMARY_ORIGINAL_LOST');
 ok(!$('#confirmed').checked&&$('#save').disabled&&(await store.page()).items.length===0,'REPORT_AUTO_CONFIRM');
 $('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
 const page=await store.page(),eventId=page.items[0].id,d=await store.detail(eventId);ok(page.items.length===1,'REPORT_SAVE_DUPLICATED');
 ok(d.event.payload.reportRows.length===27&&d.event.payload.observations.length===5,'REPORT_SAVE_TRUNCATED');
 ok(d.event.payload.reportRows.some(r=>r.name==='RBC 红细胞（人工校正）'&&r.origin.name==='RBC 红细胞'),'REPORT_RENAME_NOT_SAVED');
 ok((d.event.payload.reportRows||[]).every(r=>r.checked&&r.origin&&r.sourceLineIds.length===(r.origin.valueLiteral?5:3)),'REPORT_SOURCE_OR_RECEIPT_LOST');
 ok(d.source.ledger.lines.length===ledger.lines.length&&await m.hash(await d.source.blob.arrayBuffer())===await m.hash(await file.arrayBuffer()),'REPORT_ORIGINAL_CHANGED');
 ok($('#main').textContent.includes('红细胞')&&$('#main').textContent.includes('4.60'),'REPORT_DETAIL_HIDDEN');
 const encrypted=await backup.exportBackup(store,'fictional-r24-password'),target=new RecordStore('report-restore-'+crypto.randomUUID());
 const inspection=await backup.inspectBackup(encrypted,'fictional-r24-password',target);ok(inspection.data.schema===m.SCHEMA_V3,'REPORT_BACKUP_SCHEMA_AMBIGUOUS');
 await backup.restoreBackup(target,inspection);const restored=await target.detail(eventId);ok(m.canonical(restored.event)===m.canonical(d.event),'REPORT_BACKUP_ROW_CHANGED');
 ok(await m.hash(await restored.source.blob.arrayBuffer())===d.source.hash&&(await target.reviews()).length===0,'REPORT_BACKUP_ORIGINAL_OR_PERMISSION');
 // An authenticated export with internally forged source origin must still fail semantic verification.
 const snap=await store.backupSnapshot(),forged=structuredClone(snap),event=forged.events[0];event.payload.reportRows.find(r=>r.name.startsWith('RBC ')).origin.valueLiteral='123';
 event.digest=await m.digest(m.reviewContent(event));forged.receipts[0].digest=event.digest;
 const invalid=await backup.exportBackup({backupSnapshot:async()=>forged,meta:async()=>{}},'fictional-r24-password');let rejected=false;
 try{await backup.inspectBackup(invalid,'fictional-r24-password',target);}catch(e){rejected=e.message==='REPORT_ORIGIN_MISMATCH';}ok(rejected,'REPORT_FORGED_ORIGIN_RESTORED');
 const {deidentifiedDraft}=await import('/features/consultation.js'),draft=deidentifiedDraft({},[d.event]);ok(!draft.text.includes('4.60')&&!draft.text.includes('红细胞'),'REPORT_UNKNOWN_LEAKED_TO_AI_PROJECTION');
 await store.meta({id:'r24-event',idValue:eventId});target.close();store.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,eventId,reportRows:27,projectedMetrics:5,unmappedRows:22,emptyAndWhitespaceNamesRejected:true,nonemptyRenameSaved:true,mappedNameSwitchPreserved:true,explicitSyntheticRowChecks:true,explicitSyntheticSaveConfirmation:true,backupRoundTrip:true,forgedOriginRejected:true,noUnknownFieldsInAiProjection:true,noAutomaticSave:true,pendingRowsManuallyCompleted:Number(cfg.pendingRows||0)});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
