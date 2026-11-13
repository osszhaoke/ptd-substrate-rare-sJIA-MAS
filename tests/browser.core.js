(async()=>{
 const results=[];const ok=(v,m)=>{if(!v)throw new Error(m);};const reject=async(fn,code)=>{try{await fn();throw new Error('ACCEPTED_'+code);}catch(e){ok(e.message.includes(code),e.message+' expected '+code);}};
 const {RecordStore}=await import('/storage/store.js');const {RecordService}=await import('/domain/service.js');const m=await import('/domain/model.js');const b=await import('/storage/backup.js');
 const name='ptds-test-'+crypto.randomUUID(),s=new RecordStore(name),service=new RecordService(s);
 const payload=()=>({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'fictional <script>test</script>',observations:[{code:'crp',displayName:'C反应蛋白',valueLiteral:'+003.400',unit:'mg/L',context:'LAB',sourceLineIds:[]}]});
 const connections=await Promise.all([s.open(),s.open(),s.open()]);ok(connections.every(c=>c===connections[0]),'multiple connection owners');let r=await service.stage(payload());
 await reject(()=>service.save(r),'CONFIRMATION_REQUIRED');ok((await s.page()).items.length===0,'unconfirmed event');
 const confirmed=await service.confirm(r,true);const changed=await service.stage({...payload(),note:'changed'},null,r);
 await reject(()=>service.save(confirmed),'STALE_REVIEW');await reject(()=>service.save(changed),'CONFIRMATION_REQUIRED');results.push('L02 unconfirmed/edit invalidation');
 const other=new RecordStore(name);await other.open();await reject(()=>new RecordService(other).stage(payload(),null,r),'STALE_REVIEW');results.push('L07 two-connection CAS');
 r=await service.confirm(changed,true);
 let injected=false;const originalAdd=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(v){if(this.name==='receipts'){injected=true;throw new DOMException('Synthetic quota fault','QuotaExceededError');}return originalAdd.call(this,v);};
 let failure=null;try{await service.save(r);}catch(e){failure=e.name;}finally{IDBObjectStore.prototype.add=originalAdd;}
 ok(injected&&failure,'quota fault missing');ok((await s.page()).items.length===0,'event not atomic');ok(!(await s.get('receipts',r.requestId)),'receipt not atomic');results.push('L03 synthetic quota after event add: rollback ('+failure+')');
 const receipt=await service.save(r);ok((await service.save(r)).id===receipt.id,'idempotent receipt');
 const different=await service.stage({...payload(),note:'different'});await reject(()=>service.save(different,r.requestId),'IDEMPOTENCY_CONFLICT');results.push('L04 idempotency conflict');
 const lines=['CRP 003.40 mg/L','CRP 003.40 mg/L','unknown row'].map((text,i)=>({id:'line_original_'+i,order:i,text,page:1,coordinates:null,confidence:null}));
 const ledger={version:'ocr-ledger/1',provider:'synthetic-test-adapter',region:'test',rawText:lines.map(l=>l.text).join('\n'),lines,providerRaw:{synthetic:true}};
 const image=await(await fetch('/fixture.png')).blob();const file=new File([image],'synthetic.png',{type:'image/png'});const source=await service.source(file,ledger);
 let r2=await service.stage({...payload(),sourceKind:'OCR',documentKind:'lab',observations:m.candidates(ledger)},source);r2=await service.confirm(r2,true);const rr=await service.save(r2);
 await reject(()=>service.stage({...payload(),note:'attempt source reuse'},source),'SOURCE_OWNERSHIP_CONFLICT');
 const stored=await s.get('sources',source.id);ok(await m.hash(await stored.blob.arrayBuffer())===source.hash,'source hash');ok(stored.ledger.lines.length===3,'ledger lost row');results.push('L05 original blob duplicate and unmatched lines');
 const backup=await b.exportBackup(s,'synthetic-password-123');const target=new RecordStore('restore-'+crypto.randomUUID());await target.open();
 await reject(()=>b.inspectBackup(backup,'wrong-password-123',target),'BACKUP_PASSWORD_OR_CORRUPTION');
 const damaged=new Uint8Array(await backup.arrayBuffer());damaged[damaged.length-1]^=1;await reject(()=>b.inspectBackup(new Blob([damaged]),'synthetic-password-123',target),'BACKUP_PASSWORD_OR_CORRUPTION');
 const inspection=await b.inspectBackup(backup,'synthetic-password-123',target);ok(inspection.summary.records===2&&inspection.summary.originals===1,'backup summary');await b.restoreBackup(target,inspection);
 const snap=await target.snapshot();ok(snap.reviews.length===0,'authorization imported');ok(snap.events.length===2,'restore events');ok(await m.hash(await snap.sources[0].blob.arrayBuffer())===source.hash,'restore original');
 ok((await b.restoreBackup(target,inspection)).added===0,'duplicate import');
 await target.tx(['events'],'readwrite',a=>{a.store('events').get(receipt.eventId).onsuccess=e=>a.store('events').put({...e.target.result,digest:'0'.repeat(64)});});
 const conflict=await b.inspectBackup(backup,'synthetic-password-123',target);ok(conflict.summary.conflicts.length===1,'conflict preview');await reject(()=>b.restoreBackup(target,conflict),'IMPORT_CONFLICT');results.push('L08 encrypted backup wrong password corruption conflict and no authorization replay');
 await s.removeEvent(rr.eventId);ok(!(await s.get('sources',source.id)),'original not deleted');await reject(()=>service.save(r2),'RECORD_DELETED');await s.clear();ok((await s.snapshot()).receipts.length===0,'clear all');results.push('L10 delete source tombstone clear');
 // IDB schema upgrades: an unrelated open tab that refuses versionchange must block, not clear data.
 const blocker=await new Promise((res,rej)=>{const q=indexedDB.open('blocked-'+name,1);q.onupgradeneeded=()=>q.result.createObjectStore('sentinel');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
 const upgrade=new RecordStore('blocked-'+name);await reject(()=>upgrade.open(2),'UPGRADE_BLOCKED');ok(blocker.objectStoreNames.contains('sentinel'),'blocked data removed');blocker.close();results.push('L07 blocked upgrade explicit failure');
 other.close();s.close();target.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,results,fixtureHash:source.hash,backupBytes:backup.size});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
