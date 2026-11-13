(async()=>{
 const ok=(v,m)=>{if(!v)throw Error(m);},reject=async(fn,code)=>{let error;try{await fn();}catch(e){error=e;}ok(error&&(error.name===code||error.message===code),'EXPECTED_'+code);};
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),b=await import('/storage/backup.js'),{BackupTask}=await import('/app/backup_task.js');
 const s=new RecordStore('backup-task-source-'+crypto.randomUUID()),svc=new RecordService(s),target=new RecordStore('backup-task-target-'+crypto.randomUUID());await s.open();await target.open();
 for(let i=0;i<12;i++){let r=await svc.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'fictional backup task '+i,observations:[]});r=await svc.confirm(r,true);await svc.save(r);}
 const backup=await b.exportBackup(s,'synthetic-password-123');const phases=[];
 for(const phase of ['read','decrypt','validate','preview']){
  const cancel=new AbortController();let abortedAt;
  await reject(()=>b.inspectBackup(backup,'synthetic-password-123',target,{signal:cancel.signal,onProgress:p=>{if(p.phase===phase){abortedAt=performance.now();cancel.abort();}}}),'AbortError');
  ok(performance.now()-abortedAt<=500,'CANCEL_RESPONSE_SLOW');ok((await target.page()).items.length===0,'CANCEL_WROTE_CLINICAL_RECORDS');phases.push(phase);
 }
 const cancel=new AbortController();await reject(()=>b.exportBackup(s,'synthetic-password-123',{signal:cancel.signal,onProgress:p=>{if(p.phase==='encrypt')cancel.abort();}}),'AbortError');
 // Preview must not materialize full current DB; recheck conflicts again in the final transaction.
 target.snapshot=()=>{throw Error('WHOLE_DATABASE_READ');};
 const inspection=await b.inspectBackup(backup,'synthetic-password-123',target);
 const add=IDBObjectStore.prototype.put;let injected=false;IDBObjectStore.prototype.put=function(value){if(this.name==='receipts'){injected=true;throw new DOMException('fictional quota','QuotaExceededError');}return add.call(this,value);};
 let quotaError;try{await b.restoreBackup(target,inspection);}catch(e){quotaError={name:e.name,message:e.message};}finally{IDBObjectStore.prototype.put=add;}ok(injected&&quotaError&&['AbortError','QuotaExceededError'].includes(quotaError.name),'QUOTA_FAULT_NOT_ABORTED '+JSON.stringify(quotaError));ok((await target.page()).items.length===0&&(await target.reviews()).length===0&&!(await target.get('meta','data-revision')),'QUOTA_PARTIAL_COMMIT');
 const owner=new BackupTask();let release,writes=0;const wait=new Promise(r=>release=r),aborted=owner.run(async job=>{await wait;return job.commit(()=>{writes++;return b.restoreBackup(target,inspection);});});owner.cancel();release();await reject(()=>aborted,'AbortError');ok(writes===0,'CANCEL_COMMIT_RACE_WROTE');
 let committingCancel;const result=await owner.run(job=>job.commit(async()=>{committingCancel=owner.cancel();return b.restoreBackup(target,inspection);}));ok(committingCancel===false&&result.added===12,'COMMIT_BOUNDARY_BROKEN');
 await target.removeEvent(inspection.data.events[0].id);await reject(()=>b.restoreBackup(target,inspection),'IMPORT_CONFLICT');ok((await target.page()).items.length===11,'CONFLICT_CHANGED_EXISTING_RECORDS');
 // Browser UI exposes cancel while decoding and keeps the final transaction indivisible.
 const $=q=>document.querySelector(q),pause=ms=>new Promise(r=>setTimeout(r,ms)),waitFor=async f=>{for(let i=0;i<500;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 await waitFor(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await waitFor(()=>$('.state-overview'));$('[data-nav="settings"]').click();await waitFor(()=>$('#backup-file'));
 const dt=new DataTransfer();dt.items.add(new File([backup],'fictional.ptds'));$('#backup-file').files=dt.files;$('#password').value='synthetic-password-123';$('#inspect-backup').click();await waitFor(()=>!$('#cancel-backup').hidden);$('#cancel-backup').click();await waitFor(()=>!$('#inspect-backup').disabled);ok(!$('#restore'),'UI_CANCEL_LEFT_RESTORE');
 $('#password').value='synthetic-password-123';$('#inspect-backup').click();await waitFor(()=>$('#restore'));$('#cancel-backup').click();ok(!$('#restore'),'PREVIEW_CANCEL_RETAINED_DATA');
 $('#password').value='synthetic-password-123';$('#inspect-backup').click();await waitFor(()=>$('#restore'));
 const origImport=RecordStore.prototype.importSnapshot;let commitStarted=false,releaseCommit;RecordStore.prototype.importSnapshot=async function(...args){commitStarted=true;await new Promise(r=>releaseCommit=r);return origImport.apply(this,args);};
 $('#restore').click();await waitFor(()=>commitStarted);ok($('#cancel-backup').disabled&&$('#backup-progress').textContent.includes('不能取消'),'UI_COMMIT_CANCEL_ENABLED');releaseCommit();await waitFor(()=>$('.state-overview'));RecordStore.prototype.importSnapshot=origImport;
 const actual=new RecordStore();ok((await actual.page()).items.length===12,'UI_RESTORE_COUNT');actual.close();s.close();target.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,quotaError,cancelPhases:phases,results:['cancel before commit writes zero records','export cancellation','no full target snapshot','quota rolls back all','cancel/commit race','final commit not cancellable','preview discard releases restore authority','UI progress and cancel'],physicalPhone:false});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
