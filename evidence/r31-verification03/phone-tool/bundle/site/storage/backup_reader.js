import {need} from '../domain/model.js';

// One decoder owns one bounded ciphertext window. No shared cache or background work.
export const READ_WINDOW_BYTES=1024*1024;
export class BackupReader {
 constructor(file,signal){this.file=file;this.signal=signal;this.position=0;this.start=0;this.bytes=new Uint8Array();this.closed=false;}
 async read(size){
  need(!this.closed,'BACKUP_READER_CLOSED');
  this.signal?.throwIfAborted();
  need(Number.isSafeInteger(size)&&size>=0&&size<=READ_WINDOW_BYTES&&this.position+size<=this.file.size,'INVALID_BACKUP');
  if(size===0)return new Uint8Array();
  let output=null,done=0;
  while(done<size){
   this.signal?.throwIfAborted();
   if(this.position<this.start||this.position>=this.start+this.bytes.length){
    this.start=this.position;
    const end=Math.min(this.file.size,this.start+READ_WINDOW_BYTES);
    const bytes=new Uint8Array(await this.file.slice(this.start,end).arrayBuffer());
    need(!this.closed,'BACKUP_READER_CLOSED');this.signal?.throwIfAborted();
    need(bytes.length===end-this.start,'INVALID_BACKUP');this.bytes=bytes;
   }
   const offset=this.position-this.start,take=Math.min(size-done,this.bytes.length-offset);
   need(take>0,'INVALID_BACKUP');
   if(!output&&take===size){const view=this.bytes.subarray(offset,offset+take);this.position+=take;return view;}
   output??=new Uint8Array(size);
   output.set(this.bytes.subarray(offset,offset+take),done);this.position+=take;done+=take;
  }
  return output;
 }
 close(){this.closed=true;this.bytes=new Uint8Array();}
}
