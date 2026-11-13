import test from 'node:test';
import assert from 'node:assert/strict';
import {BackupReader,READ_WINDOW_BYTES} from '../web/storage/backup_reader.js';
import {encodeStream,decodeStream} from '../web/storage/backup_stream.js';
const key=await crypto.subtle.importKey('raw',new Uint8Array(32),'AES-GCM',false,['encrypt','decrypt']);
const derive=async()=>key;

test('sequential reads cross window and length-prefix boundaries with bounded physical buffers',async()=>{
 const bytes=Uint8Array.from({length:READ_WINDOW_BYTES*2+19},(_,i)=>i%251),blob=new Blob([bytes]);
 let reads=0,max=0;
 const file={size:blob.size,slice(start,end){const part=blob.slice(start,end);max=Math.max(max,part.size);return {arrayBuffer(){reads++;return part.arrayBuffer();}};}};
 const reader=new BackupReader(file);let at=0;
 for(const size of [READ_WINDOW_BYTES-2,4,262161,READ_WINDOW_BYTES-2-262161,19]){
  const part=await reader.read(size);assert.deepEqual(part,bytes.subarray(at,at+size));at+=size;
 }
 assert.equal(at,blob.size);assert.equal(reads,3);assert.ok(max<=READ_WINDOW_BYTES);
 await assert.rejects(reader.read(1),/INVALID_BACKUP/);reader.close();assert.equal(reader.bytes.length,0);
});
test('cancellation after physical read prevents consuming or requesting another window',async()=>{
 const controller=new AbortController();let reads=0;
 const reader=new BackupReader({size:READ_WINDOW_BYTES*2,slice(){return {async arrayBuffer(){reads++;controller.abort();return new ArrayBuffer(READ_WINDOW_BYTES);}};}},controller.signal);
 await assert.rejects(reader.read(30),e=>e.name==='AbortError');
 await assert.rejects(reader.read(30),e=>e.name==='AbortError');assert.equal(reads,1);reader.close();
});
test('short physical reads fail closed rather than looping or inventing bytes',async()=>{
 const reader=new BackupReader({size:30,slice(){return {async arrayBuffer(){return new ArrayBuffer(29);}};}});
 await assert.rejects(reader.read(30),/INVALID_BACKUP/);reader.close();
});
test('UTF-8 metadata spanning crypto frames and read windows round-trips without Blob.text',async()=>{
 const rows=[{kind:'manifest',value:{version:3}},{kind:'event',value:{id:1,note:'🙂汉'.repeat(200000),literal:'1.00'}},{kind:'original',value:new Blob([new Uint8Array(524300).fill(31)])}];
 const file=await encodeStream(rows,'unused',derive),originalText=Blob.prototype.text;let texts=0;
 Blob.prototype.text=function(){texts++;return originalText.call(this);};
 let restored;try{restored=await decodeStream(file,'unused',derive);}finally{Blob.prototype.text=originalText;}
 assert.equal(texts,0);assert.deepEqual(restored.slice(0,2),rows.slice(0,2));
 assert.deepEqual(await restored[2].value.arrayBuffer(),await rows[2].value.arrayBuffer());
});

test('a closed reader rejects new reads without touching the file',async()=>{
 let reads=0;const reader=new BackupReader({size:30,slice(){reads++;return {arrayBuffer:async()=>new ArrayBuffer(30)};}});
 reader.close();await assert.rejects(reader.read(1),/BACKUP_READER_CLOSED/);assert.equal(reads,0);assert.equal(reader.bytes.length,0);
});
test('an in-flight read cannot refill the window after close',async()=>{
 let release,started;const began=new Promise(resolve=>started=resolve),pending=new Promise(resolve=>release=resolve);
 const reader=new BackupReader({size:30,slice(){return {arrayBuffer(){started();return pending;}};}});
 const reading=reader.read(30);await began;reader.close();release(new ArrayBuffer(30));
 await assert.rejects(reading,/BACKUP_READER_CLOSED/);assert.equal(reader.bytes.length,0);assert.equal(reader.position,0);
});
