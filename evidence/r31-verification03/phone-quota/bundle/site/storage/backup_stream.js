import {taskOptions,checkpoint} from './backup_task.js';
import {need,LIMITS} from '../domain/model.js';
import {BackupReader} from './backup_reader.js';
// Binary framing avoids whole-file base64/plaintext buffers. Only one frame enters AES.
export const CHUNK_BYTES=256*1024;
const BATCH_BYTES=1024*1024,BATCH_PARTS=128;
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const MAGIC=enc.encode('PTDS3\n');
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n);return b;};
const number=b=>new DataView(b.buffer,b.byteOffset,4).getUint32(0);
const nonce=(prefix,i)=>new Uint8Array([...prefix,...u32(i)]);
const aad=(header,i)=>new Uint8Array([...header,...u32(i)]);
export async function isStream(file){return await file.slice(0,6).text()==='PTDS3\n';}
export async function encodeStream(records,password,deriveKey,observe={}){
 const task=taskOptions(observe);await checkpoint(task,'read');
 const salt=crypto.getRandomValues(new Uint8Array(16)),prefix=crypto.getRandomValues(new Uint8Array(8));
 const header=new Uint8Array([...MAGIC,...salt,...prefix]),key=await deriveKey(password,salt),parts=[new Blob([header])],pending=[];
 let pendingBytes=0;
 function flush(){if(pending.length){parts.push(new Blob(pending));pending.length=0;pendingBytes=0;}}
 let seq=0,total=0,count=0,encryptedBytes=header.length;
 async function frame(kind,bytes=new Uint8Array()){
  task.signal?.throwIfAborted();
  need(bytes.length<=CHUNK_BYTES&&seq<LIMITS.records*20+1024,'BACKUP_BYTE_LIMIT');
  const plain=new Uint8Array(1+bytes.length);plain[0]=kind;plain.set(bytes,1);
  task.observe?.({cryptoBytes:plain.length,sequence:seq});
  task.signal?.throwIfAborted();
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce(prefix,seq),additionalData:aad(header,seq)},key,plain);
  task.signal?.throwIfAborted();
  if(pending.length+2>BATCH_PARTS||pendingBytes+4+cipher.byteLength>BATCH_BYTES)flush();
  pending.push(u32(cipher.byteLength),cipher);pendingBytes+=4+cipher.byteLength;
  seq++;encryptedBytes+=4+cipher.byteLength;await checkpoint(task,'encrypt',encryptedBytes,0);
 }
 try{
 for(const {kind,value} of records){
  task.signal?.throwIfAborted();
  const blob=value instanceof Blob?value:new Blob([JSON.stringify(value)]);
  if(kind==='original')need(blob.size>0&&blob.size<=LIMITS.imageBytes,'IMAGE_SIZE');
  total+=blob.size;need(total<=LIMITS.backupBytes,'BACKUP_BYTE_LIMIT');
  await frame(1,enc.encode(JSON.stringify({kind,size:blob.size})));
  for(let at=0;at<blob.size;at+=CHUNK_BYTES)await frame(2,new Uint8Array(await blob.slice(at,at+CHUNK_BYTES).arrayBuffer()));
  await frame(3);count++;
 }
 await frame(4,enc.encode(JSON.stringify({count,total})));
 flush();
 return new Blob(parts,{type:'application/octet-stream'});
 }finally{pending.length=0;parts.length=0;}
}
export async function decodeStream(file,password,deriveKey,observe={}){
 const task=taskOptions(observe);await checkpoint(task,'read');
 need(file.size>=34&&file.size<=LIMITS.backupBytes*1.5,'BACKUP_BYTE_LIMIT');
 const reader=new BackupReader(file,task.signal);
 try{
 // Copy the small authenticated header so it does not retain the first read window.
 const header=new Uint8Array(await reader.read(30));
 need(dec.decode(header.subarray(0,6))==='PTDS3\n','INVALID_BACKUP');
 const key=await deriveKey(password,header.slice(6,22)),prefix=header.slice(22,30);
 let seq=0,total=0,count=0,record=null,ended=false,firstKind=null;const records=[];
 while(reader.position<file.size){
  task.signal?.throwIfAborted();
  need(!ended&&reader.position+4<=file.size&&seq<LIMITS.records*20+1024,'INVALID_BACKUP');
  const size=number(await reader.read(4));
  need(size>=17&&size<=CHUNK_BYTES+17&&reader.position+size<=file.size,'INVALID_BACKUP');
  const cipher=await reader.read(size);
  let plain;try{plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce(prefix,seq),additionalData:aad(header,seq)},key,cipher));}catch{throw Error('BACKUP_PASSWORD_OR_CORRUPTION');}
  task.observe?.({cryptoBytes:plain.length,sequence:seq});seq++;
  await checkpoint(task,'decrypt',reader.position,file.size);
  const kind=plain[0],body=plain.subarray(1);
  if(kind===1){
   need(!record&&body.length<1024,'INVALID_BACKUP');const h=JSON.parse(dec.decode(body));
   need(['manifest','event','receipt','source','original'].includes(h.kind)&&Number.isSafeInteger(h.size)&&h.size>=0&&h.size<=LIMITS.backupBytes,'INVALID_BACKUP');
   if(h.kind==='original')need(h.size>0&&h.size<=LIMITS.imageBytes,'IMAGE_SIZE');
   total+=h.size;need(total<=LIMITS.backupBytes,'BACKUP_BYTE_LIMIT');
   record={...h,parts:[],read:0,decoder:h.kind==='original'?null:new TextDecoder('utf-8')};
  }else if(kind===2){
   need(record&&body.length>0,'INVALID_BACKUP');record.read+=body.length;need(record.read<=record.size,'INVALID_BACKUP');
   record.parts.push(record.decoder?record.decoder.decode(body,{stream:true}):new Blob([body]));
  }else if(kind===3){
   need(record&&body.length===0&&record.read===record.size,'INVALID_BACKUP');
   const decoded={kind:record.kind,value:record.decoder?JSON.parse(record.parts.join('')+record.decoder.decode()):new Blob(record.parts)};
   firstKind??=record.kind;if(task.onRecord)task.onRecord(decoded);else records.push(decoded);
   count++;need(count<=LIMITS.records*5+1,'BACKUP_BYTE_LIMIT');record=null;
  }else if(kind===4){
   need(!record&&body.length<1024,'INVALID_BACKUP');const end=JSON.parse(dec.decode(body));need(end.count===count&&end.total===total&&reader.position===file.size,'INVALID_BACKUP');ended=true;
  }else throw Error('INVALID_BACKUP');
 }
 need(ended&&firstKind==='manifest','INVALID_BACKUP');
 await checkpoint(task,'decrypt',file.size,file.size);
 return records;
 }finally{reader.close();}
}
