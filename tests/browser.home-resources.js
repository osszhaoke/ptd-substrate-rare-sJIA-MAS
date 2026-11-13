(async()=>{
 window.confirm=()=>true;
 const $=s=>document.querySelector(s),ok=(value,message)=>{if(!value)throw Error(message);};
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const wait=async fn=>{for(let n=0;n<500;n++){if(fn())return;await pause(10);}throw Error('WAIT '+fn);};
 if(window.__PROBE_INPUT__.fontScale)document.documentElement.style.fontSize=window.__PROBE_INPUT__.fontScale+'%';
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.home-resources'));
 const {RecordStore}=await import('/storage/store.js'),{hash}=await import('/domain/model.js');
 const store=new RecordStore(),before=await store.snapshot();
 try{
  const resources=$('.home-resources'),trigger=$('#home-open-qr'),handbook=$('.handbook-card'),dialog=$('#home-qr-dialog'),close=$('#home-close-qr');
  ok(resources.querySelectorAll(':scope>.resource-card').length===2,'RESOURCE_COUNT');
  ok(resources.firstElementChild===trigger&&trigger.nextElementSibling===handbook,'RESOURCE_ORDER');
  ok(!!(resources.compareDocumentPosition($('.state-overview'))&Node.DOCUMENT_POSITION_FOLLOWING),'RESOURCES_NOT_BEFORE_CARDS');
  ok(document.querySelectorAll('[data-state-rule]').length===3,'CARDS_CHANGED');
  ok(handbook.textContent.includes('幼年特发性关节炎患者手册')&&handbook.href==='https://www.kdocs.cn/l/cgZMyp7rdz4g','HANDBOOK_TARGET');
  ok(handbook.target==='_blank'&&handbook.relList.contains('noopener')&&handbook.relList.contains('noreferrer'),'EXTERNAL_LINK_CONTEXT');
  ok(trigger.href!==handbook.href&&new URL(trigger.href).origin===location.origin,'RESOURCES_CONFLATED');
  const response=await fetch(new URL(trigger.href).pathname);ok(response.ok&&response.headers.get('Content-Type').startsWith('image/jpeg'),'QR_STATIC_NOT_SERVED');
  ok(await hash(await response.arrayBuffer())==='48ca5fc890f6b24ac92034b073cd15452b6fe929ceed3a798805857d6518db52','QR_NOT_ORIGINAL');
  await $('.qr-thumbnail').decode();ok($('.qr-thumbnail').naturalWidth===1256,'QR_DIMENSIONS');
  ok(trigger.getBoundingClientRect().height>=48&&handbook.getBoundingClientRect().height>=48,'RESOURCE_HIT_AREA');
  ok(document.documentElement.scrollWidth<=innerWidth+1,'HOME_OVERFLOW');
  // The approved release condition: the actual image click opens the actual original at a larger size.
  for(let n=0;n<3;n++){
   $('.qr-thumbnail').click();await wait(()=>dialog.open);await dialog.querySelector('img').decode();
   ok(dialog.matches(':modal'),'QR_NOT_MODAL');
   ok(dialog.querySelector('img').getBoundingClientRect().width>$('.qr-thumbnail').getBoundingClientRect().width*2,'QR_NOT_ENLARGED');
   const rect=dialog.getBoundingClientRect();ok(rect.left>=0&&rect.right<=innerWidth+1&&rect.top>=0&&rect.bottom<=innerHeight+1,'QR_DIALOG_OUTSIDE_VIEWPORT');
   ok(document.querySelectorAll('#home-qr-dialog').length===1,'DUPLICATE_QR_DIALOG');
   close.click();await wait(()=>!dialog.open);ok(document.activeElement===trigger,'QR_FOCUS_NOT_RESTORED');
  }
  // Old iOS without showModal retains a real local full-image link, rather than a dead button.
  const nativeShow=dialog.showModal;dialog.showModal=undefined;
  const click=new MouseEvent('click',{bubbles:true,cancelable:true});
  let fallbackAllowed=false;const guard=e=>{fallbackAllowed=!e.defaultPrevented;e.preventDefault();};
  trigger.addEventListener('click',guard,{once:true});trigger.dispatchEvent(click);dialog.showModal=nativeShow;
  ok(fallbackAllowed&&!dialog.open,'QR_FALLBACK_LINK_BLOCKED');
  ok(JSON.stringify(await store.snapshot())===JSON.stringify(before),'RESOURCE_ACTIONS_WROTE_RECORDS');
  if(window.__PROBE_INPUT__.screenshot==='qr'){
   trigger.click();await wait(()=>dialog.open);window.scrollTo(0,0);await pause(50);
  }else{
   trigger.click();await wait(()=>dialog.open);
   $('[data-nav="capture"]').onclick();await wait(()=>$('#image'));ok(!dialog.open&&!dialog.isConnected,'LEAVING_HOME_DID_NOT_CLOSE_QR');
   $('[data-nav="records"]').click();await wait(()=>$('.home-resources'));$('#home-open-qr').click();await wait(()=>$('#home-qr-dialog').open);$('#home-close-qr').click();await wait(()=>!$('#home-qr-dialog').open);window.scrollTo(0,0);
  }
  window.webkit.messageHandlers.result.postMessage({ok:true,width:innerWidth,fontScale:window.__PROBE_INPUT__.fontScale||'100',resources:2,originalQrSha256:'48ca5fc890f6b24ac92034b073cd15452b6fe929ceed3a798805857d6518db52',enlargement:'actual image click/three open-close cycles',link:handbook.href,noRecordWrites:true,identity:'author fictional UI; not physical iPhone or independent acceptance'});
 }finally{store.close();}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
