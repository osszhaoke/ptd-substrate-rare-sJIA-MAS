import {need} from '../domain/model.js';

const CONTEXT='consultation-context',DRAFT='consultation-draft';
export function initializeDraftContext(store){
 return store.tx(['meta'],'readwrite',a=>{
  const meta=a.store('meta');meta.get(CONTEXT).onsuccess=e=>{
   const value=e.target.result?.value||crypto.randomUUID();
   if(!e.target.result)meta.put({id:CONTEXT,value});a.result(value);
  };
 },{type:'draft-context'});
}
// Read only: no initialization, background work or clinical data rewrite.
export function readConsultationDraft(store){
 return store.tx(['meta'],'readonly',a=>{
  const out={context:null,draft:null,clinicalRevision:null};let pending=3;
  for(const [id,key] of [[CONTEXT,'context'],[DRAFT,'draft'],['data-revision','clinicalRevision']]){
   a.store('meta').get(id).onsuccess=e=>{
    out[key]=key==='draft'?(e.target.result??null):(e.target.result?.value??null);
    if(!--pending)a.result(out);
   };
  }
 });
}
export function writeConsultationDraft(store,value,expected,writerId){
 need(typeof value.text==='string'&&value.text.length<=1000000,'DRAFT_TEXT_LIMIT');
 need(Array.isArray(value.selected)&&value.selected.length<=50&&new Set(value.selected).size===value.selected.length&&value.selected.every(id=>typeof id==='string'),'SELECTION_LIMIT');
 const draft={id:DRAFT,schema:'ptds-consultation-draft/1',text:value.text,selected:[...value.selected],generated:!!value.generated,stale:!!value.stale,sourceRevision:value.sourceRevision??null,revision:crypto.randomUUID()};
 return store.tx(['meta'],'readwrite',a=>{
  const meta=a.store('meta');meta.get(CONTEXT).onsuccess=e=>{
   if(!expected.context||e.target.result?.value!==expected.context)return a.fail('DRAFT_CONFLICT');
   meta.get(DRAFT).onsuccess=e=>{
    if((e.target.result?.revision??null)!==expected.revision)return a.fail('DRAFT_CONFLICT');
    meta.put(draft);a.result(draft);
   };
  };
 },{type:'draft',writerId});
}

export function resetDraftContext(api){api.store('meta').put({id:CONTEXT,value:crypto.randomUUID()});}
