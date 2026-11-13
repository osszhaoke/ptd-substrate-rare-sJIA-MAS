(async()=>{
 const input=window.__PROBE_INPUT__,mode=input.mode;
 const wait=async f=>{for(let i=0;i<500;i++){if(await f())return;await new Promise(r=>setTimeout(r,20));}throw new Error('UPGRADE_WAIT_TIMEOUT');};
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),{hash}=await import('/domain/model.js');const s=new RecordStore(),svc=new RecordService(s);
 let receipt,source;
 if(mode==='prime'){
  await wait(()=>document.querySelector('#start'));document.querySelector('#local-consent').checked=true;document.querySelector('#timezone').value='Asia/Shanghai';document.querySelector('#start').click();await wait(()=>document.querySelectorAll('[data-state-rule]').length===3);
  const blob=await(await fetch('/fixture.png')).blob();source=await svc.source(new File([blob],'upgrade-original.png',{type:'image/png'}));let r=await svc.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'lab',nature:'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'synthetic upgrade persistence',observations:[]},source);r=await svc.confirm(r,true);receipt=await svc.save(r);await navigator.serviceWorker.ready;
 }else if(mode==='wait-update'){
  const reg=await navigator.serviceWorker.ready;await reg.update();await wait(()=>reg.waiting);const p=await s.page();if(p.items.length!==1)throw new Error('UPDATE_LOST_DATA');
 }else{
  await wait(()=>document.title.includes(input.title));const page=await s.page();if(page.items.length!==1)throw new Error('UPGRADE_RECORD_LOST');const e=page.items[0];receipt=await s.get('receipts',e.requestId);source=await s.get('sources',e.sourceBinding.id);if(await hash(await source.blob.arrayBuffer())!==input.sourceHash||receipt.id!==input.requestId)throw new Error('UPGRADE_ORIGINAL_CHANGED');
 }
 window.webkit.messageHandlers.result.postMessage({ok:true,mode,title:document.title,receipt,sourceHash:source?.hash});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
