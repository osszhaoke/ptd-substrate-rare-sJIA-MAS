import {RecordStore} from '/storage/store.js';
import {RecordService} from '/domain/service.js';
import {digest, reviewContent, hash} from '/domain/model.js';
import {exportBackup, inspectBackup, restoreBackup} from '/storage/backup.js';

const KEY = 'ptds-phone-r07-owned-run';
const PREFIX = 'ptds-phone-r07-';
const $ = selector => document.querySelector(selector);
const assert = (value, message) => { if (!value) throw Error(message); };
const p95 = values => [...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*.95)-1)] || 0;
const newDocument = crypto.randomUUID();
let controller = null;
let report = null;
let binding = null;
let activeAction = false;
let lastProgressAt = 0;

function ownedNames(value) {
  assert(value && /^[a-f0-9-]{36}$/.test(value.runId), '测试记录损坏，未操作资料库');
  return ['source','restore'].map(suffix => PREFIX + value.runId + '-' + suffix);
}
function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const value = JSON.parse(raw);
  ownedNames(value);
  return value;
}
function show() {
  $('#result').textContent = report ? JSON.stringify(report,null,2) : '';
}
function persist() {
  // This journal contains test metadata only; it never stores or replays confirmation requests.
  try { localStorage.setItem(KEY,JSON.stringify(report)); }
  catch (error) {
    report.journalPersistence='FAILED';
    report.journalErrorName=error.name;
    if(report.status==='PASS_THIS_RUN')report.status='INCOMPLETE_RESULT_JOURNAL';
    show();
    progress('测试结果暂存失败，请先下载本页结果；重新打开可能丢失。',true);
    return false;
  }
  show();
  return true;
}
function checkpoint() { controller.signal.throwIfAborted(); }
function progress(phase, force = false) {
  const now = performance.now();
  if (!force && now-lastProgressAt < 50) return;
  lastProgressAt = now;
  $('#progress').textContent = phase;
}
function busy(value) {
  for (const id of ['records1000','records10000','originals','quota','reopen','cleanup']) $('#'+id).disabled = value;
  $('#cancel').disabled = !value;
}
async function deleteOwned(value) {
  for (const name of ownedNames(value)) await new Promise((resolve,reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('请先关闭其他验收页面，再删除测试资料'));
  });
}
function requireConsent() {
  assert(isSecureContext && crypto.subtle, '请通过 HTTPS 或电脑 localhost 使用');
  assert($('#consent').checked && $('#device').value.trim(), '请填写机型并勾选确认');
  assert(!controller, '已有测试正在运行');
  assert(binding, '工具版本还未读取完成');
}
async function count(store) {
  return store.tx(['events'],'readonly',api => {
    api.store('events').count().onsuccess = event => api.result(event.target.result);
  });
}
async function identity(store) {
  // Verification happens outside the measured backup window.
  const data = await store.snapshot();
  for (const event of data.events) assert(await digest(reviewContent(event)) === event.digest, '保存内容摘要不符');
  for (const source of data.sources) assert(await hash(await source.blob.arrayBuffer()) === source.hash, '原图摘要不符');
  return digest({events:data.events.sort((a,b)=>a.id.localeCompare(b.id)),receipts:data.receipts.sort((a,b)=>a.id.localeCompare(b.id)),sources:data.sources.map(({blob,...value})=>value).sort((a,b)=>a.id.localeCompare(b.id))});
}
function payload(index) {
  const metric = (code,valueLiteral,unit) => ({code,displayName:code,valueLiteral,unit,context:'LAB',comparator:null,sourceLineIds:[]});
  return {
    formatVersion:2, clinicalDate:'2020-01-01', instanceTimezone:'Asia/Shanghai',
    observedAt:new Date(Date.UTC(2020,0,1,0,0,Math.floor(index/2))).toISOString(),
    documentKind:'manual', nature:'SYNTHETIC', sourceKind:'MANUAL', trustTier:'USER_REVIEWED', note:'虚构手机验收 '+index,
    observations:[metric('ferritin','1000','ng/mL'),metric('plt','100','10^9/L'),metric('fib','6','g/L'),metric('ldh','500','U/L'),metric('ast','80','U/L'),metric('tg','3.0','mmol/L'),metric('hb','89','g/L'),metric('anc','0.9','10^9/L'),metric('scd25','2400','U/mL')],
    clinicalFlags:{FEVER:true,SJIA_KNOWN_OR_SUSPECTED:true,LAB_NOT_OTHERWISE_EXPLAINED:true,SPLENOMEGALY:false,HEMOPHAGOCYTOSIS:false,NK_LOW:false,CNS_INVOLVEMENT:false,HEMORRHAGE:false,ARTHRITIS:false}
  };
}
async function save(service,value,source) {
  checkpoint();
  let review = await service.stage(value,source);
  checkpoint();
  // Explicitly accepted fictional fixture only. Never applied to a real instance.
  review = await service.confirm(review,true);
  checkpoint();
  await service.save(review);
}
async function quotaRollback(store, inspection) {
  const writes = inspection.data.events.length + inspection.data.sources.length + inspection.data.receipts.length + 1;
  const locations = [...new Set([1, Math.ceil(writes/2), writes])];
  const results = [];
  for (const location of locations) {
    checkpoint();
    let seen = 0, injected = false, failure = null;
    const original = IDBObjectStore.prototype.put;
    try {
      IDBObjectStore.prototype.put = function(value) {
        if (this.transaction.db.name === store.name && ++seen === location) {
          injected = true;
          throw new DOMException('fictional quota injection', 'QuotaExceededError');
        }
        return original.call(this,value);
      };
      try { await restoreBackup(store, inspection); }
      catch (error) { failure = {name:error.name,message:error.message}; }
    } finally { IDBObjectStore.prototype.put = original; }
    assert(injected && failure && ['AbortError','QuotaExceededError'].includes(failure.name), '空间不足模拟未触发事务回滚');
    const after = await store.backupSnapshot();
    assert(after.events.length === 0 && after.sources.length === 0 && after.receipts.length === 0 &&
           !(await store.get('meta','data-revision')), '空间不足后留下了部分恢复内容');
    results.push({location,queuedWritesBeforeFailure:seen-1,error:failure,allStoresRolledBack:true});
  }
  return {identity:'synthetic fault injection in isolated owned database; not actual quota exhaustion',results};
}
async function begin(mode,target) {
  requireConsent();
  const previous = report || load();
  if (previous) {
    assert(confirm('将删除上一轮虚构测试库；请先下载旧结果。继续？'), '已取消');
    await deleteOwned(previous);
  }
  report = {
    runId:crypto.randomUUID(), documentId:newDocument, sourceBinding:binding,
    deviceReported:$('#device').value.trim(), userAgent:navigator.userAgent,
    identity:'device-run fictional test; not independent acceptance', mode, target,
    startedAt:new Date().toISOString(), status:'INCOMPLETE',
    totalBrowserMemoryPeak:'UNMEASURED', actualQuotaExhaustion:'NOT_TESTED',
    processReopen:'NOT_TESTED', externalRequests:'static files only; no OCR/AI'
  };
  controller = new AbortController();
  busy(true);
  let source, restore, timer;
  try {
    assert(persist(),'无法保存测试结果，未开始写入测试资料。请释放空间后再试。');
    [source,restore] = ownedNames(report).map(name=>new RecordStore(name));
    await source.open(); await restore.open();
    const service = new RecordService(source);
    report.storageBefore = await navigator.storage?.estimate?.() ?? null;
    if (mode === 'originals') {
      const image = await (await fetch('/fixture.png')).blob();
      for (let i=0;i<8;i++) {
        progress('准备虚构图片 '+(i+1)+'/8'); checkpoint();
        const file = new File([image,new Uint8Array(8*1048576-image.size)],'fictional-'+i+'.png',{type:'image/png'});
        const original = await service.source(file);
        await save(service,{...payload(i),documentKind:'lab',observations:[]},original);
      }
    } else {
      for (let at=0;at<target;at+=10) {
        progress('准备虚构记录 '+at+'/'+target); checkpoint();
        // Await every concurrent fixture before cleanup; never leave writes running after an error.
        const results = await Promise.allSettled(Array.from({length:Math.min(10,target-at)},(_,i)=>save(service,payload(at+i))));
        const failed = results.find(result=>result.status==='rejected');
        if (failed) throw failed.reason;
      }
    }
    assert(await count(source) === (mode==='originals'?8:target), '准备条数不符');
    progress('导出、核对并恢复');
    const beats = []; let last=performance.now(), frames=0, maxCryptoBytes=0;
    timer=setInterval(()=>{const now=performance.now();if(beats.length<20000)beats.push(now-last);last=now;},15);
    const options={signal:controller.signal,observe:value=>{frames++;maxCryptoBytes=Math.max(maxCryptoBytes,value.cryptoBytes);},onProgress:value=>progress(value.phase+' '+value.done+(value.total?'/'+value.total:''))};
    let started=performance.now();
    const backup=await exportBackup(source,'fictional-phone-password-123',options);
    report.exportMs=performance.now()-started; started=performance.now();
    const inspection=await inspectBackup(backup,'fictional-phone-password-123',restore,options);
    report.inspectMs=performance.now()-started; checkpoint();
    if (mode === 'quota-simulation') report.simulatedQuotaRollback = await quotaRollback(restore, inspection);
    progress('正式保存测试结果，完成前不能取消'); $('#cancel').disabled=true;
    started=performance.now(); await restoreBackup(restore,inspection);
    report.commitMs=performance.now()-started;
    clearInterval(timer);timer=null;
    assert(await count(restore) === (mode==='originals'?8:target), '恢复条数不符');
    report.sourceIdentity=await identity(source);
    assert(await identity(restore) === report.sourceIdentity,'恢复内容与原件不符');
    Object.assign(report,{backupBytes:backup.size,originalBytes:inspection.summary.bytes,frames,maxCryptoBytes,heartbeatP95Ms:p95(beats),heartbeatMaxMs:Math.max(0,...beats),heartbeatSamples:beats.length,storageAfter:await navigator.storage?.estimate?.()??null});
    assert(maxCryptoBytes<=262145 && report.heartbeatP95Ms<=250,'手机处理指标未达目标');
    if(mode==='originals')assert(inspection.summary.bytes===67108864,'原件边界不符');
    report.status='PASS_THIS_RUN'; progress('本轮通过，请下载结果；仍需真正退出后读回',true);
  } catch(error) {
    report.status=error.name==='AbortError'?'CANCELLED_INCOMPLETE':'FAILED';
    report.error={name:error.name,message:error.message};progress('未通过或未完成：'+error.message,true);
  } finally {
    if(timer)clearInterval(timer);
    source?.close();restore?.close();controller=null;busy(false);persist();
  }
}
async function reopen() {
  requireConsent(); report=load();
  assert(report?.status==='PASS_THIS_RUN','没有已完成的测试可读回');
  assert(report.sourceBinding?.treeSha256===binding.treeSha256,'验收代码版本已变，请保留旧结果并重新测试');
  assert(report.documentId!==newDocument,'请重新打开本页后再读回');
  busy(true);let stores=[];
  try {
    stores=ownedNames(report).map(name=>new RecordStore(name));
    for(const store of stores)assert(await identity(store)===report.sourceIdentity,'重开后内容不符');
    report.reloadedReadback='PASS';
    report.processReopen=$('#process-closed').checked?'USER_REPORTED_PROCESS_EXIT_AND_READBACK':'NOT_CONFIRMED';
    report.readbackDocumentId=newDocument;progress('重新加载后读回一致；进程退出按本人勾选单列',true);persist();
  } finally {for(const store of stores)store.close();busy(false);}
}
function handle(fn) {
  return async()=>{
    if(activeAction)return;
    activeAction=true;
    try {await fn();} catch(error) {progress(error.message);}
    finally {activeAction=false;}
  };
}
$('#records1000').onclick=handle(()=>begin('records',1000));
$('#records10000').onclick=handle(()=>begin('records',10000));
$('#originals').onclick=handle(()=>begin('originals',8));
$('#quota').onclick=handle(()=>begin('quota-simulation',12));
$('#cancel').onclick=()=>controller?.abort();
$('#reopen').onclick=handle(reopen);
$('#download').onclick=handle(()=>{
  const value=report||load();assert(value,'还没有测试结果');
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='PTDS-phone-'+value.runId+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('#cleanup').onclick=handle(async()=>{
  assert(!controller,'请先停止当前测试');
  const value=report||load();assert(value,'没有本工具的测试库');
  if(!confirm('只删除本工具生成的虚构测试库。结果请先下载。继续？'))return;
  await deleteOwned(value);localStorage.removeItem(KEY);report=null;show();progress('虚构测试库已删除',true);
});
try {
  for(const button of document.querySelectorAll('button'))button.disabled=true;
  binding=await (await fetch('/PHONE_MANIFEST.json',{cache:'no-store'})).json();
  report=load();show();busy(false);$('#download').disabled=false;
} catch(error) {
  progress('工具或旧测试记录无法读取：'+error.message);
  for(const button of document.querySelectorAll('button'))button.disabled=true;
}
