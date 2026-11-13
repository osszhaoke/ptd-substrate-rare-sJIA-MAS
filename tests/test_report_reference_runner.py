"""Mandatory R31 fictional reference quality behavior, no real provider."""
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
   assert request.full_url=='https://ocr.tencentcloudapi.com/' and timeout==25;assert base64.b64decode(json.loads(request.data)['ImageBase64'])[:8]==b'\x89PNG\r\n\x1a\n';calls.append(1);return io.BytesIO(json.dumps(response).encode())
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
  result={'ok':True,'identity':'author fictional automated; not independent/human/clinical','write':write,'read':read,'pids':pids,'paidProviderCalls':0,'fakeProviderCalls':len(calls),'mutations':killed,'positiveControl':'write; identical unmutated case for every mutation'};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');return result
 finally:server.shutdown();server.server_close()
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();verify(ROOT/a.output)
if __name__=='__main__':main()
