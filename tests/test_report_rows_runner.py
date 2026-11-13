"""Explicit fictional 27-row HTTP/UI/save/reopen/backup contract; zero real OCR."""
import argparse,base64,hashlib,io,json,shutil,subprocess,threading,uuid
from pathlib import Path
from unittest.mock import patch
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def fixture():
 p=subprocess.run(['node','--input-type=module','-e',"import {cbcLedger} from './tests/fixtures/cbc_report.mjs';console.log(JSON.stringify(cbcLedger()));"],cwd=ROOT,check=True,capture_output=True,text=True)
 return json.loads(p.stdout)
def edge_cases(out,config,response,opener):
 from gateway.tencent import map_tencent
 controls={};results=[]
 for label in ['footer-left-short','footer-right-short','footer-legacy','unit-legacy','unit-generic','unit-flat','unit-cells','unit-inline']:
  factory="bilingualFooterLedger()" if label=='footer-legacy'else"asymmetricFooterLedger({mirror:"+str(label=='footer-right-short').lower()+"})" if label.startswith('footer-')else"incompleteUnitLedger('"+label.removeprefix('unit-')+"')"
  script="import {asymmetricFooterLedger,incompleteUnitLedger,bilingualFooterLedger} from './tests/fixtures/report_layouts.mjs';import {reportRows} from './web/domain/report/rows.js';const ledger="+factory+";console.log(JSON.stringify({ledger,rows:reportRows(ledger)}));"
  data=json.loads(subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,check=True,capture_output=True,text=True).stdout);ledger=data['ledger'];rows=data['rows']
  expected=27 if label=='footer-legacy'else 5 if label.startswith('footer-')else 27 if label=='unit-legacy'else 6 if label=='unit-generic'else 1
  corrections=[]
  if label.startswith('unit-'):
   for i,row in enumerate(rows):
    if row['unit'].endswith('/') or not row['valueLiteral']:corrections.append({'index':i,'unit':'unknownUnit','valueLiteral':row['valueLiteral']or'7.25'})
  detections=[]
  for l in ledger['lines']:
   d={'DetectedText':l['text'],'Confidence':99}
   if l['coordinates']is not None:d['Polygon']=[{'X':p['x'],'Y':p['y']}for p in l['coordinates']]
   detections.append(d)
  response.clear();response.update({'Response':{'RequestId':'fictional-'+label,'Angle':0,'TextDetections':detections}})
  ecfg={'layout':'yes','ledger':json.dumps(map_tencent(response,config.region)),'rows':str(expected),'pending':str(sum(not r['valueLiteral']for r in rows)),'token':config.token,'profile':str(uuid.uuid4()),'corrections':json.dumps(corrections)}
  if label.startswith('unit-')and label!='unit-generic':ecfg['unitReview']='1'
  controls[label]=(json.loads(json.dumps(response)),dict(ecfg))
  server=Server(('127.0.0.1',0),ROOT/'web',out/(label+'-fictional-budget.json'),config);config.origin=f'http://127.0.0.1:{server.server_port}';threading.Thread(target=server.serve_forever,daemon=True).start()
  try:
   with patch('gateway.tencent.urllib.request.build_opener',return_value=opener()):
    write=run('report-rows',out/(label+'-write'),dict(ecfg,mode='write'),config.origin+'/')
    read=run('report-rows',out/(label+'-read'),dict(ecfg,mode='read'),config.origin+'/')
   pids=[json.loads((out/(label+'-'+m+'.binding.json')).read_text())['pid']for m in ['write','read']];assert pids[0]!=pids[1]and write['eventId']==read['eventId'];results.append({'variant':label,'write':write,'read':read,'pids':pids})
  finally:server.shutdown();server.server_close()
 return controls,results

def historical_cases(out,server,config):
 base={'historical':'yes','backupBase64':base64.b64encode((ROOT/'tests/fixtures/r27-footer-backup.ptds').read_bytes()).decode(),'profile':str(uuid.uuid4())}
 url=f'http://127.0.0.1:{server.server_port}/'
 write=run('report-rows',out/'history-write',dict(base,mode='history-write'),url)
 read=run('report-rows',out/'history-read',{'historical':'yes','mode':'history-read','profile':base['profile']},url)
 pids=[json.loads((out/('history-'+m+'.binding.json')).read_text())['pid']for m in ['write','read']];assert pids[0]!=pids[1]and write['eventId']==read['eventId']
 negative=run('report-rows',out/'history-negative',dict(base,mode='history-negative',profile=str(uuid.uuid4())),url)
 tree=ROOT/'runtime'/('history-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');path=tree/'web/domain/report/restore_binding.js';text=path.read_text();old="if(error.message!=='REPORT_ORIGIN_MISMATCH')throw error;";assert text.count(old)==1;path.write_text(text.replace(old,'throw error;'))
 (out/'history-mutation-served.json').write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
 mutation=Server(('127.0.0.1',0),tree/'web',out/'history-mutation-unused-budget.json',config);threading.Thread(target=mutation.serve_forever,daemon=True).start()
 try:
  try:run('report-rows',out/'history-no-compat',dict(base,mode='history-write',profile=str(uuid.uuid4())),f'http://127.0.0.1:{mutation.server_port}/')
  except SystemExit:pass
  result=json.loads((out/'history-no-compat.json').read_text());assert result.get('ok')is False and result.get('error')=='HISTORICAL_BACKUP_REJECTED REPORT_ORIGIN_MISMATCH',result
 finally:mutation.shutdown();mutation.server_close();shutil.rmtree(tree)
 return {'write':write,'read':read,'pids':pids,'negative':negative,'compatRemovalKilled':result['error'],'sameUnmutatedPositiveControl':'history-write'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();out=ROOT/a.output;out.mkdir(parents=True,exist_ok=False)
 ledger=fixture();token='fictional-report-rows-token-00000000000'
 env=json.loads((ROOT/'deploy/PUBLIC_CONFIG.example.json').read_text());env['PTDS_PUBLIC_ORIGIN']='https://fictional.invalid'
 config=Configuration(env,{'tencentSecretId':'FICTIONAL_ID','tencentSecretKey':'FICTIONAL_KEY','trialToken':token})
 response={'Response':{'RequestId':'fictional-cbc-27','TextDetections':[{'DetectedText':l['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in l['coordinates']]}for l in ledger['lines']]}}
 calls=[]
 class Opener:
  def open(self,request,timeout):
   assert request.full_url=='https://ocr.tencentcloudapi.com/' and timeout==25
   assert base64.b64decode(json.loads(request.data)['ImageBase64'])[:8]==b'\x89PNG\r\n\x1a\n'
   calls.append(1);return io.BytesIO(json.dumps(response).encode())
 server=Server(('127.0.0.1',0),ROOT/'web',out/'fictional-budget.json',config);config.origin=f'http://127.0.0.1:{server.server_port}'
 threading.Thread(target=server.serve_forever,daemon=True).start();common={'token':token,'ledger':json.dumps(ledger)};profile=str(uuid.uuid4())
 try:
  with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
   write=run('report-rows',out/'write',dict(common,profile=profile,mode='write'),config.origin+'/')
   read=run('report-rows',out/'read',dict(common,profile=profile,mode='read'),config.origin+'/')
  wb=json.loads((out/'write.binding.json').read_text());rb=json.loads((out/'read.binding.json').read_text());assert wb['pid']!=rb['pid'] and write['eventId']==read['eventId'];assert len(calls)==1
  pending=json.loads(json.dumps(ledger));name=next(l for l in pending['lines']if l['text']=='平均红细胞血红蛋白浓度');index=pending['lines'].index(name);result=pending['lines'][index+1];name['text']+='333'
  for point in name['coordinates']:
   if point['x']==320:point['x']=400
  pending['lines']=[l for l in pending['lines']if l is not result]
  for i,l in enumerate(pending['lines']):l['order']=i
  pending['rawText']='\n'.join(l['text']for l in pending['lines']);original_detections=response['Response']['TextDetections']
  response['Response']['TextDetections']=[{'DetectedText':l['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in l['coordinates']]}for l in pending['lines']]
  with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
   run('report-rows',out/'pending',dict(common,profile=str(uuid.uuid4()),mode='write',ledger=json.dumps(pending),pendingRows='1'),config.origin+'/')
  response['Response']['TextDetections']=original_detections
  layouts=[];layout_control=None
  from gateway.tencent import map_tencent
  for angle in [90,180,270]:
   generated=json.loads(subprocess.run(['node','--input-type=module','-e',f"import {{layoutLedger}} from './tests/fixtures/report_layouts.mjs';console.log(JSON.stringify(layoutLedger({{angle:{angle},swapped:{str(angle==180).lower()},pending:{str(angle==270).lower()},joined:{str(angle==90).lower()},slope:.025}})));"],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
   response['Response']['Angle']=angle
   response['Response']['TextDetections']=[{'DetectedText':l['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in l['coordinates']]}for l in generated['lines']]
   normalized=map_tencent(response,config.region);layoutcfg={'layout':'yes','ledger':json.dumps(normalized),'rows':'6','pending':'2'if angle==270 else'0','token':token,'profile':str(uuid.uuid4())}
   if angle==90:layout_control=(json.loads(json.dumps(response)),dict(layoutcfg))
   with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
    lw=run('report-rows',out/('layout-'+str(angle)+'-write'),dict(layoutcfg,mode='write'),config.origin+'/')
    lr=run('report-rows',out/('layout-'+str(angle)+'-read'),dict(layoutcfg,mode='read'),config.origin+'/')
   pids=[json.loads((out/('layout-'+str(angle)+'-'+mode+'.binding.json')).read_text())['pid']for mode in ['write','read']]
   assert pids[0]!=pids[1] and lw['eventId']==lr['eventId'];layouts.append({'angle':angle,'write':lw,'read':lr,'pids':pids})
  extra_controls={}
  for variant in ['qualitative','stacked','raw-only']:
   factory="neutralFlagLedger()"if variant=='qualitative'else"thirdBatchLedger({stacked:true,headerMetadata:true})"
   generated=json.loads(subprocess.run(['node','--input-type=module','-e',f"import {{neutralFlagLedger,thirdBatchLedger}} from './tests/fixtures/report_layouts.mjs';console.log(JSON.stringify({factory}));"],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
   if variant=='raw-only':
    generated={'lines':[{'text':'虚构影像描述：仅供文字保留测试，无检验表格。','coordinates':[{'x':10,'y':10},{'x':800,'y':10},{'x':800,'y':35},{'x':10,'y':35}]}]}
   extra_response={'Response':{'RequestId':'fictional-'+variant,'Angle':0,'TextDetections':[{'DetectedText':l['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in l['coordinates']]}for l in generated['lines']]}}
   response.clear();response.update(extra_response)
   extra_server=Server(('127.0.0.1',0),ROOT/'web',out/(variant+'-fictional-budget.json'),config);config.origin=f'http://127.0.0.1:{extra_server.server_port}';threading.Thread(target=extra_server.serve_forever,daemon=True).start()
   ecfg={'layout':'yes','ledger':json.dumps(map_tencent(response,config.region)),'rows':'0'if variant=='raw-only'else'6'if variant=='qualitative'else'12','pending':'0','token':token,'profile':str(uuid.uuid4())};extra_controls[variant]=(json.loads(json.dumps(response)),dict(ecfg))
   try:
    with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
     ew=run('report-rows',out/(variant+'-write'),dict(ecfg,mode='write'),config.origin+'/')
     er=run('report-rows',out/(variant+'-read'),dict(ecfg,mode='read'),config.origin+'/')
    epids=[json.loads((out/(variant+'-'+mode+'.binding.json')).read_text())['pid']for mode in ['write','read']];assert epids[0]!=epids[1] and ew['eventId']==er['eventId'];layouts.append({'variant':variant,'write':ew,'read':er,'pids':epids})
   finally:extra_server.shutdown();extra_server.server_close()
  edge_controls,edge_results=edge_cases(out,config,response,Opener);layouts.extend(edge_results)
  config.origin=f'http://127.0.0.1:{server.server_port}';response.clear();response.update({'Response':{'RequestId':'fictional-cbc-27','TextDetections':original_detections}})
  historical=historical_cases(out,server,config)
  from tests.report_upgrade import run_upgrade
  upgrade=run_upgrade(out/'upgrade',config,response,Opener)
  config.origin=f'http://127.0.0.1:{server.server_port}'
  killed={}  
  # The same complete unmodified UI above is the positive control for each behavioral mutation.
  for name,relative,old,new,error in [
   ('empty-name-fallback','web/features/report_rows.js','name:nameInput?nameInput.value.trim():','name:nameInput?.value.trim()||','REPORT_EMPTY_NAME_STAGED'),
   ('hide-unknown','web/features/report_rows.js','return `<div class="report-row"','return `<!-- hidden -->`;return `<div class="report-row"','REPORT_UNMAPPED_HIDDEN'),
   ('reuse-row-check','web/app/report_editor.js',"if(el&&!event.target.matches('.report-checked'))",'if(false)','REPORT_EDIT_REUSES_CHECK'),
   ('layout-no-angle','web/domain/report/layout.js','const radians = angle * Math.PI / 180','const radians = 0 * Math.PI / 180','LAYOUT_CANDIDATE_ROWS_LOST'),
   ('layout-no-tables','web/domain/report/rows.js','for(const r of generalTableRows(boxes,new Set(out.flatMap(r=>r.sourceLineIds))))add(r);','for(const r of [])add(r);','LAYOUT_CANDIDATE_ROWS_LOST'),
   ('qualitative-dropped','web/domain/report/table_fields.js','QUALITATIVE.test(value.trim())','false','LAYOUT_PENDING_CHANGED'),
   ('stacked-footer-global','web/domain/report/tables.js','windows.some(w=>cx(b)>w.left&&cx(b)<w.right&&b.cy-w.slope*cx(b)>=w.top&&b.cy-w.slope*cx(b)<w.bottom)','b.cy>=Math.min(...windows.map(w=>w.top))&&b.cy<Math.min(...windows.map(w=>w.bottom))','LAYOUT_CANDIDATE_ROWS_LOST'),
   ('footer-cross-panel','web/domain/report/tables.js','samePanel(b,h)&&b.top-h.slope*cx(b)>h.top','b.top-h.slope*cx(b)>h.top','LAYOUT_CANDIDATE_ROWS_LOST'),
   ('incomplete-unit-bypass','web/domain/report/table_fields.js','export const reportUnitNeedsReview=row=>','export const reportUnitNeedsReview=row=>false; //','REPORT_INCOMPLETE_UNIT_STAGED')]:
   cfg=common
   if name.startswith('layout-'):
    response.clear();response.update(json.loads(json.dumps(layout_control[0])));cfg=layout_control[1]
   if name in ['qualitative-dropped','stacked-footer-global']:
    control=extra_controls['qualitative'if name=='qualitative-dropped'else'stacked'];response.clear();response.update(json.loads(json.dumps(control[0])));cfg=control[1]
   if name in ['footer-cross-panel','incomplete-unit-bypass']:
    control=edge_controls['footer-left-short'if name=='footer-cross-panel'else'unit-legacy'];response.clear();response.update(json.loads(json.dumps(control[0])));cfg=control[1]
   tree=ROOT/'runtime'/('report-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');path=tree/relative;text=path.read_text();assert text.count(old)==1;path.write_text(text.replace(old,new))
   (out/(name+'-served.json')).write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
   mutation=Server(('127.0.0.1',0),tree/'web',out/(name+'-fictional-budget.json'),config);config.origin=f'http://127.0.0.1:{mutation.server_port}'
   threading.Thread(target=mutation.serve_forever,daemon=True).start()
   try:
    with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
     try:run('report-rows',out/name,dict(cfg,profile=str(uuid.uuid4()),mode='write'),config.origin+'/')
     except SystemExit:pass
    result=json.loads((out/(name+'.json')).read_text());assert result.get('ok')is False and result.get('error')==error,result;killed[name]=error
   finally:mutation.shutdown();mutation.server_close();shutil.rmtree(tree)
  from tests.test_report_reference_runner import verify as verify_reference
  reference=verify_reference(out/'reference-quality')
  (out/'result.json').write_text(json.dumps({'ok':True,'identity':'author fictional automated, not independent/human/physical/clinical acceptance','paidProviderCalls':0,'fakeProviderCalls':len(calls),'reportRows':27,'projectedMetrics':5,'differentPIDs':[wb['pid'],rb['pid']],'behavioralMutations':killed,'historical':historical,'upgrade':upgrade,'write':write,'read':read,'layouts':layouts,'referenceQuality':reference},indent=2)+'\n')
 finally:server.shutdown();server.server_close()
if __name__=='__main__':main()
