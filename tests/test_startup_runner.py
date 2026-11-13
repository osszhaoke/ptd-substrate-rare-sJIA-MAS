"""Synthetic HTTP faults at bootstrap/deep/CSS edges; explicit reopen, never real OCR."""
import argparse,json,threading,uuid,shutil,hashlib,time
from contextlib import contextmanager
from pathlib import Path
from gateway.server import Server,Handler
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
BOOTSTRAP=['/app/startup.js','/app/startup_plan.js','/app/startup_task.js']
class AssetFault(Handler):
 def do_GET(self):
  self.server.requests.append({'method':'GET','path':self.path,'navigation':self.headers.get('Sec-Fetch-Dest')=='document' or 'text/html' in self.headers.get('Accept','')})
  if self.path==self.server.fault and (not self.server.fail_once or not self.server.failed):
   self.server.failed=True
   if self.server.delay:threading.Event().wait(self.server.delay)
   return self.send(503,{'error':'FICTIONAL_ASSET_READ_FAILURE'})
  return super().do_GET()
 def do_POST(self):
  self.server.requests.append({'method':'POST','path':self.path})
  return super().do_POST()
@contextmanager
def serving(out,name,web,fault=None,once=False,delay=0):
 server=Server(('127.0.0.1',0),web,out/(name+'-unused-budget.json'),Configuration({}));server.RequestHandlerClass=AssetFault
 server.requests=[];server.fault=fault;server.fail_once=once;server.failed=False;server.delay=delay
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 try:yield server,f'http://127.0.0.1:{server.server_port}/'
 finally:
  server.shutdown();server.server_close();thread.join(2)
  assert not thread.is_alive(),'TEST_SERVER_NOT_STOPPED'
  (out/(name+'-requests.json')).write_text(json.dumps(server.requests,indent=2)+'\n')
  assert not any(r['method']!='GET' or r['path']=='/api/ocr' for r in server.requests),'UNEXPECTED_API_OR_WRITE'
  assert not (out/(name+'-unused-budget.json')).exists(),'BUDGET_WAS_CREATED'
@contextmanager
def mutation(out,name,change):
 tree=ROOT/'runtime'/('startup-'+name+'-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web')
 try:
  change(tree/'web')
  (out/(name+'-served.json')).write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2)+'\n')
  yield tree/'web'
 finally:shutil.rmtree(tree)
def remove_fallback(web):
 path=web/'index.html';text=path.read_text();start=text.index('<section id="startup-fallback"');end=text.index('</section>',start)+len('</section>')
 path.write_text(text[:start]+'<p>正在打开此设备资料库…</p>'+text[end:])
def rejected(out,name,web,fault,expected,once=False,mode='failure'):
 with serving(out,name,web,fault,once) as (server,url):
  try:run('startup',out/name,{'profile':str(uuid.uuid4()),'mode':mode},url)
  except SystemExit:pass
  result=json.loads((out/(name+'.json')).read_text());assert result.get('ok')is False and result.get('error')==expected,result
  assert sum(r['path']=='/' and r.get('navigation') for r in server.requests)==1,'AUTOMATIC_NAVIGATION'
 return expected
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();out=ROOT/a.output;out.mkdir(parents=True,exist_ok=False)
 with serving(out,'control',ROOT/'web') as (_,url):run('startup',out/'control',{'profile':str(uuid.uuid4())},url)
 with serving(out,'failure',ROOT/'web','/features/states.js') as (server,url):
  run('startup',out/'failure',{'profile':str(uuid.uuid4()),'mode':'failure'},url)
  assert sum(r['path']=='/' and r.get('navigation') for r in server.requests)==1,'AUTOMATIC_NAVIGATION'
 with serving(out,'style-repair',ROOT/'web','/features/ocr_review.css',True) as (_,url):run('startup',out/'style-repair',{'profile':str(uuid.uuid4())},url)
 cases=[]
 for asset in BOOTSTRAP:
  name=asset.rsplit('/',1)[-1][:-3]
  with serving(out,name,ROOT/'web',asset,True) as (server,url):
   run('startup',out/name,{'profile':str(uuid.uuid4()),'mode':'bootstrap-recovery','allowReload':'yes'},url)
   assert sum(r['path']=='/' and r.get('navigation') for r in server.requests)==2,'NOT_EXACTLY_ONE_MANUAL_REOPEN'
   second_nav=next(i for i,r in enumerate(server.requests) if r['path']=='/' and r.get('navigation') and i>0)
   assert sum(r['path']==asset for r in server.requests[:second_nav])==1,'FAILED_ASSET_RETRIED_WITHOUT_REOPEN'
   assert sum(r['path']==asset for r in server.requests)>=2,'FAILED_ASSET_NOT_RECOVERED'
  cases.append({'asset':asset,'manualReopenRecovered':True,'rootGETs':2,'ocrOrWriteRequests':0})
 with serving(out,'long-wait',ROOT/'web','/app/startup.js',delay=31) as (server,url):
  since=time.monotonic();run('startup',out/'long-wait',{'profile':str(uuid.uuid4()),'mode':'failure'},url)
  waited_ms=round((time.monotonic()-since)*1000);assert waited_ms>=31000,'WAIT_WINDOW_TOO_SHORT'
  assert sum(r['path']=='/' and r.get('navigation') for r in server.requests)==1,'AUTOMATIC_NAVIGATION'
  assert not any(r['path']=='/app/main.js' for r in server.requests),'MAIN_EXECUTED_ON_BOOTSTRAP_FAILURE'
 def no_styles(web):
  p=web/'app/startup.js';text=p.read_text();needle='await restoreStylesheets(styles,restoreStyle,owner.signal);';assert text.count(needle)==1;p.write_text(text.replace(needle,''))
 with mutation(out,'style-regression',no_styles) as web:style_error=rejected(out,'style-regression',web,'/features/ocr_review.css','STARTUP_STYLE_NOT_READY',True,mode='normal')
 def original_entry(web):
  remove_fallback(web);path=web/'index.html';text=path.read_text();assert text.count('src="/app/startup.js"')==1;path.write_text(text.replace('src="/app/startup.js"','src="/app/main.js"'))
 with mutation(out,'original-entry',original_entry) as web:original_error=rejected(out,'original-entry',web,'/features/states.js','STARTUP_FAILURE_NOT_EXPLAINED')
 kills=[]
 with mutation(out,'no-static-fallback',remove_fallback) as web:
  for asset in BOOTSTRAP:
   name='no-fallback-'+asset.rsplit('/',1)[-1][:-3];error=rejected(out,name,web,asset,'STARTUP_FAILURE_NOT_EXPLAINED');kills.append({'asset':asset,'error':error})
 (out/'result.json').write_text(json.dumps({'ok':True,'identity':'author fictional automated; no human/phone/clinical acceptance','paidProviderCalls':0,'normalEntry':True,'assetFailureExplained':True,'missingStylesRepaired':True,'styleRegressionKilledBy':style_error,'originalEntryWithoutFallbackKilledBy':original_error,'bootstrapManualRecovery':cases,'staticFallbackRemovalKilled':kills,'feedbackVisibleAfterMs':waited_ms,'automaticReloads':0,'ocrOrWriteRequests':0},indent=2)+'\n')
if __name__=='__main__':main()
