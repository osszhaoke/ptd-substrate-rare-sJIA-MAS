import {observe} from '../shared/observe.js';
const empty=()=>({text:'',selected:[],generated:false,stale:false,sourceRevision:null});
// One bounded pending value, one active write, one timer. Clinical records are never written here.
export class ConsultationDraft {
 constructor(store,onChange=()=>{},delay=500){
  this.store=store;this.onChange=onChange;this.delay=delay;this.writerId=crypto.randomUUID();
  this.value=empty();this.status='idle';this.version=0;this.savedVersion=0;this.context=null;this.revision=null;this.timer=null;this.active=null;this.loading=null;this.loaded=false;this.disposed=false;this.error=null;this.observerFailures=0;
 }
 emit(){observe(this,()=>this.onChange(this));}
 async load(){
  if(this.loaded)return;if(this.loading)return this.loading;
  this.loading=(async()=>{
   await this.store.initializeDraftContext();const snapshot=await this.store.readConsultationDraft();
   if(this.disposed)return;this.context=snapshot.context;this.revision=snapshot.draft?.revision??null;
   this.value=snapshot.draft?{...empty(),...snapshot.draft,selected:[...snapshot.draft.selected]}:empty();
   this.loaded=true;this.status=snapshot.draft?'saved':'idle';this.emit();
   if(this.value.generated&&this.value.sourceRevision!==snapshot.clinicalRevision)this.clinicalChanged();
  })();
  try{await this.loading;}finally{this.loading=null;}
 }
 edit(patch){
  if(this.disposed||!this.loaded)return;
  this.value={...this.value,...patch};this.version++;this.error=null;
  if(this.status!=='conflict'){this.status='pending';clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=null;void this.flush();},this.delay);}
  this.emit();
 }
 get unsaved(){return this.version!==this.savedVersion||this.status==='conflict';}
 async flush(){
  clearTimeout(this.timer);this.timer=null;
  if(this.disposed||this.status==='conflict')return false;
  if(this.active)return this.active;
  this.active=(async()=>{
   while(this.savedVersion!==this.version&&!this.disposed){
    const version=this.version,value={...this.value,selected:[...this.value.selected]};this.status='saving';this.emit();
    try{
     const saved=await this.store.writeConsultationDraft(value,{context:this.context,revision:this.revision},this.writerId);
     if(this.disposed)return false;
     this.revision=saved.revision;this.savedVersion=version;
    }catch(error){this.error=error;this.status=error.message==='DRAFT_CONFLICT'?'conflict':'error';this.emit();return false;}
   }
   if(this.disposed)return false;
   this.status=this.status==='idle'?'idle':'saved';this.emit();return true;
  })();
  try{return await this.active;}finally{this.active=null;}
 }
 clinicalChanged(){if(this.loaded&&this.value.generated&&!this.value.stale)this.edit({stale:true});}
 external(message){
  if(!this.loaded||message.writerId===this.writerId||message.type==='draft-context')return;
  if(message.type==='draft'||message.type==='reset'){
   clearTimeout(this.timer);this.timer=null;this.status='conflict';this.emit();
  }
 }
 async reload(){
  if(this.active)await this.active;
  clearTimeout(this.timer);this.timer=null;this.loaded=false;this.version=0;this.savedVersion=0;
  await this.load();
 }
 dispose(){this.disposed=true;clearTimeout(this.timer);this.timer=null;}
}
