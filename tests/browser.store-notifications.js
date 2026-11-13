(async()=>{
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js');
 const ok=(value,message)=>{if(!value)throw Error(message);},pause=ms=>new Promise(r=>setTimeout(r,ms)),stores=[],results={};
 const suppress=e=>{if(String(e.message).includes('fictional observer'))e.preventDefault();};addEventListener('error',suppress);
 const settle=async promise=>{let timer;try{return await Promise.race([promise.then(value=>({state:'fulfilled',value}),error=>({state:'rejected',error:error.message})),new Promise(resolve=>{timer=setTimeout(()=>resolve({state:'pending'}),700);})]);}finally{clearTimeout(timer);}};
 const payload=()=>({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'fictional notification boundary',observations:[]});
 const create=suffix=>{const s=new RecordStore('ptds-r13-notifications-'+crypto.randomUUID()+'-'+suffix);stores.push(s);return s;};
 const save=async store=>{const service=new RecordService(store);let review=await service.stage(payload());review=await service.confirm(review,true);return service.save(review);};
 try{
  const s=create('local');await s.open();let healthy=0,seenMessage;
  s.subscribe(()=>{throw Error('fictional observer local');});s.subscribe(message=>{healthy++;seenMessage=message;});
  const saved=await settle(save(s)),page=await s.page();results.local={promise:saved.state,formalEvents:page.items.length,healthyCalls:healthy,type:seenMessage?.type};
  const broadcast=create('broadcast');await broadcast.open();broadcast.channel.postMessage=()=>{throw Error('fictional observer broadcast');};
  const sent=await settle(save(broadcast));results.broadcast={promise:sent.state,formalEvents:(await broadcast.page()).items.length};
  const receiver=create('remote'),peer=new RecordStore(receiver.name);stores.push(peer);await receiver.open();await peer.open();let remoteHealthy=0;
  receiver.subscribe(()=>{throw Error('fictional observer remote');});receiver.subscribe(message=>{if(message.type==='settings')remoteHealthy++;});peer.changed({type:'settings'});await pause(150);
  results.remote={healthyCalls:remoteHealthy};
  let unhandled=0;const rejectObserver=e=>{unhandled++;e.preventDefault();};addEventListener('unhandledrejection',rejectObserver);
  const asyncStore=create('async');await asyncStore.open();let asyncHealthy=0;
  asyncStore.subscribe(async()=>{throw Error('fictional observer async');});asyncStore.subscribe(()=>asyncHealthy++);
  const asyncSaved=await settle(save(asyncStore));await pause(30);removeEventListener('unhandledrejection',rejectObserver);
  results.async={promise:asyncSaved.state,healthyCalls:asyncHealthy,unhandled,observerFailures:asyncStore.observerFailures};
  const versionStore=new RecordStore('ptds-r13-version-'+crypto.randomUUID(),()=>{throw Error('fictional observer version');});stores.push(versionStore);await versionStore.open();
  const versionNext=await new Promise((resolve,reject)=>{const q=indexedDB.open(versionStore.name,3);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
  results.versionchange={oldConnectionClosed:versionStore.connection===null,observerFailures:versionStore.observerFailures};versionNext.close();
  const blockedName='ptds-r13-blocked-'+crypto.randomUUID();const blocker=await new Promise((resolve,reject)=>{const q=indexedDB.open(blockedName,1);q.onupgradeneeded=()=>q.result.createObjectStore('sentinel');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
  const upgrade=new RecordStore(blockedName,()=>{throw Error('fictional observer blocked');});stores.push(upgrade);
  const blocked=await settle(upgrade.open(2));results.blocked={promise:blocked.state,error:blocked.error};blocker.close();await pause(50);
  // A real quota fault must still reject and atomically roll back; notification isolation is not a success override.
  const quota=create('quota');await quota.open();const nativePut=IDBObjectStore.prototype.put;let injected=0,error;
  IDBObjectStore.prototype.put=function(value){if(this.transaction.db.name===quota.name&&this.name==='meta'){injected++;throw new DOMException('fictional quota','QuotaExceededError');}return nativePut.call(this,value);};
  try{await quota.meta({id:'fictional-quota',value:1});}catch(e){error=e.name;}finally{IDBObjectStore.prototype.put=nativePut;}
  results.quota={injected,error,persisted:!!await quota.get('meta','fictional-quota')};
  if(window.__PROBE_INPUT__.mode==='baseline'){window.webkit.messageHandlers.result.postMessage({ok:true,identity:'original behavior capture, not candidate PASS',results});return;}
  ok(results.local.formalEvents===1&&results.local.promise==='fulfilled','LOCAL_COMMITTED_SAVE_HUNG '+JSON.stringify(results.local));
  ok(results.local.healthyCalls===1&&results.local.type==='clinical','LOCAL_LISTENER_STARVED');
  ok(results.broadcast.formalEvents===1&&results.broadcast.promise==='fulfilled','BROADCAST_COMMITTED_SAVE_HUNG');
  ok(results.remote.healthyCalls===1,'REMOTE_LISTENER_STARVED');
  ok(results.blocked.promise==='rejected'&&results.blocked.error.includes('UPGRADE_BLOCKED'),'BLOCKED_CALLBACK_ERASED_REJECTION');
  ok(results.async.promise==='fulfilled'&&results.async.healthyCalls===1&&results.async.unhandled===0&&results.async.observerFailures===1,'ASYNC_LISTENER_NOT_ISOLATED');
  ok(results.versionchange.oldConnectionClosed&&results.versionchange.observerFailures===1,'VERSION_CALLBACK_NOT_ISOLATED');
  ok(results.quota.injected>0&&results.quota.error&&!results.quota.persisted,'QUOTA_FAILURE_WRONGLY_SUCCEEDED');
  window.webkit.messageHandlers.result.postMessage({ok:true,identity:'author fictional actual IDB commits with notification faults; no real patient data',results});
 }finally{for(const s of stores)s.close();removeEventListener('error',suppress);}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
