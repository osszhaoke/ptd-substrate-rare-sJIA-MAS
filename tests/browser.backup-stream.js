(async()=>{
 const ok=(x,m)=>{if(!x)throw Error(m);},reject=async(fn,m)=>{let failed=false;try{await fn();}catch{failed=true;}ok(failed,m);};
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),b=await import('/storage/backup.js'),m=await import('/domain/model.js');
 const s=new RecordStore('backup-stream-'+crypto.randomUUID()),service=new RecordService(s);await s.open();
 const image=await(await fetch('/fixture.png')).blob(),size=3*1024*1024;
 for(let i=0;i<3;i++){
  const file=new File([image,new Uint8Array(size-image.size)],'fixture-'+i+'.png',{type:'image/png'}),source=await service.source(file);
  let r=await service.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'lab',nature:i?'REAL':'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'backup bytes '+i,observations:[]},source);r=await service.confirm(r,true);await service.save(r);
 }
 const target=new RecordStore('backup-target-'+crypto.randomUUID());await target.open();
 let maxCryptoBytes=0,frames=0;const observe=x=>{maxCryptoBytes=Math.max(maxCryptoBytes,x.cryptoBytes);frames++;};
 const backup=await b.exportBackup(s,'synthetic-password-123',observe);ok(maxCryptoBytes<=256*1024+1,'crypto buffer exceeds chunk bound');
 const bytes=new Uint8Array(await backup.arrayBuffer());let pos=30;const ranges=[];while(pos<bytes.length){const length=new DataView(bytes.buffer).getUint32(pos);ranges.push([pos,pos+4+length]);pos+=4+length;}
 for(const file of [new Blob([bytes.subarray(0,-1)]),new Blob([bytes.subarray(0,ranges.at(-1)[0])]),new Blob([bytes,bytes.subarray(30,ranges[0][1])]),new Blob([bytes.subarray(0,30),bytes.subarray(...ranges[1]),bytes.subarray(...ranges[0]),bytes.subarray(ranges[1][1])])]){
  await reject(()=>b.inspectBackup(file,'synthetic-password-123',target),'truncated/reordered/trailing accepted');ok((await target.page()).items.length===0,'partial import');
 }
 for(const at of [7,23,40,bytes.length-1]){const copy=bytes.slice();copy[at]^=1;await reject(()=>b.inspectBackup(new Blob([copy]),'synthetic-password-123',target),'tamper accepted');}
 const inspection=await b.inspectBackup(backup,'synthetic-password-123',target,observe);await b.restoreBackup(target,inspection);
 const before=await s.snapshot(),after=await target.snapshot();ok(after.reviews.length===0,'confirmation restored');
 ok(m.canonical(before.events)===m.canonical(after.events),'event bytes changed');
 for(const a of after.sources){const original=before.sources.find(v=>v.id===a.id);ok(await m.hash(await a.blob.arrayBuffer())===original.hash,'original changed');}
 // Compatibility reader for an authentic format-2 envelope, using the old writer contract.
 const payload={schema:m.SCHEMA_V2,version:2,settings:null,exportedAt:'2020-01-01T00:00:00Z',events:before.events,receipts:before.receipts,sources:[]};
 for(const {blob,...source} of before.sources)payload.sources.push({...source,bytes:b.base64(new Uint8Array(await blob.arrayBuffer()))});
 const enc=new TextEncoder(),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const raw=await crypto.subtle.importKey('raw',enc.encode('synthetic-password-123'),'PBKDF2',false,['deriveKey']),key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt']);
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('ptds-backup/2')},key,enc.encode(m.canonical(payload)));
 const legacy=new Blob([JSON.stringify({format:'ptds-backup/2',kdf:'PBKDF2-SHA256',iterations:310000,salt:b.base64(salt),iv:b.base64(iv),cipher:b.base64(new Uint8Array(cipher))})]);
 ok((await b.inspectBackup(legacy,'synthetic-password-123',target)).summary.duplicates===3,'format2 reader lost');
 s.close();target.close();window.webkit.messageHandlers.result.postMessage({ok:true,maxCryptoBytes,frames,originalBytes:3*size,backupBytes:backup.size,results:['ordered authenticated frames','authenticated header and end','truncation reorder trailing corruption rejected','no partial writes','exact originals and nature preserved','format2 readable'],memoryLimit:'AES processing window only; output Blob, metadata and one <=8MiB original SHA256 buffer remain'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
