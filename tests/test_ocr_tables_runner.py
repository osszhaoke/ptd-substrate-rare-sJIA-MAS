"""Synthetic HTTP OCR→UI→explicit test confirmation→new PID read; zero paid calls."""
import argparse,base64,io,json,subprocess,threading,uuid,shutil,hashlib
from pathlib import Path
from unittest.mock import patch
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def fixture():
 p=subprocess.run(['node','--input-type=module','-e',"import {parallelLedger,expected} from './tests/fixtures/ocr_parallel.mjs';console.log(JSON.stringify({ledger:parallelLedger(),expected}));"],cwd=ROOT,check=True,capture_output=True,text=True)
 return json.loads(p.stdout)
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();out=ROOT/a.output;out.mkdir(parents=True,exist_ok=False)
 f=fixture();ledger=f['ledger'];token='synthetic-table-ui-token-000000000000000'
 env=json.loads((ROOT/'deploy/PUBLIC_CONFIG.example.json').read_text());env['PTDS_PUBLIC_ORIGIN']='https://fictional.invalid'
 c=Configuration(env,{'tencentSecretId':'SYNTHETIC_ID','tencentSecretKey':'SYNTHETIC_KEY','trialToken':token});assert c.enabled
 response={'Response':{'RequestId':'synthetic-bilingual-table','TextDetections':[{'DetectedText':x['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in x['coordinates']]}for x in ledger['lines']]}}
 calls=[]
 class Opener:
  def open(self,req,timeout):
   assert req.full_url=='https://ocr.tencentcloudapi.com/' and timeout==25
   assert base64.b64decode(json.loads(req.data)['ImageBase64'])==(ROOT/'web/fixture.png').read_bytes()
   calls.append(1);return io.BytesIO(json.dumps(response).encode())
 server=Server(('127.0.0.1',0),ROOT/'web',out/'synthetic-budget.json',c);c.origin=f'http://127.0.0.1:{server.server_address[1]}'
 threading.Thread(target=server.serve_forever,daemon=True).start();profile=str(uuid.uuid4());common={'token':token,'expected':json.dumps(f['expected']),'lineCount':str(len(ledger['lines']))}
 try:
  with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
   write=run('ocr-tables',out/'write',dict(common,profile=profile,mode='write'),c.origin+'/')
   read=run('ocr-tables',out/'read',dict(common,profile=profile,mode='read'),c.origin+'/')
   response['Response']['TextDetections']=[{'DetectedText':'无法识别的项目','Confidence':60}]
   run('ocr-tables',out/'zero',dict(common,profile=str(uuid.uuid4()),mode='zero'),c.origin+'/')
   run('ocr-tables',out/'cancel',dict(common,profile=str(uuid.uuid4()),mode='cancel',cancelLedger=json.dumps(ledger)),c.origin+'/')
  # Effective regression: change only zero-result presentation in an isolated served tree.
  tree=ROOT/'runtime'/('ocr-zero-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web')
  path=tree/'web/app/editor_flow.js';text=path.read_text();needle='ocrResult(count,coverage=null){';assert text.count(needle)==1
  path.write_text(text.replace(needle,needle+"\n  if(!count){this.show(2);return '图片识别好了，请对照原图核对。';}"))
  (out/'mutation-served.json').write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
  mutation=Server(('127.0.0.1',0),tree/'web',out/'mutation-synthetic-budget.json',c);c.origin=f'http://127.0.0.1:{mutation.server_port}'
  threading.Thread(target=mutation.serve_forever,daemon=True).start()
  try:
   with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
    try:run('ocr-tables',out/'zero-regression',dict(common,profile=str(uuid.uuid4()),mode='zero'),c.origin+'/')
    except SystemExit:pass
   regression=json.loads((out/'zero-regression.json').read_text());assert regression.get('ok')is False and regression.get('error')=='ZERO_SUCCESS_FEEDBACK',regression
  finally:mutation.shutdown();mutation.server_close();shutil.rmtree(tree)
  w=json.loads((out/'write.binding.json').read_text());r=json.loads((out/'read.binding.json').read_text());assert w['pid']!=r['pid'] and write['eventId']==read['eventId'];assert len(calls)==3 and server.budget.state['reserved']==2 and mutation.budget.state['reserved']==1
  (out/'result.json').write_text(json.dumps({'ok':True,'identity':'author synthetic automated, not human/phone/independent acceptance','paidProviderCalls':0,'fakeProviderCalls':3,'zeroRegressionKilledBy':'ZERO_SUCCESS_FEEDBACK','differentPIDs':[w['pid'],r['pid']],'observations':5,'sourceLines':len(ledger['lines']),'emptyHonest':True,'manualCancellationPreserved':True},indent=2)+'\n')
 finally:server.shutdown();server.server_close()
if __name__=='__main__':main()
