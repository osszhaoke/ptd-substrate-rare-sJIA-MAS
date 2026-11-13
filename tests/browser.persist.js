(async()=>{
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),{hash}=await import('/domain/model.js');
 const s=new RecordStore('ptds-persistent-process-test'),svc=new RecordService(s),mode=window.__PROBE_INPUT__.mode;await s.open();
 if(mode==='write'){
  const blob=await(await fetch('/fixture.png')).blob();const source=await svc.source(new File([blob],'synthetic-original.png',{type:'image/png'}));
  let r=await svc.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'lab',sourceKind:'MANUAL',nature:'SYNTHETIC',trustTier:'USER_REVIEWED',note:'persistent synthetic',observations:[]},source);r=await svc.confirm(r,true);const receipt=await svc.save(r);
  window.webkit.messageHandlers.result.postMessage({ok:true,mode,receipt,sourceHash:source.hash,sourceId:source.id});
 }else{
  const page=await s.page();if(page.items.length!==1)throw new Error('PERSISTENT_RECORD_MISSING');const event=page.items[0],receipt=await s.get('receipts',event.requestId),source=await s.get('sources',event.sourceBinding.id),actual=await hash(await source.blob.arrayBuffer());
  if(actual!==source.hash||receipt.id!==window.__PROBE_INPUT__.requestId)throw new Error('PERSISTENT_IDENTITY_CHANGED');
  window.webkit.messageHandlers.result.postMessage({ok:true,mode,eventId:event.id,requestId:receipt.id,sourceHash:actual,originalBytes:source.blob.size,noUploadReplay:true});
 }
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
