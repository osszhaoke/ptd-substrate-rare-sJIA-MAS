"""Fictional HTTP/UI provenance and actual process reopen; no paid OCR or personal data."""
import argparse,base64,io,json,subprocess,threading,uuid,shutil,hashlib,struct
from pathlib import Path
from unittest.mock import patch
from gateway.server import Server
from gateway.ocr import Configuration
from gateway.tencent import map_tencent
from tools.run_browser import run
from tests.test_ocr_tables_runner import fixture
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();out=ROOT/a.output;out.mkdir(parents=True,exist_ok=False)
 f=fixture();ledger=f['ledger'];token='synthetic-review-ui-token-000000000000000'
 env=json.loads((ROOT/'deploy/PUBLIC_CONFIG.example.json').read_text());env['PTDS_PUBLIC_ORIGIN']='https://fictional.invalid'
 c=Configuration(env,{'tencentSecretId':'SYNTHETIC_ID','tencentSecretKey':'SYNTHETIC_KEY','trialToken':token});assert c.enabled
 response={'Response':{'RequestId':'synthetic-review-provenance','TextDetections':[{'DetectedText':x['text'],'Confidence':99,'Polygon':[{'X':p['x'],'Y':p['y']}for p in x['coordinates']]}for x in ledger['lines']]}}
 calls=[]
 class Opener:
  def open(self,req,timeout):
   assert req.full_url=='https://ocr.tencentcloudapi.com/' and timeout==25
   image=base64.b64decode(json.loads(req.data)['ImageBase64']);assert image[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',image[16:24])==(1300,240)
   calls.append(1);return io.BytesIO(json.dumps(response).encode())
 server=Server(('127.0.0.1',0),ROOT/'web',out/'synthetic-budget.json',c);c.origin=f'http://127.0.0.1:{server.server_port}'
 threading.Thread(target=server.serve_forever,daemon=True).start();profile=str(uuid.uuid4());common={'token':token,'expected':json.dumps(f['expected']),'original':f['expected'][0][1],'imageCells':json.dumps(ledger['lines'])}
 try:
  with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
   write=run('ocr-review',out/'write',dict(common,profile=profile,mode='write'),c.origin+'/')
   read=run('ocr-review',out/'read',dict(common,profile=profile,mode='read'),c.origin+'/')
   run('ocr-review',out/'replace',dict(common,profile=str(uuid.uuid4()),mode='replace'),c.origin+'/')
   original_rows=response['Response']['TextDetections']
   response['Response']['TextDetections']=[{'DetectedText':f'{code} {value} {unit}','Confidence':99}for code,value,unit in [('WBC','8.20','10^9/L'),('PLT','287','10^9/L'),('CRP','4.2','mg/L'),('ANC','5.00','10^9/L'),('HGB','119','g/L')]]
   run('ocr-review',out/'fallback',dict(common,profile=str(uuid.uuid4()),mode='fallback'),c.origin+'/')
   response['Response']['TextDetections']=original_rows
   for width,scale in [('320','100'),('390','100'),('430','100'),('620','100'),('320','160')]:
    run('ocr-review',out/f'preview-{width}-{scale}',dict(common,profile=str(uuid.uuid4()),mode='preview',width=width,fontScale=scale,ledger=json.dumps(map_tencent(response,'ap-guangzhou'))),c.origin+'/')
  killed={}
  for name,relative,old,new,error in [
   ('no-snapshot','web/features/report_rows.js','renderMetric({...o,unit:r.unit})','renderMetric({...o,unit:r.unit,ocrOrigin:undefined})','ORIGIN_SNAPSHOT_MISSING'),
   ('url-leak','web/app/ocr_review.js','this.events.abort();this.releaseImage();','this.events.abort();','DRAFT_NAVIGATION_URL_LEAK')]:
   tree=ROOT/'runtime'/('review-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web')
   path=tree/relative;text=path.read_text();assert text.count(old)==1;path.write_text(text.replace(old,new))
   (out/(name+'-served.json')).write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
   mutation=Server(('127.0.0.1',0),tree/'web',out/(name+'-synthetic-budget.json'),c);c.origin=f'http://127.0.0.1:{mutation.server_port}'
   threading.Thread(target=mutation.serve_forever,daemon=True).start()
   try:
    with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
     try:run('ocr-review',out/name,dict(common,profile=str(uuid.uuid4()),mode='write'),c.origin+'/')
     except SystemExit:pass
    result=json.loads((out/(name+'.json')).read_text());assert result.get('ok')is False and result.get('error')==error,result;killed[name]=error
   finally:mutation.shutdown();mutation.server_close();shutil.rmtree(tree)
  w=json.loads((out/'write.binding.json').read_text());r=json.loads((out/'read.binding.json').read_text());assert w['pid']!=r['pid'] and write['eventId']==read['eventId'];assert len(calls)==5
  (out/'result.json').write_text(json.dumps({'ok':True,'identity':'author fictional automated, not independent/human/phone acceptance','paidProviderCalls':0,'fakeProviderCalls':len(calls),'killedBy':killed,'differentPIDs':[w['pid'],r['pid']],'originalAndCorrectionPersisted':True,'sourceHighlights':True,'imageReplacementDetached':True,'ownedURLsReleased':True},indent=2)+'\n')
 finally:server.shutdown();server.server_close()
if __name__=='__main__':main()
