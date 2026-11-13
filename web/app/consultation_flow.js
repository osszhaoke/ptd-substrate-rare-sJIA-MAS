import {consultationPage} from '../features/consultation_page.js';
import {deidentifiedDraft,consultationPrompt} from '../features/consultation.js';
import {ConsultationDraft} from './consultation_draft.js';
import {StepFlow} from './step_flow.js';
import {download,notice,errorMessage} from './ui.js';

// Selection and its editable card have one durable owner; prompt is a pure projection.
export class ConsultationFlow {
 constructor(store){this.store=store;this.selected=new Set();this.before=null;this.previous=[];this.epoch=0;this.renderEpoch=0;this.newDraft();}
 newDraft(){this.draft=new ConsultationDraft(this.store,()=>this.renderOutput());}
 clear(){this.draft.dispose();this.newDraft();this.selected.clear();this.before=null;this.previous=[];this.step=null;this.epoch++;}
 remove(id){this.selected.delete(id);this.invalidate();}
 invalidate(){this.epoch++;this.draft.clinicalChanged();this.renderOutput();}
 external(message){this.draft.external(message);}
 async beforeLeave(){
  if(!this.draft.unsaved)return true;
  if(await this.draft.flush())return true;
  return confirm('问诊补充还没保存好。可先留在这里复制或下载；仍要离开？');
 }
 renderOutput(){
  if(!this.current?.())return;
  const $=s=>this.root.querySelector(s),value=this.draft.value;
  if(!$('#consult-generated'))return;
  $('#consult-generated').hidden=!value.generated;
  $('#open-consultation').hidden=!value.generated;
  if($('#consultation-text').value!==value.text)$('#consultation-text').value=value.text;
  $('#ai-prompt').value=value.generated?consultationPrompt(value.text):'';
  const states={idle:'',pending:'有修改，等待保存…',saving:'正在保存到本机…',saved:'已保存到本机。',error:'还没保存好。请重试，或先复制、下载。',conflict:'其他页面已改动或清空资料。本页文字未覆盖对方，请先下载，或载入本机最新草稿。'};
  $('#draft-save-status').textContent=states[this.draft.status]||'';
  $('#draft-stale').hidden=!value.stale;
  $('#draft-retry').hidden=this.draft.status!=='error';
  $('#draft-reload').hidden=this.draft.status!=='conflict';
  if(this.draft.status==='conflict')$('#generate-consultation').disabled=true;
 }
 async mount(root,current,navigate,published){
  this.epoch++;const render=++this.renderEpoch;this.root=root;this.current=current;
  await this.draft.load();if(!current()||render!==this.renderEpoch)return;
  this.selected=new Set(this.draft.value.selected);
  const page=await this.store.page({before:this.before});if(!current()||render!==this.renderEpoch)return;
  root.innerHTML=consultationPage(page,this.selected,this.previous.length>0);
  this.steps=new StepFlow(root,['consult-selection-step','consult-card-step','consult-ai-step'],'data-consult-step');
  const showStep=(step,scroll=true)=>{this.step=step;this.steps.show(step,{scroll});};
  showStep(this.draft.value.generated?(this.step||2):1,false);
  const $=s=>root.querySelector(s),fresh=()=>current()&&render===this.renderEpoch;
  const update=(changed=false)=>{
   if(changed){this.epoch++;this.draft.edit({selected:[...this.selected],stale:this.draft.value.generated||this.draft.value.stale});}
   $('#selection-count').textContent=`已选 ${this.selected.size} 条`;$('#generate-consultation').disabled=this.selected.size===0;
   this.renderOutput();
  };
  root.querySelectorAll('.consult-select').forEach(el=>el.onchange=()=>{
   if(el.checked){if(this.selected.size>=50){el.checked=false;notice('最多选50条，请先减少一些。');return;}this.selected.add(el.value);}else this.selected.delete(el.value);
   update(true);
  });
  const reload=()=>this.mount(root,current,navigate,published);
  if($('#consult-next'))$('#consult-next').onclick=()=>navigate(async()=>{if(!await this.beforeLeave())return;this.previous.push(this.before);this.before=page.next;await reload();});
  if($('#consult-prev'))$('#consult-prev').onclick=()=>navigate(async()=>{if(!await this.beforeLeave())return;this.before=this.previous.pop();await reload();});
  $('#clear-selection').onclick=()=>{this.selected.clear();root.querySelectorAll('.consult-select').forEach(el=>el.checked=false);update(true);};
  let generating=false;
  $('#generate-consultation').onclick=async()=>{
   if(generating||!this.selected.size||this.draft.status==='conflict')return;
   if(this.draft.value.generated&&!confirm('重新生成会替换这份问诊卡，包括手动补充。需要保留请先下载。继续？'))return;
   generating=true;$('#generate-consultation').disabled=true;
   const ids=[...this.selected],token=++this.epoch,draft=this.draft,version=draft.version;
   const valid=()=>fresh()&&token===this.epoch&&draft===this.draft&&version===draft.version&&draft.status!=='conflict';$('#consultation-status').textContent='正在整理…';
   try{
    const snapshot=await this.store.selectedSnapshot(ids);if(!valid()||ids.length!==this.selected.size||ids.some(id=>!this.selected.has(id)))return;
    if(snapshot.events.length!==ids.length){for(const id of ids)if(!snapshot.events.some(e=>e.id===id))this.selected.delete(id);update(true);notice('有病程已删除，请重新选择。');return;}
    const card=deidentifiedDraft({},snapshot.events),revision=await this.store.get('meta','data-revision');
    if(!valid()||ids.length!==this.selected.size||ids.some(id=>!this.selected.has(id)))return;
    if(revision?.value!==snapshot.revision){this.invalidate();$('#consultation-status').textContent='病程有更新，请重新生成。';return;}
    this.draft.edit({text:card.text,selected:ids,generated:true,stale:false,sourceRevision:snapshot.revision});
    await this.draft.flush();if(!fresh())return;
    showStep(2);$('#consultation-status').textContent='在本机整理，不发送给任何人。';
   }catch(e){if(valid())notice(errorMessage(e));}
   finally{generating=false;if(fresh()){
    $('#generate-consultation').disabled=this.selected.size===0||this.draft.status==='conflict';
    if($('#consultation-status').textContent==='正在整理…')$('#consultation-status').textContent='这次未重新整理，已保留原有内容。';
   }}
  };
  $('#consultation-text').oninput=()=>{this.draft.edit({text:$('#consultation-text').value});$('#copy-status').textContent='内容已修改，提示词也已更新。';};
  $('#open-consultation').onclick=()=>showStep(2);
  $('#back-selection').onclick=()=>showStep(1);
  $('#open-ai').onclick=()=>showStep(3);
  $('#back-card').onclick=()=>showStep(2);
  $('#draft-retry').onclick=()=>this.draft.flush();
  $('#draft-reload').onclick=async()=>{if(!confirm('载入本机最新草稿会替换本页文字。需要保留请先下载。继续？'))return;try{await this.draft.reload();if(fresh())await reload();}catch(e){if(fresh())notice(errorMessage(e));}};
  async function copy(selector){const el=$(selector);try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(el.value);if(fresh())$('#copy-status').textContent='已复制。';}catch{if(fresh()){el.focus();el.select();$('#copy-status').textContent='已选中文字，请长按或用复制键复制。';}}}
  $('#copy-consultation').onclick=()=>copy('#consultation-text');$('#copy-prompt').onclick=()=>copy('#ai-prompt');
  $('#export-draft').onclick=()=>download(new Blob([$('#consultation-text').value],{type:'text/plain;charset=utf-8'}),'问诊卡.txt');
  update();published();
 }
}
