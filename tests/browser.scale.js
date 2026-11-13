let scalePhase='starting';
(async()=>{
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),{hash}=await import('/domain/model.js');
 const {exportBackup,inspectBackup,restoreBackup}=await import('/storage/backup.js');
 const s=new RecordStore('ptds-scale-v1'),svc=new RecordService(s),target=Number(window.__PROBE_INPUT__.target);await s.open();
 scalePhase='read-count';let snap=await s.snapshot(),count=snap.events.length;snap=null;let original=null;
 if(count<10){const blob=await(await fetch('/fixture.png')).blob();original=new File([blob],'scale-synthetic.png',{type:'image/png'});}
 const start=performance.now();
 async function add(n){
  const source=n<10?await svc.source(original):null;
  scalePhase='stage-'+n;let review=await svc.stage({clinicalDate:'2020-'+String(1+Math.floor(n/28)%12).padStart(2,'0')+'-'+String(n%28+1).padStart(2,'0'),instanceTimezone:'Asia/Shanghai',documentKind:source?'lab':'manual',nature:'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'synthetic scale '+n,observations:[{code:'crp',displayName:'C反应蛋白',valueLiteral:String(n%100)+'.00',unit:'mg/L',context:'LAB',sourceLineIds:[]}]},source);
  review=await svc.confirm(review,true);await svc.save(review);
 }
 // Bounded independent synthetic callers, each still traverses stage/confirm/save. No direct fixture insert.
 for(let n=count;n<target;n+=10)await Promise.all(Array.from({length:Math.min(10,target-n)},(_,i)=>add(n+i)));
 scalePhase='first-page';const insertMs=performance.now()-start,times=[];for(let i=0;i<25;i++){const t=performance.now(),p=await s.page();if(p.items.length>50)throw new Error('PAGE_UNBOUNDED');times.push(performance.now()-t);}
 scalePhase='pagination';let seen=new Set(),next=null,pages=0;do{const p=await s.page({before:next});pages++;for(const e of p.items){if(seen.has(e.id))throw new Error('PAGINATION_DUPLICATE');seen.add(e.id);}next=p.next;}while(next);
 if(seen.size!==target)throw new Error('PAGINATION_MISSING');
 const day=await s.page({date:'2020-01-01'});if(day.items.some(e=>e.payload.clinicalDate!=='2020-01-01'))throw new Error('DATE_INDEX_WRONG');
 const result={ok:true,target,added:target-count,insertMs,pages,p95Ms:times.sort((a,b)=>a-b)[Math.ceil(times.length*.95)-1],latenciesMs:times,device:navigator.userAgent};
 if(target===1000||target===10000){
  scalePhase='backup';const t=performance.now(),backup=await exportBackup(s,'synthetic-scale-password');result.exportMs=performance.now()-t;result.encryptedBytes=backup.size;
  const restored=new RecordStore('ptds-scale-restore-'+target);await restored.open();const check=await inspectBackup(backup,'synthetic-scale-password',restored);const imp=await restoreBackup(restored,check);result.restoreMs=performance.now()-t-result.exportMs;result.originalBytes=check.summary.bytes;result.originalCount=check.summary.originals;if(imp.added!==target||check.summary.originals!==10)throw new Error('SCALE_RESTORE_COUNT');
  const restoreSnap=await restored.snapshot();for(const source of restoreSnap.sources)if(await hash(await source.blob.arrayBuffer())!==source.hash)throw new Error('SCALE_ORIGINAL_HASH');
  restored.close();
 }
 s.close();window.webkit.messageHandlers.result.postMessage(result);
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,name:e.name,phase:scalePhase,stack:e.stack}));
