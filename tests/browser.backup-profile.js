(async()=>{
 const ok=(v,m)=>{if(!v)throw Error(m);},input=window.__PROBE_INPUT__;
 const {RecordStore}=await import('/storage/store.js'),b=await import('/storage/backup.js'),m=await import('/domain/model.js');
 const source=new RecordStore('ptds-state-scale-v2'),target=new RecordStore('profile-restore-'+crypto.randomUUID());await source.open();await target.open();
 const expected=Number(input.target),count=await source.tx(['events'],'readonly',a=>{a.store('events').count().onsuccess=e=>a.result(e.target.result);});ok(count===expected,'MISSING_FORMAL_SCALE_FIXTURE');
 const beats=[],phases={};let last=performance.now(),phase='',phaseStart=0,frames=0,maxCryptoBytes=0;
 const startPhase=name=>{const now=performance.now();if(phase)phases[phase]=(phases[phase]||0)+(now-phaseStart);phase=name;phaseStart=now;};
 const timer=setInterval(()=>{const now=performance.now();if(beats.length<20000)beats.push({phase,ms:now-last});last=now;},15);
 let exportMs,inspectMs,commitMs,file,inspection,reads=0,readBytes=0,maxReadBytes=0,metadataBlobTexts=0;
 const observe={observe:x=>{frames++;maxCryptoBytes=Math.max(maxCryptoBytes,x.cryptoBytes);},onProgress:p=>{if(p.phase!==phase)startPhase(p.phase);}};
 const nativeText=Blob.prototype.text;
 try{
  startPhase('export');let t=performance.now();file=await b.exportBackup(source,'synthetic-password-123',observe);exportMs=performance.now()-t;
  const tracked={size:file.size,slice(start,end){const blob=file.slice(start,end);return {text:()=>nativeText.call(blob),arrayBuffer:async()=>{reads++;readBytes+=blob.size;maxReadBytes=Math.max(maxReadBytes,blob.size);return blob.arrayBuffer();}};}};
  Blob.prototype.text=function(){metadataBlobTexts++;return nativeText.call(this);};
  startPhase('inspect');t=performance.now();inspection=await b.inspectBackup(tracked,'synthetic-password-123',target,observe);inspectMs=performance.now()-t;
  Blob.prototype.text=nativeText;startPhase('commit');t=performance.now();await b.restoreBackup(target,inspection);commitMs=performance.now()-t;startPhase('done');
 }finally{clearInterval(timer);Blob.prototype.text=nativeText;}
 const data=await target.backupSnapshot();ok(data.events.length===expected,'RESTORE_COUNT');
 const before=await source.backupSnapshot();ok(m.canonical(before.events)===m.canonical(data.events),'RESTORE_EVENT_BYTES');ok(m.canonical(before.receipts)===m.canonical(data.receipts),'RESTORE_RECEIPT_BYTES');
 const p95=a=>a.sort((x,y)=>x-y)[Math.max(0,Math.ceil(a.length*.95)-1)]||0;
 const phaseHeartbeats={};for(const name of new Set(beats.map(x=>x.phase))){const values=beats.filter(x=>x.phase===name).map(x=>x.ms);phaseHeartbeats[name]={samples:values.length,p95Ms:p95(values),maxMs:Math.max(0,...values)};}
 source.close();target.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,identity:'author Mac WebKit fictional profile; not iPhone acceptance',target:expected,exportMs,inspectMs,commitMs,phases,phaseHeartbeats,heartbeatP95Ms:p95(beats.map(x=>x.ms)),heartbeatMaxMs:Math.max(0,...beats.map(x=>x.ms)),heartbeatSamples:beats.length,fileBytes:file.size,fileArrayBufferReads:reads,totalFileReadBytes:readBytes,maxFileReadBytes:maxReadBytes,metadataBlobTexts,frames,maxCryptoBytes,exactEventsAndReceipts:true,totalBrowserMemory:'UNMEASURED'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
