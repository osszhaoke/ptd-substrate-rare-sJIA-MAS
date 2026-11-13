import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeStream,decodeStream} from '../web/storage/backup_stream.js';
const key=await crypto.subtle.importKey('raw',new Uint8Array(32),'AES-GCM',false,['encrypt','decrypt']);
const derive=async()=>key;
test('many small authenticated records use bounded file read windows, preserving all values',async()=>{
 const rows=[{kind:'manifest',value:{version:3}},...Array.from({length:1200},(_,i)=>({kind:'event',value:{id:i,literal:'1.00',note:'虚构记录'+i}}))];
 const file=await encodeStream(rows,'unused',derive);
 let reads=0,maxReadBytes=0;
 const tracked={size:file.size,slice(start,end){
  const part=file.slice(start,end);
  return {text:()=>part.text(),arrayBuffer:()=>{reads++;maxReadBytes=Math.max(maxReadBytes,part.size);return part.arrayBuffer();}};
 }};
 const result=await decodeStream(tracked,'unused',derive);
 assert.deepEqual(result,rows);
 assert.ok(reads<=Math.ceil(file.size/1048576)+1,'fragmented file reads: '+reads+' for '+file.size+' bytes');
 assert.ok(maxReadBytes<=1048576,'file-read buffer exceeded 1MiB');
});
