(async()=>{
 const {RecordStore}=await import('/storage/store.js');
 const {ConsultationDraft}=await import('/app/consultation_draft.js');
 const store=new RecordStore('ptds-r15-draft-races-'+crypto.randomUUID());
 const a=new ConsultationDraft(store),writer='fictional-competing-page';
 const unsubscribe=store.subscribe(message=>a.external(message));
 const ok=(value,message)=>{if(!value)throw Error(message);};
 try{
  await a.load();const write=store.writeConsultationDraft.bind(store);let injected=false,writes=0;
  store.writeConsultationDraft=async(value,expected,writerId)=>{
   writes++;const ownSaved=await write(value,expected,writerId);
   if(!injected&&writerId===a.writerId){
    injected=true;
    // Two actual CAS transactions. Deliver the competitor's real notification before the old result returns.
    await write({...value,text:'newer text from competing page'},{context:expected.context,revision:ownSaved.revision},writer);
   }
   return ownSaved;
  };
  a.edit({text:'local text must remain available'});const result=await a.flush();
  const snapshot=await store.readConsultationDraft();
  const capture={result,status:a.status,unsaved:a.unsaved,localText:a.value.text,persistedText:snapshot.draft.text,injected,writes};
  if(window.__PROBE_INPUT__.mode==='baseline'){
   window.webkit.messageHandlers.result.postMessage({ok:true,identity:'original actual IDB behavior capture; not repair PASS',capture});return;
  }
  ok(injected&&snapshot.draft.text==='newer text from competing page','COMPETING_CAS_NOT_EXERCISED');
  ok(result===false&&a.status==='conflict'&&a.unsaved,'SAVED_AFTER_COMPETING_DRAFT '+JSON.stringify(capture));
  ok(a.value.text==='local text must remain available'&&writes===1,'CONFLICT_TEXT_LOST_OR_WRITE_REPLAYED');
  // Only explicit reload adopts the other page, then a normal edit can save once.
  await a.reload();ok(a.value.text===snapshot.draft.text&&a.status==='saved','EXPLICIT_RELOAD_FAILED');
  a.edit({text:'explicit post-reload edit'});ok(await a.flush(),'NORMAL_SAVE_FAILED');
  ok((await store.readConsultationDraft()).draft.text==='explicit post-reload edit'&&writes===2,'NORMAL_SAVE_REPLAYED');
  window.webkit.messageHandlers.result.postMessage({ok:true,identity:'author actual IDB draft CAS and notification race; isolated fictional database',capture});
 }finally{unsubscribe();a.dispose();store.close();}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
