(async()=>{
 window.confirm=()=>true;
 const $=s=>document.querySelector(s),pause=ms=>new Promise(r=>setTimeout(r,ms));
 const ok=(value,message)=>{if(!value)throw Error(message);};
 const wait=async fn=>{for(let n=0;n<500;n++){if(fn())return;await pause(10);}throw Error('WAIT '+fn);};
 const mode=window.__PROBE_INPUT__.mode;
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js');
 const store=new RecordStore(),service=new RecordService(store);
 try{
  if(mode.startsWith('ocr-')){
   const blob=await(await fetch('/fixture.png')).blob();
   $('[data-nav="capture"]').click();await wait(()=>$('#image'));
   const dt=new DataTransfer();dt.items.add(new File([blob],'fictional.png',{type:'image/png'}));$('#image').files=dt.files;$('#image').dispatchEvent(new Event('change'));await wait(()=>$('#source-name').textContent==='fictional.png');
   $('#upload-consent').checked=true;$('#trial-token').value='fictional';
   const originalFetch=window.fetch;let resolveRequest,signal,requests=0;
   window.fetch=(url,options)=>url==='/api/ocr'?(requests++,signal=options.signal,new Promise(resolve=>resolveRequest=resolve)):originalFetch(url,options);
   const originalSource=RecordService.prototype.source;let hashing=false,releaseHash;
   if(mode==='ocr-hash-edit')RecordService.prototype.source=async function(...args){hashing=true;await new Promise(resolve=>releaseHash=resolve);return originalSource.apply(this,args);};
   const response=()=>new Response(JSON.stringify({ledger:{version:'ocr-ledger/1',provider:'fictional',region:'local',rawText:'CRP 3.4 mg/L',lines:[{id:'line_0001',order:0,text:'CRP 3.4 mg/L',page:1,confidence:null,coordinates:null}]}}),{status:200});
   try{
    $('#ocr').click();await wait(()=>requests===1);
    if(mode==='ocr-hash-edit'){resolveRequest(response());await wait(()=>hashing);}
    $('#start-review').click();$('#add-metric').click();$('.metric-value').value='77.00';$('.metric-value').dispatchEvent(new Event('input',{bubbles:true}));$('#note').value='latest manual edit';$('#note').dispatchEvent(new Event('input',{bubbles:true}));
    if(mode==='ocr-hash-edit')releaseHash();else resolveRequest(response());
    await pause(100);
    ok($('.metric-value')?.value==='77.00'&&document.querySelectorAll('.metric-row').length===1,'OCR_OVERWROTE_NEW_MANUAL_EDIT');
    ok($('#note').value==='latest manual edit'&&!$('#review-step').hidden,'OCR_CHANGED_NEW_EDITOR');
    ok(signal.aborted&&!$('#ocr').disabled,'EDIT_DID_NOT_CANCEL_OLD_OCR');
    ok(requests===1&&(await store.page()).items.length===0,'OCR_RETRY_OR_AUTOSAVE');
   }finally{releaseHash?.();window.fetch=originalFetch;RecordService.prototype.source=originalSource;}
  }else{
   let r=await service.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:'REAL',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'fictional',observations:[{code:'crp',displayName:'C反应蛋白',valueLiteral:'18',unit:'mg/L',context:'LAB',sourceLineIds:[]}]});r=await service.confirm(r,true);await service.save(r);
   $('[data-nav="consultation"]').click();await wait(()=>$('#generate-consultation'));
   const checkbox=$('.consult-select');checkbox.checked=true;checkbox.dispatchEvent(new Event('change'));$('#generate-consultation').click();await wait(()=>!$('#consult-card-step').hidden);await wait(()=>$('#draft-save-status').textContent==='已保存到本机。');
   $('#consultation-text').value+='\nlocal text to preserve';$('#consultation-text').dispatchEvent(new Event('input'));await wait(()=>$('#draft-save-status').textContent==='已保存到本机。');
   const local=$('#consultation-text').value;
   if(mode==='reload-error'){
    const unhandled=[];window.addEventListener('unhandledrejection',e=>{unhandled.push(String(e.reason));e.preventDefault();});
    const snap=await store.readConsultationDraft();await store.writeConsultationDraft({...snap.draft,text:'other page text'},{context:snap.context,revision:snap.draft.revision},'other-page');await wait(()=>!$('#draft-reload').hidden);
    const originalRead=RecordStore.prototype.readConsultationDraft;let rejected=false;
    RecordStore.prototype.readConsultationDraft=async function(){rejected=true;throw Error('DRAFT_CHANGED_TRY_AGAIN');};
    try{$('#draft-reload').click();await wait(()=>rejected);await pause(80);ok(unhandled.length===0,'RELOAD_REJECTION_ESCAPED_UI');ok($('#notice').textContent.includes('草稿刚有更新'),'RELOAD_FAILURE_NOT_VISIBLE');ok($('#consultation-text').value===local&&!$('#draft-reload').hidden,'RELOAD_FAILURE_LOST_LOCAL_TEXT');}
    finally{RecordStore.prototype.readConsultationDraft=originalRead;}
    $('#draft-reload').click();await wait(()=>$('#consultation-text').value==='other page text');
   }else{
    $('#back-selection').click();
    const originalSnapshot=RecordStore.prototype.selectedSnapshot;let captured=false,release;
    RecordStore.prototype.selectedSnapshot=async function(ids){const snapshot=await originalSnapshot.call(this,ids);captured=true;await new Promise(resolve=>release=resolve);return snapshot;};
    try{
     $('#generate-consultation').click();await wait(()=>captured);
     if(mode==='consult-edit'){$('#open-consultation').click();$('#consultation-text').value=local+'\nnewest manual addition';$('#consultation-text').dispatchEvent(new Event('input'));}
     else{const snap=await store.readConsultationDraft();await store.writeConsultationDraft({...snap.draft,text:'other page text'},{context:snap.context,revision:snap.draft.revision},'other-page');await wait(()=>!$('#draft-reload').hidden);}
     release();await wait(()=>!$('#generate-consultation').disabled||$('#consultation-status').textContent!=='正在整理…');await pause(50);
     ok($('#consultation-text').value===(mode==='consult-edit'?local+'\nnewest manual addition':local),mode==='consult-edit'?'GENERATION_OVERWROTE_NEW_MANUAL_EDIT':'GENERATION_OVERWROTE_CONFLICTING_TEXT');
     ok($('#consultation-status').textContent!=='正在整理…','OBSOLETE_GENERATION_STUCK_PROCESSING');
     ok($('#generate-consultation').disabled===(mode!=='consult-edit'),'CONFLICTED_GENERATION_STILL_ENABLED');
     if(mode!=='consult-edit'){ok(!$('#draft-reload').hidden,'GENERATION_HID_EXTERNAL_CONFLICT');ok((await store.readConsultationDraft()).draft.text==='other page text','GENERATION_REPLAYED_CONFLICTING_WRITE');}
    }finally{release?.();RecordStore.prototype.selectedSnapshot=originalSnapshot;}
   }
  }
  window.webkit.messageHandlers.result.postMessage({ok:true,mode,actualProviderCalls:0,identity:'author isolated fictional actual UI ordering; not physical, human or clinical acceptance'});
 }finally{store.close();}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
