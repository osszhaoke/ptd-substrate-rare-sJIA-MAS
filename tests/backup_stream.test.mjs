import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeStream,decodeStream} from '../web/storage/backup_stream.js';
import {LIMITS} from '../web/domain/model.js';
const enc=new TextEncoder();
const key=await crypto.subtle.importKey('raw',new Uint8Array(32),'AES-GCM',false,['encrypt','decrypt']);
const derive=async()=>key;
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n);return b;};
test('format3 authenticated bytes match the original writer for fixed randomness',async()=>{
 const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a.forEach((_,i)=>a[i]=i);return a;};
 try{
  const records=[{kind:'manifest',value:{version:3}},{kind:'event',value:{id:'fixed',literal:'1.00'}},{kind:'original',value:new Blob([new Uint8Array(524300).fill(17)])}];
  const blob=await encodeStream(records,'unused',derive);
  const sha=Buffer.from(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())).toString('hex');
  assert.equal(blob.size,524740);assert.equal(sha,'2d3dabd94fd2ce45d031eed774a12cb7918c9f5e2b3e51fa7322f813bdb99ef7');
 }finally{crypto.getRandomValues=random;}
});
test('many small records retain bounded raw ciphertext parts and preserve every record',async()=>{
 const NativeBlob=globalThis.Blob;let maxParts=0,maxBytes=0;
 const original=new NativeBlob([new Uint8Array(6*1048576+17).fill(19)]);
 globalThis.Blob=new Proxy(NativeBlob,{construct(target,args){
  const [parts]=args;
  const raw=(parts||[]).filter(x=>ArrayBuffer.isView(x)||x instanceof ArrayBuffer);
  maxParts=Math.max(maxParts,raw.length);maxBytes=Math.max(maxBytes,raw.reduce((n,b)=>n+b.byteLength,0));return Reflect.construct(target,args);
 }});
 try{
  const rows=[{kind:'manifest',value:{version:3}},...Array.from({length:1200},(_,i)=>({kind:'event',value:{id:i,literal:'1.00'}})),{kind:'original',value:original}];
  const blob=await encodeStream(rows,'unused',derive);const decoded=await decodeStream(blob,'unused',derive);
  assert.deepEqual(decoded,rows);assert.ok(maxParts<=128,'unbounded raw ciphertext parts: '+maxParts);
  assert.ok(maxBytes<=1048576,'raw ciphertext batch exceeded 1MiB: '+maxBytes);
  assert.ok(maxBytes>524288,'large-frame byte-bound branch was not exercised');
  assert.deepEqual(await decoded.at(-1).value.arrayBuffer(),await original.arrayBuffer());
 }finally{globalThis.Blob=NativeBlob;}
});
test('oversize original header is rejected before its ciphertext body is read',async()=>{
 const header=new Uint8Array([...enc.encode('PTDS3\n'),...new Uint8Array(24)]),prefix=header.slice(22,30);let sequence=0;
 async function frame(kind,body=new Uint8Array()){
  const i=sequence++,plain=new Uint8Array([kind,...body]);
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv:new Uint8Array([...prefix,...u32(i)]),additionalData:new Uint8Array([...header,...u32(i)])},key,plain);
  return [u32(cipher.byteLength),cipher];
 }
 const pieces=[header,...await frame(1,enc.encode(JSON.stringify({kind:'original',size:LIMITS.imageBytes+1}))),...await frame(2,new Uint8Array([1]))];
 let frames=0;await assert.rejects(decodeStream(new Blob(pieces),'unused',derive,()=>frames++),/IMAGE_SIZE/);
 assert.equal(frames,1,'oversize body was decrypted');
 await assert.rejects(encodeStream([{kind:'original',value:new Blob([new Uint8Array(LIMITS.imageBytes+1)])}],'unused',derive),/IMAGE_SIZE/);
});
test('cancellation in crypto observer starts no encryption and stops consuming records',async()=>{
 const controller=new AbortController();let consumed=0,encryptions=0;
 const encrypt=crypto.subtle.encrypt.bind(crypto.subtle);crypto.subtle.encrypt=(...args)=>{encryptions++;return encrypt(...args);};
 function* rows(){consumed++;yield {kind:'manifest',value:{version:3}};consumed++;yield {kind:'event',value:{id:1}};}
 try{await assert.rejects(encodeStream(rows(),'unused',derive,{signal:controller.signal,observe:()=>controller.abort()}),e=>e.name==='AbortError');
  assert.equal(encryptions,0,'encryption continued after cancellation');assert.equal(consumed,1);
 }finally{crypto.subtle.encrypt=encrypt;}
});
