import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConsultationDraft} from '../web/app/consultation_draft.js';

function fixture(){
 let context='initial',draft=null,fail=false,release=null;
 const store={
  initializeDraftContext:async()=>context,
  readConsultationDraft:async()=>({context,draft:structuredClone(draft),clinicalRevision:'clinical-1'}),
  async writeConsultationDraft(value,expected,writer){
   if(release)await release;
   if(fail)throw Error('QuotaExceededError');
   if(expected.context!==context||(draft?.revision??null)!==expected.revision)throw Error('DRAFT_CONFLICT');
   draft={...structuredClone(value),revision:crypto.randomUUID()};return structuredClone(draft);
  }
 };
 return {store,get draft(){return draft;},set fail(v){fail=v;},set wait(v){release=v;},clear(){context=crypto.randomUUID();draft=null;}};
}
test('committed consultation survives a new owner; prompt is never a second stored authority',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store);await a.load();
 a.edit({text:'补充：下次复查时间？',selected:['event-1'],generated:true,sourceRevision:'clinical-1'});
 assert.equal(await a.flush(),true);assert.equal(a.status,'saved');
 const b=new ConsultationDraft(f.store);await b.load();assert.equal(b.value.text,'补充：下次复查时间？');assert.equal('prompt' in f.draft,false);
 a.dispose();b.dispose();
});
test('edits while a write is active coalesce to latest and never display saved early',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store);await a.load();let release;f.wait=new Promise(r=>release=r);
 a.edit({text:'one'});const saving=a.flush();await Promise.resolve();a.edit({text:'two'});a.edit({text:'latest'});
 assert.notEqual(a.status,'saved');release();assert.equal(await saving,true);assert.equal(f.draft.text,'latest');assert.equal(a.status,'saved');a.dispose();
});
test('quota failure preserves editable text; explicit retry can commit',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store);await a.load();f.fail=true;a.edit({text:'cannot lose this'});
 assert.equal(await a.flush(),false);assert.equal(a.value.text,'cannot lose this');assert.equal(a.status,'error');
 f.fail=false;assert.equal(await a.flush(),true);a.dispose();
});
test('multi-tab CAS refuses overwrite, while retaining losing tab text',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store),b=new ConsultationDraft(f.store);await a.load();await b.load();
 a.edit({text:'first tab'});await a.flush();b.edit({text:'second tab'});assert.equal(await b.flush(),false);
 assert.equal(f.draft.text,'first tab');assert.equal(b.value.text,'second tab');assert.equal(b.status,'conflict');a.dispose();b.dispose();
});
test('clear fence rejects an old pending write instead of resurrecting the draft',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store);await a.load();let release;f.wait=new Promise(r=>release=r);
 a.edit({text:'old content'});const saving=a.flush();await Promise.resolve();f.clear();release();assert.equal(await saving,false);assert.equal(f.draft,null);a.dispose();
});
test('clinical invalidation keeps manual additions and does not loop on own draft notice',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store);await a.load();a.edit({text:'manual additions',generated:true,sourceRevision:'clinical-1'});await a.flush();
 a.clinicalChanged();assert.equal(a.value.text,'manual additions');assert.equal(a.value.stale,true);await a.flush();
 a.external({type:'draft',writerId:a.writerId});assert.equal(a.status,'saved');a.dispose();
});

test('a saved-state observer cannot turn a committed draft into failure or cause a rewrite',async()=>{
 const f=fixture();let writes=0;const write=f.store.writeConsultationDraft;
 f.store.writeConsultationDraft=(...args)=>{writes++;return write(...args);};
 const a=new ConsultationDraft(f.store,state=>{if(state.status==='saved')throw Error('fictional saved observer');});
 try{await a.load();a.edit({text:'committed despite display failure'});assert.equal(await a.flush(),true);
  assert.equal(f.draft.text,'committed despite display failure');assert.equal(a.unsaved,false);assert.equal(await a.flush(),true);assert.equal(writes,1);
 }finally{a.dispose();}
});

test('a failed active save cannot be retried by a debounce from an earlier edit',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const f=fixture(),a=new ConsultationDraft(f.store);let writes=0,release;
 const write=f.store.writeConsultationDraft;f.store.writeConsultationDraft=(...args)=>{writes++;return write(...args);};
 try{
  await a.load();f.wait=new Promise(resolve=>release=resolve);f.fail=true;
  a.edit({text:'first'});const saving=a.flush();a.edit({text:'latest manual text'});
  release();assert.equal(await saving,false);assert.equal(a.status,'error');
  t.mock.timers.tick(500);assert.equal(writes,1,'failed save automatically retried by pending debounce');
  f.fail=false;assert.equal(await a.flush(),true);assert.equal(writes,2);assert.equal(f.draft.text,'latest manual text');
 }finally{a.dispose();}
});

test('an external conflict survives a late successful save acknowledgement',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store);let committed,release;
 const committedGate=new Promise(resolve=>committed=resolve),resultGate=new Promise(resolve=>release=resolve);
 const write=f.store.writeConsultationDraft;f.store.writeConsultationDraft=async(...args)=>{const saved=await write(...args);committed();await resultGate;return saved;};
 try{
  await a.load();a.edit({text:'keep losing page text'});const saving=a.flush();await committedGate;
  a.external({type:'draft',writerId:'other-page'});release();
  assert.equal(await saving,false,'late save acknowledgement hid external conflict');
  assert.equal(a.status,'conflict');assert.equal(a.unsaved,true);assert.equal(a.value.text,'keep losing page text');
 }finally{release?.();a.dispose();}
});

test('an external conflict survives a late non-conflict write failure',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store);let release;
 try{
  await a.load();f.wait=new Promise(resolve=>release=resolve);f.fail=true;
  a.edit({text:'keep text after conflict and quota failure'});const saving=a.flush();
  a.external({type:'reset',writerId:'other-page'});release();assert.equal(await saving,false);
  assert.equal(a.status,'conflict','late write error reopened a conflicted draft for retry');
  assert.equal(a.unsaved,true);assert.equal(a.value.text,'keep text after conflict and quota failure');
 }finally{release?.();a.dispose();}
});

test('a draft notification during initial load invalidates the captured older snapshot',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store),read=f.store.readConsultationDraft;
 let captured,release,reads=0;
 const snapshotCaptured=new Promise(resolve=>captured=resolve),gate=new Promise(resolve=>release=resolve);
 f.store.readConsultationDraft=async()=>{const value=await read();if(++reads===1){captured();await gate;}return value;};
 try{
  const loading=a.load();await snapshotCaptured;
  await f.store.writeConsultationDraft({text:'latest competing draft',selected:[]},{context:'initial',revision:null},'other');
  a.external({type:'draft',writerId:'other'});release();await loading;
  assert.equal(a.value.text,'latest competing draft','load published an older snapshot after a competing commit');
  assert.equal(a.status,'saved');assert.equal(reads,2);
 }finally{release?.();a.dispose();}
});

test('continuous changes during reload are bounded and preserve the local conflicting text',async()=>{
 const f=fixture(),a=new ConsultationDraft(f.store),read=f.store.readConsultationDraft;
 try{
  await a.load();a.edit({text:'keep local text'});await a.flush();a.external({type:'draft',writerId:'other'});
  let reads=0;
  f.store.readConsultationDraft=async()=>{const value=await read();reads++;a.external({type:'draft',writerId:'other'});return value;};
  await assert.rejects(a.reload(),/DRAFT_CHANGED_TRY_AGAIN/,'continuous reload ignored intervening changes');
  assert.equal(reads,3);assert.equal(a.value.text,'keep local text');assert.equal(a.status,'conflict');assert.equal(a.unsaved,true);
  f.store.readConsultationDraft=read;await a.reload();assert.equal(a.status,'saved');
 }finally{a.dispose();}
});

test('a clinical notification during initial load cannot leave a generated card falsely current',async()=>{
 const f=fixture();await f.store.writeConsultationDraft({text:'existing generated text',selected:[],generated:true,stale:false,sourceRevision:'clinical-1'},{context:'initial',revision:null},'other');
 const a=new ConsultationDraft(f.store),read=f.store.readConsultationDraft;let captured,release,changed=false,reads=0;
 const capturedGate=new Promise(resolve=>captured=resolve),gate=new Promise(resolve=>release=resolve);
 f.store.readConsultationDraft=async()=>{const value=await read();value.clinicalRevision=changed?'clinical-2':'clinical-1';if(++reads===1){captured();await gate;}return value;};
 try{
  const loading=a.load();await capturedGate;changed=true;a.clinicalChanged();release();await loading;
  assert.equal(a.value.stale,true,'initial load hid an intervening clinical change');assert.equal(a.value.text,'existing generated text');assert.equal(reads,2);
 }finally{release?.();a.dispose();}
});
