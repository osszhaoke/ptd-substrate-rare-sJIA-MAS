(async()=>{
 const $=selector=>document.querySelector(selector),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async fn=>{for(let i=0;i<5000;i++){if(fn())return;await new Promise(r=>setTimeout(r,15));}throw Error('PHONE_TOOL_WAIT '+String(fn));};
 await wait(()=>$('#records1000')&&typeof $('#records1000').onclick==='function'&&!$('#records1000').disabled);
 const phase=sessionStorage.getItem('phone-tool-test-phase');
 const {RecordStore}=await import('/storage/store.js');
 const sentinel=new RecordStore();await sentinel.meta({id:'fictional-sentinel',unchanged:'synthetic default database must not be touched'});sentinel.close();
 $('#device').value='Mac WebKit automated harness control, NOT iPhone';$('#consent').checked=true;window.confirm=()=>true;
 if(!phase){
  $('#records1000').click();await wait(()=>$('#result').textContent.includes('PASS_THIS_RUN'));
  const result=JSON.parse($('#result').textContent);ok(result.target===1000&&result.sourceIdentity,'fixture/restore not checked');
  ok(result.totalBrowserMemoryPeak==='UNMEASURED'&&result.processReopen==='NOT_TESTED','false phone/memory acceptance');
  ok(result.actualQuotaExhaustion==='NOT_TESTED','injected quota passed as physical quota');
  sessionStorage.setItem('phone-tool-test-phase','read');location.reload();return;
 }
 $('#reopen').click();await wait(()=>$('#result').textContent.includes('reloadedReadback'));
 const result=JSON.parse($('#result').textContent);ok(result.reloadedReadback==='PASS'&&result.processReopen==='NOT_CONFIRMED','reload treated as process restart');
 $('#cleanup').click();await wait(()=>$('#progress').textContent.includes('已删除'));
 const check=new RecordStore();ok((await check.get('meta','fictional-sentinel')).unchanged==='synthetic default database must not be touched','cleanup touched default store');check.close();
 ok(!localStorage.getItem('ptds-phone-r07-owned-run'),'test journal not cleared');
 sessionStorage.removeItem('phone-tool-test-phase');
 window.webkit.messageHandlers.result.postMessage({ok:true,identity:'Mac WebKit harness behavior only; not physical phone acceptance',records:1000,readback:'actual page reload',defaultDatabaseUntouched:true,ownedCleanupOnly:true,totalBrowserMemoryPeak:'UNMEASURED'});
})().catch(error=>window.webkit.messageHandlers.result.postMessage({ok:false,error:error.message,stack:error.stack}));
