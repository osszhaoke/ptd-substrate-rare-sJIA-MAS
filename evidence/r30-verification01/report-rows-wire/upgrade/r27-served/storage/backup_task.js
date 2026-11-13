// Crypto observers retain their old callback API; UI tasks additionally supply cancellation/progress.
export const taskOptions=value=>typeof value==='function'?{observe:value}:(value||{});
export async function checkpoint(task,phase,done=0,total=0){
 task.signal?.throwIfAborted();task.onProgress?.({phase,done,total});
 const now=performance.now();if(now-(task.lastYield??0)>=16){task.lastYield=now;await new Promise(r=>setTimeout(r,0));}
 task.signal?.throwIfAborted();
}
// Read only matching identities in one snapshot; never materialize the entire current database.
export function backupConflicts(store,data){
 return store.tx(['events','sources','receipts'],'readonly',a=>{
  const result={duplicates:0,conflicts:[]};let remaining=data.events.length+data.sources.length+data.receipts.length;
  if(!remaining){a.result(result);return;}
  for(const name of ['events','sources','receipts'])for(const value of data[name]){
   a.store(name).get(value.id).onsuccess=e=>{
    const old=e.target.result,key=name==='sources'?'bindingDigest':'digest';
    if(old){if(old[key]!==value[key]||name==='receipts'&&(old.eventId!==value.eventId||old.deleted))result.conflicts.push({store:name,id:value.id});else if(name==='events')result.duplicates++;}
    if(!--remaining)a.result(result);
   };
  }
 });
}
