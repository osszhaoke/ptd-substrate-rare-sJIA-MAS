"""Frozen fictional old UI stage -> current UI first-save boundary; mandatory report runner."""
import base64,gzip,hashlib,io,json,shutil,subprocess,tarfile,threading,uuid
from pathlib import Path
from unittest.mock import patch
from gateway.server import Server
from gateway.tencent import map_tencent
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def run_upgrade(out,config,response,opener,baseline=False):
 out.mkdir(parents=True,exist_ok=False);old=out/'r27-served';old.mkdir();fixture=ROOT/'tests/fixtures/r27-draft-web.tgz';lock=json.loads((ROOT/'tests/fixtures/r27-draft-web.lock.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest();assert sha(fixture.read_bytes())==lock['fixtureSha256']
 with tarfile.open(fixture,'r:gz')as tar:
  assert set(tar.getnames())==set(lock['assets'])
  for member in tar.getmembers():
   assert member.isfile()and member.name in lock['assets']and not Path(member.name).is_absolute()and '..'not in Path(member.name).parts;b=tar.extractfile(member).read();e=lock['assets'][member.name];assert sha(b)==e['sha256']and len(b)==e['bytes'];p=old/member.name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 (out/'r27-served-hashes.json').write_text(json.dumps(lock,indent=2)+'\n')
 server=Server(('127.0.0.1',0),old,out/'fictional-budget.json',config);config.origin=f'http://127.0.0.1:{server.server_port}';threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 def one(label,current,prefix):
  folder=out/prefix;folder.mkdir(exist_ok=False);server.root=old.resolve(strict=True)
  factory={'footer':'bilingualFooterLedger()', 'unit':"incompleteUnitLedger('legacy')",'valid':'cbcLedger()'}[label]
  script="import {bilingualFooterLedger,incompleteUnitLedger}from'./tests/fixtures/report_layouts.mjs';import{cbcLedger}from'./tests/fixtures/cbc_report.mjs';console.log(JSON.stringify("+factory+"));"
  ledger=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True));response.clear();response.update({'Response':{'RequestId':'fictional-upgrade-'+label,'Angle':0,'TextDetections':[{'DetectedText':l['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in l['coordinates']]}for l in ledger['lines']]}})
  profile=str(uuid.uuid4());base={'profile':profile,'kind':label};cfg=dict(base,layout='yes',mode='write',ledger=json.dumps(map_tencent(response,config.region)),rows='28'if label=='footer'else'27',pending='0',token=config.token,upgradeOldStage='yes')
  with patch('gateway.tencent.urllib.request.build_opener',return_value=opener()):stage=run('report-rows',folder/'old-stage',cfg,config.origin+'/')
  server.root=current.resolve(strict=True)
  (folder/'actual-served-roots.json').write_text(json.dumps({'old':str(old),'oldHashes':'../r27-served-hashes.json','current':str(current),'currentHashes':{p.relative_to(current).as_posix():sha(p.read_bytes())for p in current.rglob('*')if p.is_file()},'genericBindingNote':'old-stage binding lists harness current product; actual old served bytes separately frozen above'},indent=2)+'\n')
  error='REPORT_ORIGIN_MISMATCH'if label=='footer'else'REPORT_UNIT_INCOMPLETE'if label=='unit'else''
  mode='save'if label=='valid'else'reject'
  saved=run('report-upgrade',folder/'current-save',dict(base,mode=mode,expectedError=error),config.origin+'/')
  read=run('report-upgrade',folder/'current-read',dict(base,mode='read',expectedRecords='1'if label=='valid'else'0'),config.origin+'/')
  modes=['old-stage','current-save','current-read'];corrected=None
  if label!='valid':
   corrected=run('report-upgrade',folder/'correct-save',dict(base,mode='correct'),config.origin+'/');again=run('report-upgrade',folder/'correct-read',dict(base,mode='read',expectedRecords='1'),config.origin+'/');assert corrected['eventId']==again['eventId'];modes+=['correct-save','correct-read']
  pids=[json.loads((folder/(m+'.binding.json')).read_text())['pid']for m in modes];assert len(set(pids))==len(pids)
  return {'case':label,'stage':stage,'save':saved,'read':read,'correction':corrected,'pids':pids}
 try:
  if baseline:
   try:one('footer',ROOT/'web','baseline')
   except SystemExit:pass
   result=json.loads((out/'baseline/current-save.json').read_text());assert result.get('ok')is False and result.get('error')=='UPGRADE_OLD_DRAFT_SAVED',result;return {'baselineReproduced':True,'result':result}
  for label in ['footer','unit','valid']:results.append(one(label,ROOT/'web',label))
  killed={}
  for name,relative,anchor,replacement,expected in [
   ('save-binding','web/domain/service.js','await validateWriteBinding(review.payload,source);','/* removed current first-save binding */','UPGRADE_OLD_DRAFT_SAVED'),
   ('source-reuse','web/storage/store.js','if(source&&!reuseSource)','if(source)','UPGRADE_RESTAGE_SOURCE_UNREADABLE')]:
   tree=ROOT/'runtime'/('save-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');p=tree/relative;text=p.read_text();assert text.count(anchor)==1;p.write_text(text.replace(anchor,replacement))
   try:
    try:one('footer',tree/'web','mutation-'+name)
    except SystemExit:pass
    leaf='current-save'if name=='save-binding'else'correct-save';mutant=json.loads((out/('mutation-'+name)/(leaf+'.json')).read_text());assert mutant.get('ok')is False and mutant.get('error','').startswith(expected),mutant;killed[name]=mutant['error']
   finally:shutil.rmtree(tree)
  result={'ok':True,'identity':'author fictional actual oldUI stage/currentUI save across distinct PIDs; not human or independent','cases':results,'mutationsKilled':killed,'sameUnmutatedControl':'footer','realOCR':0};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');return result
 finally:server.shutdown();server.server_close()
