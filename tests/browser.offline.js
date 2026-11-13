(async()=>{
 const wait=async f=>{for(let i=0;i<500;i++){if(await f())return;await new Promise(r=>setTimeout(r,20));}throw new Error('OFFLINE_WAIT_TIMEOUT');};
 const mode=window.__PROBE_INPUT__.mode;
 if(mode==='prime'){
  const registration=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
  const keys=await caches.keys();const cache=await caches.open(keys.find(k=>k.startsWith('ptds-h5-')));const requests=await cache.keys();if(requests.some(r=>r.url.includes('/api/')))throw new Error('API_CACHED');
  if(!document.querySelector('#start'))throw new Error('SETUP_MISSING');document.querySelector('#local-consent').checked=true;document.querySelector('#timezone').value='Asia/Shanghai';document.querySelector('#start').click();await wait(()=>document.querySelectorAll('[data-state-rule]').length===3);
  window.webkit.messageHandlers.result.postMessage({ok:true,mode,cacheEntries:requests.length,apiCached:false});
 }else{
  await wait(()=>document.querySelectorAll('[data-state-rule]').length===3);document.querySelector('[data-nav="capture"]').click();await wait(()=>document.querySelector('#start-review'));document.querySelector('#start-review').click();await wait(()=>!document.querySelector('#review-step').hidden);document.querySelector('#note').value='synthetic offline cold start';document.querySelector('#note').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#prepare-review').click();await wait(()=>!document.querySelector('#confirmed').disabled);document.querySelector('#confirmed').checked=true;document.querySelector('#confirmed').dispatchEvent(new Event('change'));document.querySelector('#save').click();await wait(()=>document.querySelector('#delete-record'));
  const {RecordStore}=await import('/storage/store.js');const s=new RecordStore();const p=await s.page();if(!p.items.some(e=>e.payload.note==='synthetic offline cold start'))throw new Error('OFFLINE_SAVE_MISSING');window.webkit.messageHandlers.result.postMessage({ok:true,mode,shellLoaded:true,offlineManualSave:true,records:p.items.length});
 }
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
