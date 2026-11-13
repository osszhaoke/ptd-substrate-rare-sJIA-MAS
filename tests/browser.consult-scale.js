(async()=>{
 const {RecordStore}=await import('/storage/store.js'),{deidentifiedDraft,consultationPrompt}=await import('/features/consultation.js');
 const target=Number(window.__PROBE_INPUT__.target),store=new RecordStore('ptds-state-scale-v2');await store.open();
 const count=await store.tx(['events'],'readonly',a=>{a.store('events').count().onsuccess=e=>a.result(e.target.result);});if(count!==target)throw Error('MISSING_STAGE_CONFIRM_SAVE_SCALE_FIXTURE');
 const pageTimes=[],selectionTimes=[];let textBytes=0;
 for(let i=0;i<15;i++){
  let t=performance.now();const page=await store.page();pageTimes.push(performance.now()-t);if(page.items.length!==50)throw Error('PAGE_NOT_BOUNDED');
  t=performance.now();const snapshot=await store.selectedSnapshot(page.items.map(e=>e.id));const draft=deidentifiedDraft({},snapshot.events),prompt=consultationPrompt(draft.text);selectionTimes.push(performance.now()-t);
  if(snapshot.events.length!==50||!snapshot.revision||!prompt.includes(draft.text)||prompt.includes('synthetic scale')||prompt.includes('2020-'))throw Error('SCALE_PROJECTION_INTEGRITY');textBytes=new TextEncoder().encode(prompt).length;
 }
 let rejected=false;try{await store.selectedSnapshot(Array.from({length:51},()=>crypto.randomUUID()));}catch(e){rejected=e.message==='SELECTION_LIMIT';}if(!rejected)throw Error('SELECTION_LIMIT_LOST');
 const p95=a=>[...a].sort((a,b)=>a-b)[Math.ceil(a.length*.95)-1],result={ok:p95(pageTimes)<=250&&p95(selectionTimes)<=250,target,pageP95Ms:p95(pageTimes),selectionAndPromptP95Ms:p95(selectionTimes),selected:50,promptBytes:textBytes,pageTimes,selectionTimes,fixture:'same fresh profile as preceding state-scale, all records via stage/confirm/save',memory:'one page + at most 50 selected events; no Blob reads'};
 if(!result.ok)result.error='CONSULT_SCALE_TARGET_NOT_MET';store.close();window.webkit.messageHandlers.result.postMessage(result);
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
