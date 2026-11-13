import {observe} from '../shared/observe.js';
import {stateSnapshot,recordDetail} from './state_read.js';
import {need,LIMITS} from '../domain/model.js';
import {initializeDraftContext,readConsultationDraft,writeConsultationDraft,resetDraftContext} from './consultation_draft.js';
const STORES=['meta','sources','reviews','events','receipts'];
// Only request callbacks run within these transactions. Never await crypto/network in a transaction.
export class RecordStore {
 constructor(name='ptds-independent-h5-v1',onState=()=>{}) { this.name=name;this.onState=onState;this.connection=null;this.opening=null;this.listeners=new Set();this.channel=null;this.observerFailures=0; }
 async open(version=2) {
  if(this.connection)return this.connection;
  if(!this.channel&&typeof BroadcastChannel!=='undefined'){this.channel=new BroadcastChannel('ptds-data:'+this.name);this.channel.onmessage=e=>this.notify(e.data);}
  if(this.opening)return this.opening;
  this.opening=new Promise((resolve,reject)=>{
   const r=indexedDB.open(this.name,version);let blocked=false;
   r.onblocked=()=>{blocked=true;this.observe(()=>this.onState('UPGRADE_BLOCKED')); reject(new Error('UPGRADE_BLOCKED_CLOSE_OTHER_TABS'));};
   r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('meta'))for(const s of STORES){const o=d.createObjectStore(s,{keyPath:'id'});if(s==='events')o.createIndex('date',['payload.clinicalDate','id']);}};
   r.onerror=()=>reject(r.error);r.onsuccess=()=>{if(blocked){r.result.close();return;}const connection=r.result;this.connection=connection;connection.onversionchange=()=>{connection.close();if(this.connection===connection)this.connection=null;this.observe(()=>this.onState('VERSION_CHANGED_RELOAD')); };resolve(connection);};
  });
  try{return await this.opening;}finally{this.opening=null;}
 }
 close(){this.connection?.close();this.connection=null;this.channel?.close();this.channel=null;}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 notification(value){return ['clinical','settings','draft','draft-context','reset'].includes(value?.type)?value:{type:'clinical'};}
 // Observers never own transaction/open completion. Keep diagnostics bounded and data-free.
 observe(callback){observe(this,callback);}
 notify(message){message=this.notification(message);for(const fn of [...this.listeners])this.observe(()=>fn(message));}
 changed(message={type:'clinical'}){message=this.notification(message);this.notify(message);this.observe(()=>this.channel?.postMessage(message));}
 initializeDraftContext(){return initializeDraftContext(this);}
 readConsultationDraft(){return readConsultationDraft(this);}
 writeConsultationDraft(value,expected,writerId){return writeConsultationDraft(this,value,expected,writerId);}
 bump(a){a.store('meta').put({id:'data-revision',value:crypto.randomUUID()});}
 stateSnapshot(options){return stateSnapshot(this,options);}
 detail(id){return recordDetail(this,id);}
 reviews(){return this.tx(['reviews'],'readonly',a=>{a.store('reviews').getAll().onsuccess=e=>a.result(e.target.result);});}
 async tx(names,mode,fn,notification={type:'clinical'}) {
  const db=await this.open();return new Promise((resolve,reject)=>{
   const t=db.transaction(names,mode);let result,error;
   const api={store:n=>t.objectStore(n),result:v=>{result=v;},fail:code=>{error=new Error(code);t.abort();}};
   t.oncomplete=()=>{resolve(result);if(mode==='readwrite'&&names.includes('meta'))this.observe(()=>this.changed(notification));};t.onabort=()=>reject(error||t.error||new Error('TRANSACTION_ABORTED'));
   t.onerror=()=>{};
   try{fn(api);}catch(e){error=e;t.abort();}
  });
 }
 get(name,id){return this.tx([name],'readonly',a=>{a.store(name).get(id).onsuccess=e=>a.result(e.target.result);});}
 meta(value){return this.tx(['meta'],'readwrite',a=>a.store('meta').put(value),{type:value.id==='data-revision'?'clinical':'settings'});}
 async stage(review,source,expected) {
  return this.tx(['reviews','sources'],'readwrite',a=>{
   const s=a.store('reviews');s.get(review.id).onsuccess=e=>{
    const old=e.target.result;if((old?.revision||0)!==expected)return a.fail('STALE_REVIEW');
    if(old?.saved)return a.fail('REVIEW_ALREADY_SAVED');
    s.count().onsuccess=c=>{if(!old&&c.target.result>=LIMITS.drafts)return a.fail('DRAFT_LIMIT');
     const put=()=>{if(old?.sourceBinding&&old.sourceBinding.id!==source?.id)a.store('sources').delete(old.sourceBinding.id);if(source)a.store('sources').put(source);s.put(review);a.result(review);};
     if(source)a.store('sources').get(source.id).onsuccess=e=>{if(e.target.result&&old?.sourceBinding?.id!==source.id)return a.fail('SOURCE_OWNERSHIP_CONFLICT');put();};else put();
    };
   };
  });
 }
 confirm(id,revision,digest,confirmation) {
  return this.tx(['reviews'],'readwrite',a=>{const s=a.store('reviews');s.get(id).onsuccess=e=>{const r=e.target.result;if(!r||r.revision!==revision||r.digest!==digest||r.saved)return a.fail('STALE_REVIEW');r.confirmation=confirmation;s.put(r);a.result(r);};});
 }
 commit(review,requestId,event,receipt) {
  return this.tx(['reviews','events','receipts','sources','meta'],'readwrite',a=>{
   const rs=a.store('receipts');rs.get(requestId).onsuccess=e=>{
    const old=e.target.result;
    if(old){if(old.digest!==review.digest)return a.fail('IDEMPOTENCY_CONFLICT');if(old.deleted)return a.fail('RECORD_DELETED');a.result(old);return;}
    rs.count().onsuccess=e=>{if(e.target.result>=40000)return a.fail('RECEIPT_LIMIT');
    a.store('reviews').get(review.id).onsuccess=e=>{
     const r=e.target.result;if(!r||r.saved||r.revision!==review.revision||r.digest!==review.digest)return a.fail('STALE_REVIEW');
     if(!r.confirmation||r.confirmation.digest!==r.digest||r.confirmation.revision!==r.revision)return a.fail('CONFIRMATION_REQUIRED');
     a.store('events').count().onsuccess=e=>{if(e.target.result>=LIMITS.records)return a.fail('RECORD_LIMIT');
      const put=()=>{a.store('events').add(event);rs.add(receipt);a.store('reviews').delete(r.id);this.bump(a);a.result(receipt);};
      if(r.sourceBinding){a.store('sources').get(r.sourceBinding.id).onsuccess=e=>{if(e.target.result?.hash!==r.sourceBinding.hash||e.target.result?.bindingDigest!==r.sourceBinding.bindingDigest)return a.fail('SOURCE_MISSING');put();};}else put();
     };
    };};
   };
  });
 }
 page({before=null,date=null,limit=50}={}) {
  need(Number.isInteger(limit)&&limit>=1&&limit<=50,'PAGE_LIMIT');
  return this.tx(['events'],'readonly',a=>{
   const items=[];let range;
   if(date)range=before?IDBKeyRange.bound([date,''],before,false,true):IDBKeyRange.bound([date,''],[date,'\uffff']);
   else if(before)range=IDBKeyRange.upperBound(before,true);
   const r=a.store('events').index('date').openCursor(range,'prev');r.onsuccess=()=>{const c=r.result;if(c&&items.length<limit){items.push(c.value);c.continue();}else a.result({items,next:c?[items.at(-1).payload.clinicalDate,items.at(-1).id]:null});};
  });
 }
 snapshot() {return this.tx(STORES,'readonly',a=>{const snap={};let n=0;for(const s of STORES)a.store(s).getAll().onsuccess=e=>{snap[s]=e.target.result;if(++n===STORES.length)a.result(snap);};});}
 // Read: selected events and revision share one snapshot; no writes or background work.
 selectedSnapshot(ids){need(Array.isArray(ids)&&ids.length<=50&&new Set(ids).size===ids.length,'SELECTION_LIMIT');return this.tx(['events','meta'],'readonly',a=>{const events=[],result={events,revision:null};let pending=ids.length+1;const done=()=>{if(--pending===0)a.result(result);};a.store('meta').get('data-revision').onsuccess=e=>{result.revision=e.target.result?.value??null;done();};for(const id of ids)a.store('events').get(id).onsuccess=e=>{if(e.target.result)events.push(e.target.result);done();};});}
 backupSnapshot(){const names=['meta','events','receipts','sources'];return this.tx(names,'readonly',a=>{const snap={};let n=0;for(const name of names)(name==='meta'?a.store(name).get('settings'):a.store(name).getAll()).onsuccess=e=>{snap[name]=name==='meta'?(e.target.result?[e.target.result]:[]):e.target.result;if(++n===names.length)a.result(snap);};});}
 importSnapshot(data) {
  return this.tx(['events','sources','receipts','meta'],'readwrite',a=>{
   let pending=0,conflict=false,done=false,added=0,addedReceipts=0;
   const insert=()=>{if(!done||pending||conflict)return;
    a.store('events').count().onsuccess=e=>{if(e.target.result+added>LIMITS.records)return a.fail('RECORD_LIMIT');a.store('receipts').count().onsuccess=e=>{if(e.target.result+addedReceipts>40000)return a.fail('RECEIPT_LIMIT');for(const s of ['events','sources','receipts'])for(const v of data[s])a.store(s).put(v);if(data.settings){a.store('meta').get('settings').onsuccess=e=>{const old=e.target.result;if(old&&old.timezone!==data.settings.timezone)return a.fail('IMPORT_TIMEZONE_CONFLICT');if(!old)a.store('meta').put(data.settings);};}this.bump(a);a.result({added,duplicates:data.events.length-added});};};
   };
   for(const s of ['events','sources','receipts'])for(const v of data[s]){pending++;a.store(s).get(v.id).onsuccess=e=>{const old=e.target.result;
    const key=s==='sources'?'bindingDigest':'digest';
    if(old&&(old[key]!==v[key]||s==='receipts'&&(old.eventId!==v.eventId||old.deleted))){conflict=true;a.fail('IMPORT_CONFLICT');return;}
    if(s==='events'&&!old)added++;if(s==='receipts'&&!old)addedReceipts++;pending--;insert();
   };}done=true;insert();
  });
 }
 removeEvent(id) {
  return this.tx(['events','receipts','sources','meta'],'readwrite',a=>{a.store('events').get(id).onsuccess=e=>{const v=e.target.result;if(!v)return;a.store('events').delete(id);this.bump(a);a.store('receipts').get(v.requestId).onsuccess=e=>{if(e.target.result)a.store('receipts').put({...e.target.result,deleted:true});};if(v.sourceBinding)a.store('sources').delete(v.sourceBinding.id);};});
 }
 discardReview(id) {return this.tx(['reviews','sources'],'readwrite',a=>{a.store('reviews').get(id).onsuccess=e=>{const r=e.target.result;if(r?.sourceBinding)a.store('sources').delete(r.sourceBinding.id);a.store('reviews').delete(id);};});}
 clear(){return this.tx(STORES,'readwrite',a=>{for(const s of STORES)a.store(s).clear();this.bump(a);resetDraftContext(a);},{type:'reset'});}
}
