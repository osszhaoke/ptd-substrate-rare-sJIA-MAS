"""Controlled read failure and original-entry contrast; no product server changes."""
import argparse,json,threading,uuid,shutil,hashlib
from pathlib import Path
from gateway.server import Server,Handler
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
class FailingAsset(Handler):
 def do_GET(self):
  if self.path=='/features/states.js':return self.send(503,{'error':'FICTIONAL_ASSET_READ_FAILURE'})
  return super().do_GET()
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();out=ROOT/a.output;out.mkdir(parents=True,exist_ok=False)
 normal=Server(('127.0.0.1',0),ROOT/'web',out/'unused-budget.json',Configuration({}));threading.Thread(target=normal.serve_forever,daemon=True).start()
 try:run('startup',out/'control',{'profile':str(uuid.uuid4())},f'http://127.0.0.1:{normal.server_port}/')
 finally:normal.shutdown();normal.server_close()
 broken=Server(('127.0.0.1',0),ROOT/'web',out/'unused-fault-budget.json',Configuration({}));broken.RequestHandlerClass=FailingAsset;threading.Thread(target=broken.serve_forever,daemon=True).start()
 try:run('startup',out/'failure',{'profile':str(uuid.uuid4()),'mode':'failure'},f'http://127.0.0.1:{broken.server_port}/')
 finally:broken.shutdown();broken.server_close()
 tree=ROOT/'runtime'/('startup-original-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');path=tree/'web/index.html';s=path.read_text();assert s.count('src="/app/startup.js"')==1;path.write_text(s.replace('src="/app/startup.js"','src="/app/main.js"'))
 (out/'original-entry-served.json').write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
 original=Server(('127.0.0.1',0),tree/'web',out/'unused-original-budget.json',Configuration({}));original.RequestHandlerClass=FailingAsset;threading.Thread(target=original.serve_forever,daemon=True).start()
 try:
  try:run('startup',out/'original-entry',{'profile':str(uuid.uuid4()),'mode':'failure'},f'http://127.0.0.1:{original.server_port}/')
  except SystemExit:pass
  result=json.loads((out/'original-entry.json').read_text());assert result.get('ok')is False and result.get('error')=='STARTUP_FAILURE_NOT_EXPLAINED',result
 finally:original.shutdown();original.server_close();shutil.rmtree(tree)
 (out/'result.json').write_text(json.dumps({'ok':True,'identity':'author fictional automated; no human/phone/clinical acceptance','paidProviderCalls':0,'normalEntry':True,'assetFailureExplained':True,'originalEntryKilledBy':'STARTUP_FAILURE_NOT_EXPLAINED'},indent=2)+'\n')
if __name__=='__main__':main()
