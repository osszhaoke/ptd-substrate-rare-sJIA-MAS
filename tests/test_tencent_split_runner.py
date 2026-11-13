"""Explicit fake-provider HTTP→real UI→confirmation→new-process same-profile read."""
import argparse,base64,hashlib,io,json,threading,uuid
from pathlib import Path
from unittest.mock import patch
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run

ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
 out=ROOT/args.output;out.mkdir(parents=True,exist_ok=False)
 token='synthetic-only-split-ui-token-000000000000'
 env=json.loads((ROOT/'deploy/PUBLIC_CONFIG.example.json').read_text());env['PTDS_PUBLIC_ORIGIN']='https://fictional.invalid'
 c=Configuration(env,{'tencentSecretId':'SYNTHETIC_ID','tencentSecretKey':'SYNTHETIC_KEY','trialToken':token});assert c.enabled
 rows=['PTDS自检·合成化验单(非真实数据)','采样时间:2026-10-04 08:00','项目','结果','单位','参考范围',
 '铁蛋白','1520','ng/mL','30-400','血小板计数','98','x10^9/L','125-350','白细胞计数','6.2','x10^9/L','3.5-9.5',
 'C反应蛋白','18','mg/L','0-10','谷草转氨酶','65','U/L','15-40','甘油三酯','2.30','mmol/L','<1.7']
 response={'Response':{'RequestId':'synthetic-split-response','TextDetections':[{'DetectedText':x,'Confidence':99}for x in rows]}}
 calls=[]
 class Opener:
  def open(self,req,timeout):
   assert req.full_url=='https://ocr.tencentcloudapi.com/' and timeout==25
   image=base64.b64decode(json.loads(req.data)['ImageBase64']);assert image==(ROOT/'web/fixture.png').read_bytes()
   calls.append(hashlib.sha256(image).hexdigest());return io.BytesIO(json.dumps(response).encode())
 server=Server(('127.0.0.1',0),ROOT/'web',out/'synthetic-budget.json',c)
 c.origin=f'http://127.0.0.1:{server.server_address[1]}' # Test-only transport; product HTTPS restriction unchanged.
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();profile=str(uuid.uuid4())
 try:
  with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
   write=run('tencent-split',out/'write',{'profile':profile,'mode':'write','token':token},c.origin+'/')
   read=run('tencent-split',out/'read',{'profile':profile,'mode':'read'},c.origin+'/')
  w=json.loads((out/'write.binding.json').read_text());r=json.loads((out/'read.binding.json').read_text())
  assert w['pid']!=r['pid'] and write['eventId']==read['eventId']
  assert len(calls)==1 and server.budget.state['reserved']==1
  (out/'result.json').write_text(json.dumps({'ok':True,'identity':'author automated fictional UI; not human, physical or public acceptance','providerCalls':0,'fakeAdapterCalls':len(calls),'browserPIDs':[w['pid'],r['pid']],'eventId':read['eventId'],'observations':6,'sourceLines':30,'oneReservation':True},indent=2)+'\n')
 finally:server.shutdown();server.server_close()
if __name__=='__main__':main()
