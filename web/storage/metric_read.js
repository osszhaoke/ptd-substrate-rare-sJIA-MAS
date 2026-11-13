import {need, timezone} from '../domain/model.js';

// Read only: one authority, one meta/events transaction, no source Blob reads or writes.
export function metricSnapshot(store,{nature,zone,before=null,date=null,limit=50}) {
  need(['REAL','SYNTHETIC'].includes(nature),'METRIC_NATURE_REQUIRED');timezone(zone);
  need(Number.isInteger(limit)&&limit>=1&&limit<=50,'PAGE_LIMIT');
  need(!date || /^\d{4}-\d{2}-\d{2}$/.test(date),'INVALID_DATE');
  need(!before || Array.isArray(before)&&before.length===2&&before.every(v=>typeof v==='string'),'METRIC_CURSOR_INVALID');
  return store.tx(['meta','events'],'readonly',a=>{
    const result={revision:'initial',events:[],dates:[],next:null,excludedTimezone:0,partialDates:before?[before[0]]:[]};
    a.store('meta').get('data-revision').onsuccess=e=>{result.revision=e.target.result?.value||'initial';};
    const range=date ? before ? IDBKeyRange.bound([date,''],before,false,true) : IDBKeyRange.bound([date,''],[date,'\uffff']) : before ? IDBKeyRange.upperBound(before,true) : null;
    const request=a.store('events').index('date').openCursor(range,'prev');
    request.onsuccess=()=>{
      const c=request.result;
      if(!c){a.result(result);return;}
      const p=c.value.payload;
      if(p.nature===nature&&p.instanceTimezone===zone){
        if(result.events.length===limit){const last=result.events.at(-1);result.next=[last.payload.clinicalDate,last.id];if(p.clinicalDate===last.payload.clinicalDate)result.partialDates.push(p.clinicalDate);a.result(result);return;}
        result.events.push(c.value);if(!result.dates.includes(p.clinicalDate))result.dates.push(p.clinicalDate);
      }else if(p.nature===nature)result.excludedTimezone++;
      c.continue();
    };
  });
}
