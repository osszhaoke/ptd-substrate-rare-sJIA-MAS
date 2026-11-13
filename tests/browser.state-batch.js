// Storage-only reads. Caller supplies relevance codes; no rule evaluation inside the IDB transaction.
const need=(x,m)=>{if(!x)throw Error(m);};
function referenceSnapshot(store,{nature,zone,codes,flags,days=30,before=null}){
 need(['SYNTHETIC','REAL'].includes(nature)&&Number.isInteger(days)&&days>=1&&days<=30,'STATE_QUERY_INVALID');
 return store.tx(['meta','events'],'readonly',a=>{
  const result={revision:null,events:[],dates:[],next:null,excludedTimezone:0};
  a.store('meta').get('data-revision').onsuccess=e=>{result.revision=e.target.result?.value||'initial';};
  const range=before?IDBKeyRange.upperBound([before,''],true):null;
  const r=a.store('events').index('date').openCursor(range,'prev');r.onsuccess=()=>{
   const cursor=r.result;if(!cursor){a.result(result);return;}
   const e=cursor.value,p=e.payload;
   const relevant=p.nature===nature&&(p.observations.some(o=>codes.includes(o.code))||flags.some(k=>p.clinicalFlags?.[k]===true||p.clinicalFlags?.[k]===false));
   if(relevant&&p.instanceTimezone!==zone){result.excludedTimezone++;cursor.continue();return;}
   if(relevant){if(!result.dates.includes(p.clinicalDate)){if(result.dates.length===days){result.next=result.dates.at(-1);a.result(result);return;}result.dates.push(p.clinicalDate);}result.events.push(e);}
   cursor.continue();
  };
 });
}

(async()=>{
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),{canonical}=await import('/domain/model.js');
 const s=new RecordStore('batch-parity-'+crypto.randomUUID()),svc=new RecordService(s);
 for(let i=0;i<144;i++){let r=await svc.stage({formatVersion:2,clinicalDate:new Date(Date.UTC(2020,0,1+i%36)).toISOString().slice(0,10),observedAt:null,instanceTimezone:i%5?'Asia/Shanghai':'UTC',documentKind:'manual',nature:i%2?'REAL':'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'fictional batch parity',observations:i%3?[{code:'crp',displayName:'CRP',valueLiteral:'3.4',unit:'mg/L',context:'LAB',sourceLineIds:[]}]:[],clinicalFlags:{FEVER:i%3===0?true:null}});r=await svc.confirm(r,true);await svc.save(r);}
 let queries=0;for(const nature of ['SYNTHETIC','REAL'])for(const zone of ['Asia/Shanghai','UTC'])for(const days of [1,2,30])for(const before of [null,'2020-01-30'])for(const codes of [['crp'],[]]){
  const q={nature,zone,days,before,codes,flags:['FEVER']},expected=await referenceSnapshot(s,q),actual=await s.stateSnapshot(q);if(canonical(expected)!==canonical(actual))throw Error('BATCH_READ_CHANGED_SNAPSHOT '+JSON.stringify(q));queries++;
 }
 s.close();window.webkit.messageHandlers.result.postMessage({ok:true,queries,identity:'full snapshot field and order comparison with pinned original cursor; fictional formal saves'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
