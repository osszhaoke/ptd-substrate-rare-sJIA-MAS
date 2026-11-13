(async()=>{
 const input=window.__PROBE_INPUT__,text='不同PID重开后逐字读回：复查时间？',refreshKey='ptds-fictional-refresh-case';
 const $=s=>document.querySelector(s),wait=async f=>{for(let i=0;i<500;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('WAIT '+f);};
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js');
 const store=new RecordStore(),write=input.mode==='write'||input.mode==='refresh'&&!sessionStorage.getItem(refreshKey);
 if(write){
  await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
  const svc=new RecordService(store);let r=await svc.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'fictional reopen fixture',observations:[]});r=await svc.confirm(r,true);await svc.save(r);
  $('[data-nav="consultation"]').click();await wait(()=>$('.consult-select'));$('.consult-select').checked=true;$('.consult-select').dispatchEvent(new Event('change'));$('#generate-consultation').click();await wait(()=>!$('#consult-card-step').hidden);
  $('#consultation-text').value=text;$('#consultation-text').dispatchEvent(new Event('input'));await wait(()=>$('#draft-save-status').textContent.includes('已保存'));
  // A currently active generation write must also finish the newer input before the saved label appears.
  for(let i=0;i<500;i++){if((await store.readConsultationDraft()).draft?.text===text)break;await new Promise(r=>setTimeout(r,10));}
  if(input.mode==='refresh'){sessionStorage.setItem(refreshKey,'ready');store.close();location.reload();return;}
 }else{
  await wait(()=>$('.state-overview'));$('[data-nav="consultation"]').click();await wait(()=>$('#consultation-text')&&!$('#consult-card-step').hidden);
 }
 const saved=await store.readConsultationDraft();
 if($('#consultation-text').value!==text||saved.draft?.text!==text||!$('#ai-prompt').value.includes(text)||!$('.consult-select').checked)throw Error('COMMITTED_DRAFT_LOST_ON_REOPEN');
 const result={ok:true,mode:input.mode,text,revision:saved.draft.revision,actualPageReload:input.mode==='refresh',identity:'actual consultation UI after saved state; fictional profile'};store.close();window.webkit.messageHandlers.result.postMessage(result);
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
