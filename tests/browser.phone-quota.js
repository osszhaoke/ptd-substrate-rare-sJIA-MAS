(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async f=>{for(let i=0;i<3000;i++){if(f())return;await new Promise(r=>setTimeout(r,15));}throw Error('PHONE_QUOTA_WAIT '+String(f));};
 await wait(()=>$('#quota')&&typeof $('#quota').onclick==='function'&&!$('#quota').disabled);
 $('#device').value='Mac WebKit fictional quota injection, NOT iPhone';$('#consent').checked=true;window.confirm=()=>true;
 $('#quota').click();await wait(()=>$('#result').textContent.includes('PASS_THIS_RUN'));
 const report=JSON.parse($('#result').textContent);
 ok(report.mode==='quota-simulation'&&report.simulatedQuotaRollback?.results.length===3,'rollback cases missing');
 ok(report.simulatedQuotaRollback.results.every(x=>x.allStoresRolledBack),'partial restore retained');
 ok(report.actualQuotaExhaustion==='NOT_TESTED'&&report.totalBrowserMemoryPeak==='UNMEASURED','physical acceptance invented');
 $('#cleanup').click();await wait(()=>$('#progress').textContent.includes('已删除'));
 window.webkit.messageHandlers.result.postMessage({ok:true,identity:'Mac WebKit injected faults only, not physical low storage',cases:report.simulatedQuotaRollback.results,successfulRestoreAfterFaults:true,ownedCleanup:true});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
