import {reportRows} from '../domain/report/rows.js';
import {validateReportBinding} from '../domain/report/contract.js';
import {validateOriginBinding} from '../domain/ocr_review.js';
import {candidates} from '../domain/state/candidates.js';
import {taskOptions,checkpoint,backupConflicts} from './backup_task.js';
import {encodeStream,decodeStream,isStream} from './backup_stream.js';
import {SCHEMA,SCHEMA_V2,SCHEMA_V3,dictionaryForSchema,timezone,LIMITS,need,text,id,hash,digest,canonical,validateSource,validatePayload,reviewContent} from '../domain/model.js';
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const formatAAD=version=>enc.encode('ptds-backup/'+version);
export function base64(b){let s='';for(let i=0;i<b.length;i+=16384)s+=String.fromCharCode(...b.subarray(i,i+16384));return btoa(s);}
function unbase64(s){need(typeof s==='string'&&s.length<=LIMITS.backupBytes*1.5&&/^[A-Za-z0-9+/]*={0,2}$/.test(s),'INVALID_BACKUP_ENCODING');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function key(password,salt){text(password,1024);need(password.length>=10,'PASSWORD_MIN_10');const raw=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function exportBackup(store,password,observe){
 const task=taskOptions(observe);await checkpoint(task,'read');
 const snap=await store.backupSnapshot();
 const sourceIds=new Set(snap.events.map(e=>e.sourceBinding?.id).filter(Boolean));
 const sources=snap.sources.filter(s=>sourceIds.has(s.id));
 need(sources.reduce((n,s)=>n+s.blob.size,0)<=LIMITS.backupBytes/2,'BACKUP_BYTE_LIMIT');
 const exportedAt=new Date().toISOString(),schema=snap.events.some(e=>e.schema===SCHEMA_V3)?SCHEMA_V3:SCHEMA_V2;
 function* records(){
  yield {kind:'manifest',value:{schema,version:3,settings:snap.meta.find(m=>m.id==='settings')||null,exportedAt}};
  for(const value of snap.events)yield {kind:'event',value};
  for(const value of snap.receipts)yield {kind:'receipt',value};
  for(const {blob,...value} of sources){yield {kind:'source',value};yield {kind:'original',value:blob};}
 }
 const out=await encodeStream(records(),password,key,task);
 await checkpoint(task,'ready',1,1);await store.meta({id:'lastBackup',at:exportedAt});return out;
}
export async function inspectBackup(file,password,store,observe){
 const task=taskOptions(observe);await checkpoint(task,'read');
 if(await isStream(file)){
  let data=null,pending=null,phase=0;
  await decodeStream(file,password,key,{...task,onRecord:({kind,value})=>{
   if(!data){need(kind==='manifest'&&value.version===3,'BACKUP_SCHEMA');data={...value,events:[],receipts:[],sources:[]};return;}
   if(kind==='event'){need(phase===0&&!pending&&data.events.length<LIMITS.records,'BACKUP_SCHEMA');data.events.push(value);}
   else if(kind==='receipt'){need(phase<=1&&!pending&&data.receipts.length<LIMITS.records*2,'BACKUP_SCHEMA');phase=1;data.receipts.push(value);}
   else if(kind==='source'){need(!pending&&data.sources.length<LIMITS.records,'BACKUP_SCHEMA');phase=2;pending=value;}
   else if(kind==='original'){need(pending,'BACKUP_SCHEMA');data.sources.push({...pending,blob:value.slice(0,value.size,pending.type)});pending=null;}
   else throw Error('BACKUP_SCHEMA');
  }});
  need(data&&!pending,'BACKUP_SCHEMA');return validateBackup(data,3,store,task);
 }
 return inspectLegacy(file,password,store,task);
}
async function inspectLegacy(file,password,store,task){
 need(file.size<=LIMITS.backupBytes*1.5,'BACKUP_BYTE_LIMIT');let envelope;
 try{envelope=JSON.parse(await file.text());}catch{throw new Error('INVALID_BACKUP');}
 const version=envelope?.format==='ptds-backup/1'?1:envelope?.format==='ptds-backup/2'?2:null;
 need(version!==null&&envelope.kdf==='PBKDF2-SHA256'&&envelope.iterations===310000,'UNSUPPORTED_BACKUP');
 const salt=unbase64(envelope.salt),iv=unbase64(envelope.iv);need(salt.length===16&&iv.length===12,'INVALID_BACKUP');
 let data;try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:formatAAD(version)},await key(password,salt),unbase64(envelope.cipher));need(plain.byteLength<=LIMITS.backupBytes,'BACKUP_BYTE_LIMIT');data=JSON.parse(dec.decode(plain));}catch{throw new Error('BACKUP_PASSWORD_OR_CORRUPTION');}
 await checkpoint(task,'validate');return validateBackup(data,version,store,task);
}
async function validateBackup(data,version,store,task){
 await checkpoint(task,'validate');
 need((data?.schema===(version===1?SCHEMA:SCHEMA_V2)||version===3&&data?.schema===SCHEMA_V3)&&data.version===version&&Array.isArray(data.events)&&data.events.length<=LIMITS.records&&Array.isArray(data.sources)&&data.sources.length<=LIMITS.records&&Array.isArray(data.receipts)&&data.receipts.length<=LIMITS.records*2,'BACKUP_SCHEMA');
 if(data.settings){need(version>=2&&data.settings.id==='settings','BACKUP_SETTINGS');timezone(data.settings.timezone);}
 const unique=(rows)=>{const ids=new Set();for(const r of rows){id(r.id);need(!ids.has(r.id),'BACKUP_DUPLICATE_ID');ids.add(r.id);}};
 for(const k of ['events','sources','receipts'])unique(data[k]);
 let bytes=0,done=0;const total=data.sources.length+data.events.length+data.receipts.length;
 for(const s of data.sources){
  await checkpoint(task,'validate',done++,total);
  if(version<3){const b=unbase64(s.bytes);s.blob=new Blob([b],{type:s.type});delete s.bytes;}
  validateSource(s);bytes+=s.blob.size;need(bytes<=LIMITS.backupBytes/2,'BACKUP_BYTE_LIMIT');
  // WebCrypto SHA256 needs one original buffer (<=8MiB), never all originals.
  need(await hash(await s.blob.arrayBuffer())===s.hash,'BACKUP_SOURCE_HASH');
  need(await digest({hash:s.hash,ledger:s.ledger,transformation:s.transformation,name:s.name,type:s.type})===s.bindingDigest,'BACKUP_SOURCE_BINDING');
 }
 const sources=new Map(data.sources.map(s=>[s.id,s])),receipts=new Map(data.receipts.map(r=>[r.id,r])),ownedSources=new Set();
 for(const e of data.events){await checkpoint(task,'validate',done++,total);validatePayload(e.payload,e.schema);need([SCHEMA,SCHEMA_V2,SCHEMA_V3].includes(e.schema)&&(version>=2||e.schema===SCHEMA)&&(e.schema!==SCHEMA_V3||version===3&&data.schema===SCHEMA_V3)&&e.dictionary===dictionaryForSchema(e.schema)&&e.revision===1&&await digest(reviewContent(e))===e.digest,'BACKUP_EVENT_INTEGRITY');id(e.requestId);
  const r=receipts.get(e.requestId);need(r&&r.eventId===e.id&&r.digest===e.digest&&!r.deleted&&r.scope==='THIS_BROWSER_LOCAL_ONLY','BACKUP_RECEIPT');
  if(e.sourceBinding){need(!ownedSources.has(e.sourceBinding.id),'BACKUP_SOURCE_OWNERSHIP');ownedSources.add(e.sourceBinding.id);const s=sources.get(e.sourceBinding.id);need(s&&s.hash===e.sourceBinding.hash&&s.bindingDigest===e.sourceBinding.bindingDigest,'BACKUP_SOURCE_MISSING');const lineIds=new Set(s.ledger?.lines.map(l=>l.id)||[]);e.payload.observations.forEach(o=>o.sourceLineIds.forEach(l=>need(lineIds.has(l),'BACKUP_SOURCE_LINE')));if(e.schema===SCHEMA_V3){validateReportBinding(e.payload,s,reportRows(s.ledger),{need,canonical});validateOriginBinding(e.payload,s,candidates(s.ledger));}}
  else need(e.schema!==SCHEMA_V3&&e.payload.sourceKind!=='OCR'&&e.payload.observations.every(o=>!o.sourceLineIds.length),'BACKUP_SOURCE_MISSING');
 }
 const events=new Map(data.events.map(e=>[e.id,e]));
 for(const r of data.receipts){await checkpoint(task,'validate',done++,total);need(typeof r.deleted==='boolean'&&/^[a-f0-9]{64}$/.test(r.digest)&&(r.deleted||events.get(r.eventId)?.requestId===r.id),'BACKUP_RECEIPT');}
 // A coherent snapshot is only a preview. importSnapshot rechecks conflicts inside its write transaction.
 await checkpoint(task,'preview',0,1);
 const {duplicates,conflicts}=await backupConflicts(store,data);await checkpoint(task,'preview',1,1);
 return {data,summary:{records:data.events.length,originals:data.sources.length,bytes,duplicates,conflicts,exportedAt:data.exportedAt}};
}
export async function restoreBackup(store,inspection){need(inspection.summary.conflicts.length===0,'IMPORT_CONFLICT');return store.importSnapshot(inspection.data);}
