(async()=>{
 const {RecordStore}=await import('/storage/store.js');
 const ok=(value,message)=>{if(!value)throw Error(message);},pause=ms=>new Promise(r=>setTimeout(r,ms)),stores=[],handles=[],results={};
 const name=label=>'ptds-r14-lifecycle-'+label+'-'+crypto.randomUUID();
 const own=n=>{const store=new RecordStore(n);stores.push(store);return store;};
 const settle=async promise=>{let timer;try{return await Promise.race([promise.then(value=>{if(value?.close)handles.push(value);return {state:'fulfilled',value};},error=>({state:'rejected',error:error.message})),new Promise(resolve=>{timer=setTimeout(()=>resolve({state:'pending'}),1500);})]);}finally{clearTimeout(timer);}};
 const nativeOpen=(n,version)=>new Promise((resolve,reject)=>{const q=version===undefined?indexedDB.open(n):indexedDB.open(n,version);q.onupgradeneeded=event=>{if(event.oldVersion===0||!q.result.objectStoreNames.length)q.result.createObjectStore('sentinel');};q.onsuccess=()=>{handles.push(q.result);resolve(q.result);};q.onerror=()=>reject(q.error);});
 try{
  const closed=own(name('closed')),opening=closed.open(),closedResult=settle(opening);closed.close();const first=await closedResult;await pause(20);
  results.closedOpen={state:first.state,error:first.error,connectionResurrected:!!closed.connection};
  const race=own(name('reopen')),old=settle(race.open());race.close();const current=await settle(race.open());const oldResult=await old;
  results.reopen={oldState:oldResult.state,oldError:oldResult.error,currentState:current.state,currentOwner:race.connection===current.value};
  const blockedName=name('blocked'),blocker=await nativeOpen(blockedName,1),blocked=own(blockedName);
  const abandoned=await settle(blocked.open(2));blocked.close();blocker.close();
  const inspect=await nativeOpen(blockedName);results.blocked={state:abandoned.state,error:abandoned.error,version:inspect.version,hasProductStores:inspect.objectStoreNames.contains('meta'),sentinel:inspect.objectStoreNames.contains('sentinel')};inspect.close();
  const lateName=name('late-blocked'),lateBlocker=await nativeOpen(lateName,1);let lateStates=0;
  const late=new RecordStore(lateName,()=>lateStates++);stores.push(late);const lateResult=settle(late.open(2));late.close();const stopped=await lateResult;await pause(30);lateBlocker.close();
  const lateInspect=await nativeOpen(lateName);lateInspect.close();results.lateBlocked={state:stopped.state,error:stopped.error,stateCallbacksAfterClose:lateStates};
  const queuedName=name('queued'),queued=own(queuedName),pending=settle(queued.meta({id:'fictional-queued-write',value:1}));queued.close();
  const queuedResult=await pending;const reader=own(queuedName),value=await reader.get('meta','fictional-queued-write');
  results.queuedWrite={state:queuedResult.state,error:queuedResult.error,persisted:!!value};
  // close is not cancellation of a transaction which has already started.
  const activeName=name('active'),active=own(activeName);
  const committed=await active.tx(['meta'],'readwrite',api=>{api.store('meta').put({id:'fictional-active-write',value:7});active.close();api.result('committed');});
  const activeReader=own(activeName);results.activeWrite={result:committed,persisted:(await activeReader.get('meta','fictional-active-write'))?.value===7};
  if(window.__PROBE_INPUT__.mode==='baseline'){window.webkit.messageHandlers.result.postMessage({ok:true,identity:'original lifecycle capture only, not repair PASS',results});return;}
  ok(results.closedOpen.state==='rejected'&&results.closedOpen.error==='STORE_CLOSED'&&!results.closedOpen.connectionResurrected,'CLOSED_STORE_RESURRECTED '+JSON.stringify(results.closedOpen));
  ok(results.reopen.oldState==='rejected'&&results.reopen.oldError==='STORE_CLOSED'&&results.reopen.currentState==='fulfilled'&&results.reopen.currentOwner,'OLD_OPEN_STOLE_NEW_OWNER');
  ok(results.blocked.state==='rejected'&&results.blocked.error.includes('UPGRADE_BLOCKED')&&results.blocked.version===1&&results.blocked.sentinel&&!results.blocked.hasProductStores,'ABANDONED_UPGRADE_CHANGED_SCHEMA '+JSON.stringify(results.blocked));
  ok(results.lateBlocked.state==='rejected'&&results.lateBlocked.error==='STORE_CLOSED'&&results.lateBlocked.stateCallbacksAfterClose===0,'CLOSED_STORE_EMITTED_LATE_STATE '+JSON.stringify(results.lateBlocked));
  ok(results.queuedWrite.state==='rejected'&&results.queuedWrite.error==='STORE_CLOSED'&&!results.queuedWrite.persisted,'CLOSED_STORE_QUEUED_WRITE_COMMITTED '+JSON.stringify(results.queuedWrite));
  ok(results.activeWrite.result==='committed'&&results.activeWrite.persisted,'CLOSE_CANCELLED_STARTED_TRANSACTION');
  window.webkit.messageHandlers.result.postMessage({ok:true,identity:'author actual IDB lifecycle on isolated fictional databases; no patient data',results});
 }finally{for(const s of stores)s.close();for(const db of handles)db.close();}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
