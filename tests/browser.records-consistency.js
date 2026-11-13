(async()=>{
 window.confirm=()=>true;
 const $=s=>document.querySelector(s),pause=ms=>new Promise(r=>setTimeout(r,ms));
 const ok=(x,message)=>{if(!x)throw Error(message);};
 const wait=async fn=>{for(let n=0;n<500;n++){if(fn())return;await pause(10);}throw Error('WAIT '+fn);};
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js');
 const store=new RecordStore(),service=new RecordService(store),mode=window.__PROBE_INPUT__.mode||'intervening-write';
 const save=async note=>{let review=await service.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:'REAL',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note,observations:[{code:'crp',displayName:'C反应蛋白',valueLiteral:'18',unit:'mg/L',context:'LAB',sourceLineIds:[]}]});review=await service.confirm(review,true);return service.save(review);};
 const original=RecordStore.prototype.page;
 let release,captured=false,pageCalls=0,hold=true;
 try{
  const first=await save('first fictional event');
  if(mode==='page-snapshot'){
   const tx=store.tx.bind(store);
   const page=await original.call(store),revision=(await store.get('meta','data-revision')).value;
   // Record the page transaction separately; the following meta read has its own scope.
   let pageScope;store.tx=(names,access,...rest)=>{pageScope={names,access};return tx(names,access,...rest);};
   const pinned=await original.call(store);
   ok(pageScope.access==='readonly'&&pageScope.names.includes('events')&&pageScope.names.includes('meta'),'PAGE_VERSION_OUTSIDE_CONTENT_TRANSACTION');
   ok(page.revision===revision&&pinned.revision===revision&&pinned.items.length===1,'PAGE_REVISION_DOES_NOT_IDENTIFY_ROWS');
   await save('second fictional event');const newer=await original.call(store);
   ok(pinned.items.length===1&&pinned.items[0].id===first.eventId&&newer.items.length===2&&newer.revision!==pinned.revision,'PAGE_SNAPSHOT_CHANGED_AFTER_COMMIT');
   window.webkit.messageHandlers.result.postMessage({ok:true,mode,identity:'actual readonly events/meta transaction with fictional service commits'});return;
  }
  $('[data-nav="settings"]').click();await wait(()=>$('#export'));
  RecordStore.prototype.page=async function(...args){
   const page=await original.apply(this,args);pageCalls++;
   if(mode==='continuous')await save('continuous fictional event '+pageCalls);
   if(hold){hold=false;captured=true;await new Promise(resolve=>release=resolve);}
   return page;
  };
  $('[data-nav="records"]').click();await wait(()=>captured);
  const second=await save('second fictional event');
  // Allow the real cross-connection BroadcastChannel notification to be delivered.
  await pause(60);
  if(mode==='queued-navigation')$('[data-nav="capture"]').click();
  release();
  if(mode==='queued-navigation'){
   await wait(()=>$('#image'));await pause(80);
   ok(!!$('#image')&&!$('.timeline'),'REFRESH_OVERRODE_USER_NAVIGATION');
  }else if(mode==='continuous'){
   await wait(()=>$('#notice').textContent.includes('病程接连有更新'));
   ok(pageCalls===3&&!$('.timeline'),'CONTINUOUS_CHANGE_PUBLISHED_STALE_PAGE');
   const stopped=pageCalls;await pause(80);ok(pageCalls===stopped,'CONTINUOUS_CHANGE_STARTED_BACKGROUND_RETRY');
   $('[data-nav="capture"]').click();await wait(()=>$('#image'));
  }else{
   await wait(()=>$('.timeline'));await pause(100);
   const ids=[...document.querySelectorAll('.open-event')].map(el=>el.dataset.id);
   ok(ids.includes(first.eventId)&&ids.includes(second.eventId)&&ids.length===2,'HOME_PUBLISHED_OLD_TIMELINE');
   ok(pageCalls>=2&&pageCalls<=3,'HOME_READ_NOT_BOUNDED_OR_NOT_REFRESHED');
  }
  ok((await original.call(store)).items.length===(mode==='continuous'?2+pageCalls:2),'REFRESH_WROTE_OR_LOST_RECORDS');
  window.webkit.messageHandlers.result.postMessage({ok:true,mode,pageCalls,actualProviderCalls:0,identity:'author fictional actual UI and service writes; not real-device, independent or clinical acceptance'});
 }finally{release?.();RecordStore.prototype.page=original;store.close();}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
