import {MetricsFlow} from './metrics_flow.js';
import {showReport,resetRowCheck,detachReportRows} from './report_editor.js';
import {mountRecords} from './records_flow.js';
import {mountSettings} from './settings_flow.js';
import {BackupTask} from './backup_task.js';
import {OcrTask} from './ocr_task.js';
import {EditorFlow} from './editor_flow.js';
import {ConsultationFlow} from './consultation_flow.js';
import {ActionCoordinator} from './action_coordinator.js';
import {StateController} from './state_controller.js';
import {stateDetail} from '../features/states.js';
import {RecordStore} from '../storage/store.js';
import {RecordService} from '../domain/service.js';
import {DICTIONARY,timezone,need} from '../domain/model.js';
import {ocrConfig,recognize,inspectImage} from '../adapters/ocr.js';
import {editor,row,readPayload,ledgerView} from '../features/editor.js';
import {detailPage} from '../features/records.js';
import {$,esc,button,notice,download,errorMessage} from './ui.js';
const store=new RecordStore(undefined,state=>notice(state));const service=new RecordService(store);
// All shared UI state is owned here. Every page transition cancels its network and increments generation.
let zone,view,generation=0,review=null,source=null,dirty=true,filter='',cursor=null,detail=null;
let config={enabled:false},editing=false,editorFlow=null;
const main=$('#main');
let releaseHomeResources=()=>{};
function unmountHomeResources(){metricsFlow.dispose();editorFlow?.dispose();releaseHomeResources();releaseHomeResources=()=>{};}
const backupTask=new BackupTask(progress=>{
 if(view!=='settings'||!$('#backup-progress'))return;
 const labels={read:'正在读取',encrypt:'正在加密',decrypt:'正在解密',validate:'正在核对',preview:'正在核对本机记录',ready:'正在准备下载',committing:'正在保存，完成前不能取消',cancelled:'已取消，原有病程未改变'};
 if(labels[progress.phase])$('#backup-progress').textContent=labels[progress.phase]+(progress.total&&progress.phase!=='ready'?' '+Math.min(99,Math.round(100*progress.done/progress.total))+'%':progress.phase==='encrypt'?' · 已处理 '+(progress.done/1048576).toFixed(1)+' MB':'');
 $('#cancel-backup').hidden=!progress.busy;$('#cancel-backup').disabled=!progress.cancellable;
 for(const id of ['export','inspect-backup','clear-all'])if($('#'+id))$('#'+id).disabled=progress.busy;
});
const ocrTask=new OcrTask();
function cancelOcr(){const busy=ocrTask.busy;ocrTask.cancel();if(busy&&$('#ocr')){$('#ocr').disabled=false;editorFlow?.ocrWaiting(false);}}
const coordinator=new ActionCoordinator(e=>notice(errorMessage(e)));
const navigation=fn=>coordinator.navigate(fn);
const consultationFlow=new ConsultationFlow(store);const metricsFlow=new MetricsFlow(store);
const stateController=new StateController(store);const statePrefs={enabled:true,nature:'REAL'};let editGeneration=0,editorBaseline=0,stateQuery=null;
function lockEditor(disabled){main.querySelectorAll('#editor input,#editor select,#editor textarea,#editor button,#source-step input,#source-step button,#confirmation input,#confirmation button').forEach(e=>e.disabled=disabled);}
function bindStateLinks(){main.querySelectorAll('[data-state-rule]').forEach(el=>el.onclick=()=>navigation(()=>showState(el.dataset.stateRule)));}
async function showState(id,{before=null,history=false,date=null}={}){
 document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav==='records'));
 unmountHomeResources();const g=++generation;cancelOcr();view='state-detail';editing=false;stateQuery={id,before,history,date};
 const snap=await stateController.load({nature:statePrefs.nature,zone,before,days:history?30:2});if(g!==generation)return;main.innerHTML=stateDetail(snap,id,{history,date});
 main.querySelectorAll('[data-state-date]').forEach(el=>el.onclick=()=>navigation(()=>showState(id,{before,history:true,date:el.dataset.stateDate})));
 on('back-records',()=>navigate('records'));on('state-add-data',()=>navigate('capture'));on('state-history',()=>showState(id,{history:true}));on('state-earlier',()=>showState(id,{history:true,before:snap.next}));
 main.querySelectorAll('.state-source').forEach(el=>el.onclick=()=>navigation(()=>showDetail(el.dataset.id,stateQuery)));
 coordinator.published();
}
function dataChanged(changed=true){stateController.invalidate();if(changed)consultationFlow.invalidate();if(!coordinator.busy&&!editing&&zone){if(view==='records')navigation(()=>navigate(view)).catch(e=>notice(errorMessage(e)));else if(view==='metrics')navigation(()=>navigate('metrics',{metricsContext:metricsFlow.context()})).catch(e=>notice(errorMessage(e)));else if(view==='state-detail'&&stateQuery)navigation(()=>showState(stateQuery.id,stateQuery)).catch(e=>notice(errorMessage(e)));}}
const unsubscribe=store.subscribe(message=>{if(message.type==='draft'||message.type==='draft-context'){consultationFlow.external(message);return;}if(message.type==='settings')return;if(message.type==='reset')consultationFlow.external(message);dataChanged(true);});addEventListener('focus',()=>dataChanged(false));addEventListener('pagehide',()=>{metricsFlow.dispose();stateController.invalidate();editorFlow?.evidence.suspend();});
function network(){ $('#network').textContent=navigator.onLine?'保存在本机':'离线 · 可以手填'; }
addEventListener('online',network);addEventListener('offline',network);network();
addEventListener('beforeunload',e=>{if(consultationFlow.draft.unsaved||editing&&dirty&&editGeneration!==editorBaseline){e.preventDefault();e.returnValue='';}backupTask.cancel();cancelOcr();});
function invalidate(){cancelOcr();editGeneration++;dirty=true;if($('#confirmed')){$('#confirmed').checked=false;$('#confirmed').disabled=true;$('#save').disabled=true;$('#review-status').textContent='内容改过了，请重新核对。';}editorFlow?.changed();}
async function action(fn){const g=generation;return coordinator.write(async()=>{try{await fn();}finally{if(g===generation)main.querySelectorAll('[data-busy]').forEach(el=>el.disabled=false);}});}
const localEditorIds=new Set(['add-metric','start-review','back-source','edit-review']);
const navigationIds=new Set(['back-records','state-add-data','state-history','state-earlier','resume-draft','back-capture','clear-date','next-page']);
function on(id,fn){const el=$('#'+id);if(el)el.onclick=()=>['ocr','export','inspect-backup'].includes(id)?Promise.resolve().then(fn).catch(e=>{if(e.name!=='AbortError')notice(errorMessage(e));}):localEditorIds.has(id)?fn():navigationIds.has(id)?navigation(fn):action(fn);}
function saveReady(){dirty=false;$('#confirmed').disabled=false;$('#confirmed').checked=false;$('#save').disabled=true;$('#review-status').textContent='内容已暂存，勾选确认后才会成为正式记录。';editorFlow.ready(review.payload);}
function bindEditor(){
 editorFlow=new EditorFlow(main,()=>source);if(source)editorFlow.selected();
 on('start-review',()=>{cancelOcr();editorFlow.show(2);});on('back-source',()=>editorFlow.show(1));on('edit-review',()=>{invalidate();editorFlow.show(2);});
 $('#editor').oninput=e=>{resetRowCheck(e);invalidate();};$('#editor').onchange=e=>{resetRowCheck(e);invalidate();if(e.target.matches('.metric-code')){const el=e.target.closest('.metric-row');el.querySelector('.metric-unit').value=DICTIONARY[e.target.value][1];if(!el.dataset.ocrOrigin&&!el.dataset.report)el.dataset.lines='[]';editorFlow.evidence.refresh();}};
 $('#editor').onsubmit=e=>e.preventDefault();$('#editor').onclick=e=>{if(e.target.matches('.remove-metric')){e.target.closest('.metric-row,.report-row').remove();invalidate();}};
 $('#confirmed').onchange=()=>{$('#save').disabled=!$('#confirmed').checked||dirty;};
 on('add-metric',async()=>{$('#observations').insertAdjacentHTML('beforeend',row());invalidate();});
 $('#image').onchange=()=>action(async()=>{
  const f=$('#image').files[0];if(!f)return;cancelOcr();const g=generation;await inspectImage(f);const s=await service.source(f);if(g!==generation)return;
  // Remove OCR linkage when the original changes, rather than attaching old candidates to a new image.
  source=s;detachReportRows(main);main.querySelectorAll('.metric-row').forEach(el=>{el.dataset.lines='[]';delete el.dataset.ocrOrigin;});$('#source-name').textContent=f.name;editorFlow.selected();$('#ledger').innerHTML=ledgerView(source);bindOriginal();invalidate();
 });
 on('prepare-review',async()=>{cancelOcr();const edit=editGeneration,g=generation,p=readPayload(zone,source),s=source;const r=await service.stage(p,s,review);if(g!==generation)return;review=r;if(edit!==editGeneration||s!==source){invalidate();notice('保存时内容改过了，请重新核对。');return;}saveReady();});
 on('save',async()=>{
  need(!dirty&&$('#confirmed').checked,'CONFIRMATION_REQUIRED');const confirmedEdit=editGeneration;$('#save').disabled=true;lockEditor(true);
  try{review=await service.confirm(review,true);need(confirmedEdit===editGeneration&&!dirty&&$('#confirmed').checked,'CONFIRMATION_REQUIRED');const receipt=await service.save(review);dirty=false;editing=false;review=null;source=null;notice('已保存。');await showDetail(receipt.eventId);}
  catch(e){const r=review&&await store.get('receipts',review.requestId);if(r&&!r.deleted){editing=false;dirty=false;review=null;source=null;notice('这条已经保存过了，已打开原记录。');await showDetail(r.eventId);}else throw e;}
  finally{lockEditor(false);if($('#save')&&$('#confirmed'))$('#save').disabled=dirty||!$('#confirmed').checked;}
 });
 on('discard',async()=>{if(!confirm('放弃这次录入和图片？'))return;if(review)await store.discardReview(review.id);review=null;source=null;editing=false;dirty=false;await navigate('records');});
 on('ocr',async()=>{
  need(source,'请先选择图片');need(!dirty||confirm('识别结果会替换已填的指标，继续？'),'已取消');
  const g=generation,s=source,consent=$('#upload-consent').checked,job=ocrTask.start(()=>g===generation&&s===source);
  $('#ocr').disabled=true;editorFlow.ocrWaiting(true);
  try{
   const result=await recognize(s.blob,$('#trial-token').value,config,consent,job.signal);if(!job.valid())return;
   const replacement=await service.source(new File([s.blob],s.name,{type:s.type}),result.ledger);if(!job.valid())return;
   source=replacement;const coverage=showReport(main,result.ledger,row);$('#ledger').innerHTML=ledgerView(source);bindOriginal();invalidate();notice(editorFlow.ocrResult(coverage.items,coverage));
  }catch(e){if(job.valid())throw e;}
  finally{ocrTask.finish(job);if(g===generation&&!ocrTask.busy&&$('#ocr')){$('#ocr').disabled=false;if(!job.signal.aborted)editorFlow.ocrWaiting(false);}}
 });
 const cancelButton=$('#cancel-ocr');if(cancelButton)cancelButton.onclick=()=>{cancelOcr();$('#ocr').disabled=false;notice('已停止本机等待；服务商可能已处理，费用以实际回执为准。不会自动重试或保存。');};
 bindOriginal();$('#save').disabled=true;
}
function bindOriginal(){on('download-original',async()=>{const s=view==='detail'?detail?.source:source;if(s)download(s.blob,s.name);});}
async function showDetail(id,returnState=null){
 unmountHomeResources();const g=++generation;cancelOcr();view='detail';editing=false;
 const d=await store.detail(id);need(d?.event&&d.receipt,'记录不存在');const {event,receipt,source:s}=d;if(g!==generation)return;
 detail={event,source:s};main.innerHTML=detailPage(event,receipt,s);bindOriginal();
 if(returnState?.type==='metric'){const selected=main.querySelectorAll('.report-details > p')[returnState.point.rowIndex];if(selected&&Number.isInteger(returnState.point.rowIndex)){selected.classList.add('metric-source-selected');selected.tabIndex=-1;selected.focus();selected.scrollIntoView({block:'center'});}$('#back-records').textContent='返回指标变化';}else if(returnState)$('#back-records').textContent='返回三卡详情';on('back-records',()=>returnState?.type==='metric'?navigate('metrics',{metricsContext:returnState.context}):returnState?showState(returnState.id,returnState):navigate('records'));
 on('delete-record',async()=>{if(confirm('删除这条记录和原图？删除后无法找回。')){await store.removeEvent(id);consultationFlow.remove(id);await navigate('records');}});
 coordinator.published();
}
async function navigate(next,{resume=null,metricsContext={}}={}){
 if(!await consultationFlow.beforeLeave())return;
 if(editing&&dirty&&editGeneration!==editorBaseline&&!confirm('还有内容没保存，离开会丢失。继续？'))return;
 unmountHomeResources();backupTask.cancel();cancelOcr();generation++;const g=generation;view=next;editing=false;editorFlow=null;
 detail=null;if(next!=='capture'&&next!=='drafts'){source=null;review=null;}
 document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===next));
 if(next==='capture'){
  if(!resume){review=null;source=null;}else{review=resume;source=resume.sourceBinding?await store.get('sources',resume.sourceBinding.id):null;if(resume.sourceBinding)need(source&&source.hash===resume.sourceBinding.hash,'SOURCE_MISSING');}
  if(g!==generation)return;main.innerHTML=editor({zone,payload:review?.payload,source,config});editing=true;dirty=!review;editorBaseline=editGeneration;bindEditor();on('resume-draft',()=>navigate('drafts'));if(review)saveReady();
 }else if(next==='records'){
  if(!await mountRecords({main,store,stateController,statePrefs,zone,filter,cursor,current:()=>g===generation,navigation,on,showDetail,bindStateLinks,setHomeResources:release=>{releaseHomeResources=release;},openPage:async(date,before)=>{filter=date;cursor=before;await navigate('records');}}))return;
 }else if(next==='metrics'){
  await metricsFlow.mount(main,{zone,nature:statePrefs.nature,context:metricsContext,current:()=>g===generation&&view==='metrics',onSource:(id,context,point)=>navigation(()=>showDetail(id,{type:'metric',context,point})),published:()=>coordinator.published(),reload:context=>navigation(()=>navigate('metrics',{metricsContext:context})),add:()=>navigation(()=>navigate('capture'))});
 }else if(next==='drafts'){
  const drafts=(await store.reviews()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));if(g!==generation)return;main.innerHTML='<h1>未完成的录入</h1>'+drafts.map(r=>`<button class="wide draft" data-id="${esc(r.id)}">${esc(r.payload.clinicalDate)} · ${esc(r.payload.note.slice(0,60)||'指标录入')}</button>`).join('')+(!drafts.length?'<p class="muted">没有未完成的录入</p>':'')+button('back-capture','返回录入','wide');main.querySelectorAll('.draft').forEach(el=>el.onclick=()=>navigation(()=>navigate('capture',{resume:drafts.find(r=>r.id===el.dataset.id)})));on('back-capture',()=>navigate('capture'));
 }else if(next==='settings'){
  if(!await mountSettings({main,store,backupTask,on,zone,current:()=>g===generation,setup,afterClear:()=>{consultationFlow.clear();review=null;source=null;zone=null;}}))return;
 }else if(next==='consultation'){
  await consultationFlow.mount(main,()=>g===generation&&view==='consultation',navigation,()=>coordinator.published());
 }
 coordinator.published();
}
async function setup(){
 const settings=await store.get('meta','settings');
 if(settings){zone=timezone(settings.timezone);return navigate('records');}
 const guessed=Intl.DateTimeFormat().resolvedOptions().timeZone||'';
 main.innerHTML=`<h1>开始记录</h1><section class="panel"><p>请确认你所在地区的时区，一般不用改。</p><label class="field">记录使用的时区<input id="timezone" value="${esc(guessed)}" placeholder="例如 Asia/Shanghai"></label><label class="check"><input id="local-consent" type="checkbox">我知道清理网站数据会丢失记录，共用这个浏览器的人也能看到。</label>${button('start','确认并开始','primary wide')}</section>`;
 on('start',async()=>{need($('#local-consent').checked,'请先勾选确认');zone=timezone($('#timezone').value.trim());await store.meta({id:'settings',timezone:zone,schema:'ptds-browser/1'});await navigate('records');});
}
document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>navigation(async()=>{need(zone,'请先完成开始设置');cursor=null;await navigate(el.dataset.nav);}));
try{need(globalThis.isSecureContext&&crypto.subtle,'请使用HTTPS或本机localhost打开');await store.open();try{config=await ocrConfig();}catch{/* Offline/manual remain available. */}await setup();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>notice('离线功能未准备好，请联网再试。'));
}catch(e){main.textContent='暂时打不开本机记录：'+errorMessage(e)+'。已有资料未被删除。';}
