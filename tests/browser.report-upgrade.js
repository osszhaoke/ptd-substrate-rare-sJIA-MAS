(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);},pause=ms=>new Promise(r=>setTimeout(r,ms)),wait=async f=>{for(let i=0;i<700;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 const cfg=window.__PROBE_INPUT__,{RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),m=await import('/domain/model.js');const store=new RecordStore(),marker=await store.get('meta','r30-upgrade'),service=new RecordService(store);
 const source=await store.get('sources',marker.sourceId);ok(source&&source.hash===marker.sourceHash&&source.bindingDigest===marker.sourceBinding&&m.canonical(source.ledger)===marker.sourceLedger&&await m.hash(await source.blob.arrayBuffer())===marker.sourceHash,'UPGRADE_SOURCE_CHANGED');
 const emit=v=>window.webkit.messageHandlers.result.postMessage(v),snap=()=>store.backupSnapshot();let saveError='';const realSave=RecordService.prototype.save;RecordService.prototype.save=async function(...args){try{return await realSave.apply(this,args);}catch(e){saveError=e.message;throw e;}};
 if(cfg.mode==='read'){
  const s=await snap(),expected=Number(cfg.expectedRecords);ok(s.events.length===expected&&s.receipts.length===expected,'UPGRADE_NEW_PID_RECORDS');
  if(expected){const e=s.events[0];ok(e.payload.reportRows.length===27&&!e.payload.reportRows.some(r=>r.valueLiteral==='999'),'UPGRADE_NEW_PID_FOOTER');store.close();emit({ok:true,eventId:e.id,rows:27,records:1,newProcessRead:true});}
  else{const reviews=await store.reviews();ok(reviews.length===1&&reviews[0].id===marker.reviewId&&reviews[0].requestId===marker.requestId&&reviews[0].digest===marker.digest,'UPGRADE_REJECTION_LOST_DRAFT');store.close();emit({ok:true,records:0,receipts:0,draftPreserved:true,newProcessRead:true});}return;
 }
 const reviews=await store.reviews();ok(reviews.length===1&&(await snap()).events.length===0,'UPGRADE_PRECONDITION');const old=reviews[0];
 if(cfg.expectedError){let error='';try{await service.stage(old.payload,source,old);}catch(e){error=e.message;}ok(error===cfg.expectedError,'UPGRADE_RESTAGE_CONTROL '+error);}
 await wait(()=>$('.state-overview'));$('[data-nav="capture"]').click();await wait(()=>$('#resume-draft'));$('#resume-draft').click();await wait(()=>$('.draft'));$('.draft').click();await wait(()=>$('#confirmed')&&!$('#confirmed').disabled);
 ok(!$('#confirmed').checked&&$('#save').disabled,'UPGRADE_AUTO_CONFIRM');
 if(cfg.mode==='correct'){
  $('#edit-review').click();await wait(()=>!$('#review-step').hidden);const rows=[...document.querySelectorAll('[data-report]')];
  if(cfg.kind==='footer'){const footer=rows.find(r=>r.querySelector('.metric-value').value==='999');ok(footer,'UPGRADE_NO_FOOTER_TO_REMOVE');footer.querySelector('.remove-metric').click();}
  else{const broken=rows.find(r=>r.querySelector('.metric-unit').value==='mg/');ok(broken,'UPGRADE_NO_UNIT_TO_CORRECT');broken.querySelector('.metric-unit').value='unknownUnit';broken.querySelector('.metric-unit').dispatchEvent(new Event('input',{bubbles:true}));}
  for(const box of document.querySelectorAll('.report-checked')){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}
  $('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);const changed=(await store.reviews())[0];ok(changed.revision===marker.revision+1&&changed.requestId!==marker.requestId&&changed.digest!==marker.digest,'UPGRADE_CORRECTION_NOT_RESTAGED');const rebound=await store.get('sources',changed.sourceBinding.id);try{ok(await m.hash(await rebound.blob.arrayBuffer())===marker.sourceHash,'UPGRADE_RESTAGE_SOURCE_HASH');}catch(e){throw Error('UPGRADE_RESTAGE_SOURCE_UNREADABLE '+e.name+' '+e.message);}
 }
 $('#notice').textContent='';$('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record')||$('#notice').textContent.trim().length>0);
 const s=await snap();
 if(cfg.mode==='reject'){
  ok(s.events.length===0&&s.receipts.length===0,'UPGRADE_OLD_DRAFT_SAVED');const r=(await store.reviews())[0];ok(r&&r.id===marker.reviewId&&r.requestId===marker.requestId&&r.revision===marker.revision&&r.digest===marker.digest,'UPGRADE_REJECT_MUTATED_DRAFT');
  ok($('#notice').textContent.includes('返回修改')&&!$('#edit-review').hidden,'UPGRADE_RECHECK_PATH_MISSING');store.close();emit({ok:true,records:0,receipts:0,draftPreserved:true,sourcePreserved:true,requestIdUnchanged:true,recheckPath:true,notice:$('#notice').textContent});return;
 }
 ok(s.events.length===1&&s.receipts.length===1,'UPGRADE_VALID_SAVE_FAILED '+saveError+' '+$('#notice').textContent);const event=s.events[0];ok(event.payload.reportRows.length===27&&!event.payload.reportRows.some(r=>r.valueLiteral==='999'),'UPGRADE_CORRECTION_FOOTER');ok((await store.reviews()).length===0,'UPGRADE_SAVED_REVIEW_RETAINED');
 if(cfg.mode==='save'){
  const receipt=await service.save(old);ok(receipt.eventId===event.id&&(await snap()).events.length===1,'UPGRADE_RECEIPT_NOT_IDEMPOTENT');
  let code='';const other={...old,payload:{...old.payload,note:'different'},digest:''};other.digest=await m.digest(m.reviewContent(other));try{await service.save(other);}catch(e){code=e.message;}ok(code==='IDEMPOTENCY_CONFLICT','UPGRADE_RECEIPT_CONFLICT_CHANGED');
 }
 store.close();emit({ok:true,eventId:event.id,rows:27,records:1,sourcePreserved:true,explicitAutomatedConfirmation:true,corrected:cfg.mode==='correct',receiptIdempotency:cfg.mode==='save'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
