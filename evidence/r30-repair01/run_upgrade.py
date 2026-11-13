import io,json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2];C=R/'runtime/r30-candidate01';sys.path.insert(0,str(C))
from tests.report_upgrade import run_upgrade
from gateway.ocr import Configuration
env=json.loads((C/'deploy/PUBLIC_CONFIG.example.json').read_text());env['PTDS_PUBLIC_ORIGIN']='https://fictional.invalid';cfg=Configuration(env,{'tencentSecretId':'FICTIONAL_ID','tencentSecretKey':'FICTIONAL_KEY','trialToken':'fictional-upgrade-token-00000000000'});response={}
class Opener:
 def open(self,request,timeout):assert request.full_url=='https://ocr.tencentcloudapi.com/'and timeout==25;return io.BytesIO(json.dumps(response).encode())
name=sys.argv[1];baseline='baseline'in name
r=run_upgrade(C/'evidence'/name,cfg,response,Opener,baseline=baseline);print(json.dumps(r))
