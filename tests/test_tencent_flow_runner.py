"""Synthetic full local HTTP flow. Explicit local-only test origin; no paid provider calls."""
import argparse,json,threading,uuid,io,base64,hashlib
from pathlib import Path
from unittest.mock import patch
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args();out=ROOT/args.output;out.mkdir(parents=True,exist_ok=False)
 token='synthetic-test-token-not-a-secret-00000000'
 c=Configuration({'PTDS_OCR_PROVIDER':'tencent-general-accurate','PTDS_OCR_REGION':'ap-guangzhou','PTDS_TENCENT_SECRET_ID':'synthetic-id','PTDS_TENCENT_SECRET_KEY':'synthetic-key','PTDS_TRIAL_TOKEN':token,'PTDS_PUBLIC_ORIGIN':'https://fictional.example','PTDS_OCR_TOTAL_CALLS':'100','PTDS_OCR_SESSION_CALLS':'100','PTDS_OCR_PER_MINUTE':'6','PTDS_OCR_CONCURRENCY':'1','PTDS_OCR_MAX_UNIT_COST':'0.50','PTDS_OCR_TOTAL_BUDGET':'50','PTDS_OCR_CURRENCY':'CNY','PTDS_OCR_BUDGET_NOTE':'synthetic test'})
 assert c.enabled
 c.origin='http://127.0.0.1:18790' # Test harness only. Product Configuration still requires HTTPS.
 rows=['铁蛋白 >684 ng/mL','铁蛋白 >684 ng/mL','甘油三酯 156 mg/dL','纤维蛋白原 1.5 g/L','unmatched fictional row']
 response={'Response':{'RequestId':'fictional-provider-request','TextDetections':[{'DetectedText':x,'Confidence':99}for x in rows]}}
 sent=[]
 class FakeOpener:
  def open(self,req,timeout):
   assert req.full_url=='https://ocr.tencentcloudapi.com/'and timeout==25
   assert req.get_header('Authorization').startswith('TC3-HMAC-SHA256 ')
   body=base64.b64decode(json.loads(req.data)['ImageBase64']);assert body==(ROOT/'web/fixture.png').read_bytes()
   sent.append({'imageSha256':hashlib.sha256(body).hexdigest(),'signed':True,'action':req.get_header('X-tc-action')})
   return io.BytesIO(json.dumps(response).encode())
 server=Server(('127.0.0.1',18790),ROOT/'web',out/'synthetic-budget.json',c);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with patch('gateway.tencent.urllib.request.build_opener',return_value=FakeOpener()):
   result=run('tencent-flow',out/'browser',{'profile':str(uuid.uuid4()),'token':token},c.origin+'/')
  assert len(sent)==1 and server.budget.state['reserved']==1 and server.budget.state['reservedCost']=='0.50'
  (out/'result.json').write_text(json.dumps({'ok':True,'syntheticOnly':True,'actualProviderCalls':0,'simulatedAdapterCalls':sent,'reserved':server.budget.state['reserved'],'reservedCost':server.budget.state['reservedCost'],'clientResult':'browser.json','localHttpOriginOverride':'test harness only; not deployment/TLS evidence'},indent=2)+'\n')
 finally:server.shutdown();server.server_close()
if __name__=='__main__':main()
