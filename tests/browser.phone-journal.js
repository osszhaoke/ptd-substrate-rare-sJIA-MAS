(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async f=>{for(let i=0;i<1000;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('PHONE_JOURNAL_WAIT '+String(f));};
 await wait(()=>$('#records1000')&&typeof $('#records1000').onclick==='function'&&!$('#records1000').disabled);
 const {RecordStore}=await import('/storage/store.js');
 const nativeSet=Storage.prototype.setItem,nativeOpen=RecordStore.prototype.open;
 let ownedOpens=0,downloaded=null,injected=0;
 RecordStore.prototype.open=function(...args){if(this.name.startsWith('ptds-phone-r07-'))ownedOpens++;return nativeOpen.apply(this,args);};
 Storage.prototype.setItem=function(key,value){if(key==='ptds-phone-r07-owned-run'){injected++;throw new DOMException('fictional metadata quota','QuotaExceededError');}return nativeSet.call(this,key,value);};
 try{
  $('#device').value='Mac WebKit journal quota injection, NOT iPhone';$('#consent').checked=true;$('#records1000').click();
  await wait(()=>!$('#records1000').disabled&&$('#cancel').disabled);
  ok(injected>0,'journal fault did not actually trigger');ok($('#result').textContent.trim().length>0,'failed journal erased visible test evidence');
  const report=JSON.parse($('#result').textContent);ok(report.status!=='PASS_THIS_RUN','failed journal marked success');
  ok(report.journalPersistence==='FAILED'&&ownedOpens===0,'continued filling a device with no result journal');
  const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;
  URL.createObjectURL=blob=>{downloaded=blob;return create(blob);};HTMLAnchorElement.prototype.click=function(){};
  try{$('#download').click();await wait(()=>downloaded);}finally{URL.createObjectURL=create;HTMLAnchorElement.prototype.click=click;}
  const saved=JSON.parse(await downloaded.text());ok(saved.runId===report.runId&&saved.journalPersistence==='FAILED','download did not preserve in-memory failure evidence');
  window.webkit.messageHandlers.result.postMessage({ok:true,identity:'Mac fictional localStorage quota injection, not physical exhaustion',ownedDatabasesOpened:ownedOpens,failureEvidenceVisible:true,inMemoryFailureDownload:true});
 }finally{Storage.prototype.setItem=nativeSet;RecordStore.prototype.open=nativeOpen;}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
