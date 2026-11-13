// Bounded read-only transport. It never evaluates application modules or retries a write.
export async function preloadLevels(levels,load,signal){
 const owner=new AbortController(),abort=()=>owner.abort();signal?.addEventListener('abort',abort,{once:true});
 if(signal?.aborted)owner.abort();
 try{
  for(const level of levels){
   let next=0,failure=null;
   const worker=async()=>{
    while(next<level.length&&!owner.signal.aborted){const url=level[next++];try{await load(url,owner.signal);}catch(e){failure??=e;owner.abort();}}
   };
   await Promise.all(Array.from({length:Math.min(4,level.length)},worker));
   if(failure)throw failure;
   if(owner.signal.aborted)throw new DOMException('Startup cancelled','AbortError');
  }
 }finally{signal?.removeEventListener('abort',abort);}
}

export function styleReady(link){try{return !!link.sheet&&link.sheet.cssRules.length>0;}catch{return false;}}
export async function restoreStylesheets(links,load,signal){
 const applied=new Map(),missing=links.filter(link=>!styleReady(link));
 await preloadLevels([missing],async(link,signal)=>applied.set(link,await load(link,signal)),signal);
 const actual=links.map(link=>applied.get(link)||link);
 if(actual.some(link=>!styleReady(link)))throw new Error('STARTUP_STYLE_MISSING');
 return actual;
}
