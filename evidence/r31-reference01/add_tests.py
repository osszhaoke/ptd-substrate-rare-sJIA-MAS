from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]/'runtime/r31-reference-candidate01'
p=root/'web/domain/report/reference.js';s=p.read_text();s=s.replace("if(range){","if(range&&range[1].length<=100&&range[2].length<=100){");s=s.replace("= /]+$", "= /]+$") if False else s;s=s.replace('≤≥=/]+$', '≤≥=/至到]+$');p.write_text(s)
p=root/'web/app/report_editor.js';s=p.read_text().replace("delete el.dataset.report;el.querySelectorAll", "delete el.dataset.report;el.querySelector('.reference-status')?.remove();el.querySelectorAll");p.write_text(s)
(root/'tests/report_reference.test.mjs').write_text('''import test from 'node:test';import assert from 'node:assert/strict';
import {readReference,referenceLabel} from '../web/domain/report/reference.js';
import {reportDetails,renderReportRows} from '../web/features/report_rows.js';
import {reportRows} from '../web/domain/report/rows.js';import {cbcLedger} from './fixtures/cbc_report.mjs';
test('reference literals remain unchanged; complete ordered intervals and explicit limits classified without medical judgement',()=>{
 for(const [raw,lower,upper]of [[' 3.80 - 5.10 ','3.80','5.10'],['-5--1','-5','-1'],['−5～−1','-5','-1'],['0至0','0','0'],['1 到 2','1','2'],['+1—+2','+1','+2']]){const r=readReference(raw);assert.equal(r.kind,'range');assert.equal(r.raw,raw);assert.equal(r.lower,lower);assert.equal(r.upper,upper);}
 for(const raw of ['<5','<= 5','≥ -1','>0','≤3.00']){assert.equal(readReference(raw).kind,'limit');assert.equal(readReference(raw).raw,raw);}
});
test('missing, single numeric, reversed and incomplete bounds never become verified intervals or invented values',()=>{
 for(const raw of ['', '  ',null])assert.equal(readReference(raw).kind,'missing');
 for(const raw of ['-5.00','-150','5','+2.00']){assert.equal(readReference(raw).kind,'ambiguous');assert.match(referenceLabel(raw),/待核对/);assert.equal(readReference(raw).lower,undefined);}
 for(const raw of ['5-1','1-','1至','~5','<','1 - 2 - 3','9'.repeat(101)+'-9'])assert.equal(readReference(raw).kind,'incomplete',raw);
 for(const raw of ['阴性','未检出','年龄相关，详见原单','1e3-2e3'])assert.equal(readReference(raw).kind,'text');
});
test('saved checked rows still show absent or ambiguous references; display never mutates stored wire or origin',()=>{
 const rows=reportRows(cbcLedger());for(const [referenceRange,kind]of [['-5.00','ambiguous'],['','missing'],['1-','incomplete'],['阴性','text']]){
  const row={...rows[1],referenceRange,checked:true},payload={reportRows:[row]},before=JSON.stringify(payload),html=reportDetails(payload);
  assert.ok(html.includes('data-reference-quality="'+kind+'"'),'REFERENCE_DETAIL_QUALITY_MISSING');assert.ok(html.includes('待核实的参考信息仍会提示'));
  assert.equal(JSON.stringify(payload),before);assert.ok(renderReportRows([row],()=>{throw Error('unexpected mapped row');}).includes('data-reference-quality="'+kind+'"'));
 }
});
test('quality projection is bounded over maximum report rows and 200-character references',()=>{
 const before=performance.now();for(let repeat=0;repeat<10;repeat++)for(let i=0;i<100;i++){const raw='9'.repeat(150)+'-'+ '1'.repeat(49);assert.equal(raw.length,200);assert.equal(readReference(raw).kind,'incomplete');}
 assert.ok(performance.now()-before<250,'REFERENCE_PROJECTION_10X_SLOW');
});
''')
(root/'tests/browser.report-reference.js').write_text('''(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);},pause=ms=>new Promise(r=>setTimeout(r,ms)),wait=async f=>{for(let i=0;i<700;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 const cfg=window.__PROBE_INPUT__,{RecordStore}=await import('/storage/store.js'),m=await import('/domain/model.js'),backup=await import('/storage/backup.js'),view=await import('/features/report_rows.js');
 const store=new RecordStore();window.confirm=()=>true;
 const assertDetail=d=>{const rows=d.event.payload.reportRows;ok(rows.length===27&&rows[1].referenceRange==='-9.99'&&rows[2].referenceRange==='','REFERENCE_LITERAL_CHANGED');const html=view.reportDetails(d.event.payload);ok(html.includes('data-reference-quality="ambiguous"')&&html.includes('参考范围待核对')&&html.includes('data-reference-quality="missing"')&&html.includes('参考范围未提供'),'REFERENCE_DETAIL_QUALITY_MISSING');};
 if(cfg.mode==='read'){const marker=await store.get('meta','r31-reference'),d=await store.detail(marker.eventId);assertDetail(d);ok(m.canonical(d.event)===marker.event&&m.canonical(d.receipt)===marker.receipt&&(await store.reviews()).length===0,'REFERENCE_NEW_PID_CHANGED');store.close();window.webkit.messageHandlers.result.postMessage({ok:true,eventId:marker.eventId,newProcessRead:true,referenceHintsPersist:true});return;}
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));$('[data-nav="capture"]').click();await wait(()=>$('#ocr'));
 const canvas=document.createElement('canvas');canvas.width=1300;canvas.height=550;canvas.getContext('2d').fillRect(0,0,1300,550);const file=new File([await new Promise(r=>canvas.toBlob(r,'image/png'))],'fictional-reference.png',{type:'image/png'});
 Object.defineProperty($('#image'),'files',{value:[file],configurable:true});$('#image').dispatchEvent(new Event('change'));await wait(()=>$('#source-name').textContent===file.name);$('#trial-token').value=cfg.token;$('#upload-consent').checked=true;$('#ocr').click();await wait(()=>document.querySelectorAll('[data-report]').length===27&&!$('#ocr').disabled);
 const elements=[...document.querySelectorAll('[data-report]')],rbc=elements[1],input=rbc.querySelector('.report-reference'),status=()=>rbc.querySelector('.reference-status');
 ok(elements.every(el=>el.querySelector('.reference-status')),'REFERENCE_EDITOR_HINT_MISSING');
 ok(status().dataset.referenceQuality==='range','REFERENCE_COMPLETE_NOT_SHOWN');
 for(const [value,kind]of [['-9.99','ambiguous'],['','missing'],['1-','incomplete'],['1-9','range'],['<9','limit'],['阴性','text'],['-9.99','ambiguous']]){
  const box=rbc.querySelector('.report-checked');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
  ok(!box.checked,'REFERENCE_EDIT_REUSES_CHECK');ok(status().dataset.referenceQuality===kind,'REFERENCE_EDIT_HINT_STALE');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));ok(status().dataset.referenceQuality===kind,'REFERENCE_CHECK_PROMOTES_QUALITY');
 }
 const missing=elements[2].querySelector('.report-reference');missing.value='';missing.dispatchEvent(new Event('input',{bubbles:true}));
 $('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));
 $('#prepare-review').click();await wait(()=>$('#notice').textContent.includes('逐项对照报告'));ok((await store.reviews()).length===0&&(await store.page()).items.length===0,'REFERENCE_UNCHECKED_STAGED');
 for(const box of document.querySelectorAll('.report-checked')){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}
 $('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);ok($('#review-summary').textContent.includes('参考范围待核对')&&$('#review-summary').textContent.includes('参考范围未提供'),'REFERENCE_SUMMARY_QUALITY_MISSING');ok(!$('#confirmed').checked&&$('#save').disabled&&(await store.page()).items.length===0,'REFERENCE_AUTO_SAVE');
 $('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
 const page=await store.page(),d=await store.detail(page.items[0].id);assertDetail(d);ok(page.items.length===1&&$('#main').textContent.includes('参考范围待核对')&&$('#main').textContent.includes('参考范围未提供'),'REFERENCE_SAVED_HINT_HIDDEN');
 ok(await m.hash(await d.source.blob.arrayBuffer())===await m.hash(await file.arrayBuffer())&&d.event.payload.reportRows[1].origin.referenceRange==='3.8-5.1','REFERENCE_ORIGIN_CHANGED');
 const target=new RecordStore('r31-restore-'+crypto.randomUUID()),encrypted=await backup.exportBackup(store,'fictional-r31-password');await backup.restoreBackup(target,await backup.inspectBackup(encrypted,'fictional-r31-password',target));const restored=await target.detail(d.event.id);assertDetail(restored);ok(m.canonical(restored.event)===m.canonical(d.event)&&m.canonical(restored.receipt)===m.canonical(d.receipt),'REFERENCE_BACKUP_CHANGED');
 // Leaving report mode must remove the owned hints as well as the report controls.
 const sandbox=document.createElement('div');sandbox.innerHTML=view.renderReportRows([d.event.payload.reportRows[2]],()=>'<div class="metric-row"></div>');(await import('/app/report_editor.js')).detachReportRows(sandbox);ok(!sandbox.querySelector('.reference-status'),'REFERENCE_DETACH_HINT_LEAK');
 await store.meta({id:'r31-reference',eventId:d.event.id,event:m.canonical(d.event),receipt:m.canonical(d.receipt)});target.close();store.close();window.webkit.messageHandlers.result.postMessage({ok:true,eventId:d.event.id,syntheticExplicitSave:true,referenceEditRevokesCheck:true,referenceHintsPersist:true,encryptedRoundTrip:true,noInventedBounds:true});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
''')
(root/'tests/test_report_reference_runner.py').write_text('''"""Mandatory R31 fictional reference quality behavior, no real provider."""
import argparse,base64,hashlib,io,json,shutil,subprocess,threading,uuid
from pathlib import Path
from unittest.mock import patch
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def verify(out):
 out.mkdir(parents=True,exist_ok=False)
 ledger=json.loads(subprocess.run(['node','--input-type=module','-e',"import {cbcLedger} from './tests/fixtures/cbc_report.mjs';console.log(JSON.stringify(cbcLedger()));"],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
 token='fictional-reference-token-00000000000';env=json.loads((ROOT/'deploy/PUBLIC_CONFIG.example.json').read_text());env['PTDS_PUBLIC_ORIGIN']='https://fictional.invalid'
 config=Configuration(env,{'tencentSecretId':'FICTIONAL_ID','tencentSecretKey':'FICTIONAL_KEY','trialToken':token})
 response={'Response':{'RequestId':'fictional-reference','TextDetections':[{'DetectedText':l['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in l['coordinates']]}for l in ledger['lines']]}};calls=[]
 class Opener:
  def open(self,request,timeout):
   assert request.full_url=='https://ocr.tencentcloudapi.com/' and timeout==25;assert base64.b64decode(json.loads(request.data)['ImageBase64'])[:8]==b'\\x89PNG\\r\\n\\x1a\\n';calls.append(1);return io.BytesIO(json.dumps(response).encode())
 server=Server(('127.0.0.1',0),ROOT/'web',out/'fictional-budget.json',config);config.origin=f'http://127.0.0.1:{server.server_port}';threading.Thread(target=server.serve_forever,daemon=True).start();profile=str(uuid.uuid4())
 try:
  with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
   write=run('report-reference',out/'write',{'profile':profile,'mode':'write','token':token},config.origin+'/')
   read=run('report-reference',out/'read',{'profile':profile,'mode':'read'},config.origin+'/')
  pids=[json.loads((out/(m+'.binding.json')).read_text())['pid']for m in ['write','read']];assert pids[0]!=pids[1]and write['eventId']==read['eventId'];assert len(calls)==1;killed={}
  for name,relative,old,new,error in [
   ('hide-hint','web/features/report_rows.js','${referenceHint(r.referenceRange)}<label','<label','REFERENCE_EDITOR_HINT_MISSING'),
   ('scalar-as-range','web/domain/report/reference.js',"state('ambiguous'","state('range'",'REFERENCE_EDIT_HINT_STALE'),
   ('no-refresh','web/app/report_editor.js','refreshReferenceStatus(el);','/* mutation: removed refresh */','REFERENCE_EDIT_HINT_STALE')]:
   tree=ROOT/'runtime'/('reference-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');path=tree/relative;source=path.read_text();assert source.count(old)==1;path.write_text(source.replace(old,new));(out/(name+'-served.json')).write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
   mutated=Server(('127.0.0.1',0),tree/'web',out/(name+'-fictional-budget.json'),config);config.origin=f'http://127.0.0.1:{mutated.server_port}';threading.Thread(target=mutated.serve_forever,daemon=True).start()
   try:
    with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
     try:run('report-reference',out/name,{'profile':str(uuid.uuid4()),'mode':'write','token':token},config.origin+'/')
     except SystemExit:pass
    result=json.loads((out/(name+'.json')).read_text());assert result.get('ok')is False and result.get('error')==error,result;killed[name]=error
   finally:mutated.shutdown();mutated.server_close();shutil.rmtree(tree)
  result={'ok':True,'identity':'author fictional automated; not independent/human/clinical','write':write,'read':read,'pids':pids,'paidProviderCalls':0,'fakeProviderCalls':len(calls),'mutations':killed,'positiveControl':'write; identical unmutated case for every mutation'};(out/'result.json').write_text(json.dumps(result,indent=2)+'\\n');return result
 finally:server.shutdown();server.server_close()
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();verify(ROOT/a.output)
if __name__=='__main__':main()
''')
p=root/'tests/test_report_rows_runner.py';s=p.read_text().replace("  (out/'result.json').write_text", "  from tests.test_report_reference_runner import verify as verify_reference\n  reference=verify_reference(out/'reference-quality')\n  (out/'result.json').write_text");s=s.replace("'layouts':layouts}","'layouts':layouts,'referenceQuality':reference}");p.write_text(s)
p=root/'package.json';data=json.loads(p.read_text());data['scripts']['test']+=' tests/report_reference.test.mjs';p.write_text(json.dumps(data,indent=2)+'\n')
p=root/'tools/test_plan.json';data=json.loads(p.read_text());data['commands'][0]+=' tests/report_reference.test.mjs';data['browserWhitelist'].append('browser.report-reference.js');data['r31ReferenceQuality']={'unitEntry':'tests/report_reference.test.mjs','mandatoryBrowserEntry':'report-rows-wire -> tests.test_report_reference_runner','controls':['same UI review/stage/explicit synthetic confirmation/save','unknown reference remains visibly unknown after row check','encrypted backup and different PID same library','original reference literal/source retained','detach removes owned hint'],'mutations':['hide-hint','scalar-as-range','no-refresh'],'noRealProvider':True,'wireAndMedicalRulesUnchanged':True};p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
