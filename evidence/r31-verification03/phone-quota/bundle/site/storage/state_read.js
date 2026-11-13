// Storage-only reads. Caller supplies relevance codes; no rule evaluation inside the IDB transaction.
import {need} from '../domain/model.js';
export function stateSnapshot(store,{nature,zone,codes,flags,days=30,before=null}){
 need(['SYNTHETIC','REAL'].includes(nature)&&Number.isInteger(days)&&days>=1&&days<=30,'STATE_QUERY_INVALID');
 return store.tx(['meta','events'],'readonly',a=>{
  const result={revision:null,events:[],dates:[],next:null,excludedTimezone:0};
  a.store('meta').get('data-revision').onsuccess=e=>{result.revision=e.target.result?.value||'initial';};
  const index=a.store('events').index('date');
  // One date at a time, bounded by the existing 20k record cap. Avoid one IPC/value clone per row.
  function readDate(upper){
   const keys=index.openKeyCursor(upper?IDBKeyRange.upperBound([upper,''],true):null,'prev');
   keys.onsuccess=()=>{
    const cursor=keys.result;if(!cursor){a.result(result);return;}
    const date=cursor.key[0],rows=index.getAll(IDBKeyRange.bound([date,''],[date,'\uffff']));
    rows.onsuccess=()=>{
     for(const e of rows.result.reverse()){
      const p=e.payload,relevant=p.nature===nature&&(p.observations.some(o=>codes.includes(o.code))||flags.some(k=>p.clinicalFlags?.[k]===true||p.clinicalFlags?.[k]===false));
      if(relevant&&p.instanceTimezone!==zone){result.excludedTimezone++;continue;}
      if(relevant){if(!result.dates.includes(p.clinicalDate)){if(result.dates.length===days){result.next=result.dates.at(-1);a.result(result);return;}result.dates.push(p.clinicalDate);}result.events.push(e);}
     }
     readDate(date);
    };
   };
  }
  readDate(before);
 });
}
export function recordDetail(store,id){return store.tx(['events','receipts','sources'],'readonly',a=>{
 a.store('events').get(id).onsuccess=e=>{const event=e.target.result;if(!event){a.result(null);return;}
  const out={event,receipt:null,source:null};a.store('receipts').get(event.requestId).onsuccess=e=>{out.receipt=e.target.result;};
  if(event.sourceBinding)a.store('sources').get(event.sourceBinding.id).onsuccess=e=>{out.source=e.target.result;};a.result(out);
 };
});}
