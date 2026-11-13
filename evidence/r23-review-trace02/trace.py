"""Additional GET-only phase trace; diagnostic only, never acceptance."""
import hashlib,json,subprocess,sys,threading,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT))
from gateway.server import Server,Handler
from gateway.ocr import Configuration
out=Path(__file__).resolve().parent
class Trace(Handler):
 def do_GET(self):
  with (out/'requests.jsonl').open('a') as f:f.write(json.dumps({'path':self.path})+'\n')
  if self.path.startswith('/__phase__'):return self.send(200,{'diagnostic':True})
  return super().do_GET()
server=Server(('127.0.0.1',0),ROOT/'web',out/'unused-budget.json',Configuration({}));server.RequestHandlerClass=Trace
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
script=(ROOT/'tests/browser.state-ui.js').read_text();needle='const wait=async f=>{';assert script.count(needle)==1
script=script.replace(needle,"const wait=async f=>{fetch('/__phase__?wait='+encodeURIComponent(String(f)));")
script=script.replace("if(f())return;","if(f()){fetch('/__phase__?done='+encodeURIComponent(String(f)));return;}")
prefix="""const trace=(name)=>fetch('/__phase__?event='+encodeURIComponent(name));
const estimate=navigator.storage.estimate.bind(navigator.storage);navigator.storage.estimate=()=>{trace('estimate-start');return estimate().then(v=>{trace('estimate-done');return v;},e=>{trace('estimate-error');throw e;});};
const {RecordStore:TraceStore}=await import('/storage/store.js');const get=TraceStore.prototype.get;TraceStore.prototype.get=async function(s,id){trace('get-start:'+s+':'+id);try{const v=await get.call(this,s,id);trace('get-done:'+s+':'+id);return v;}catch(e){trace('get-error:'+s+':'+id);throw e;}};
"""
script=script.replace('(async()=>{','(async()=>{'+prefix,1)
(out/'probe.js').write_text(script)
args=[str(ROOT/'tools/bin/browser-probe'),f'http://127.0.0.1:{server.server_port}/',str(out/'probe.js'),str(out/'probe')]
cfg={'profile':str(uuid.uuid4()),'width':'320'}
p=subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
(out/'binding.json').write_text(json.dumps({'pid':p.pid,'config':cfg,'command':args,'scriptSha256':hashlib.sha256(script.encode()).hexdigest()},indent=2)+'\n')
try:
 try:stdout,stderr=p.communicate(json.dumps(cfg),timeout=165)
 except subprocess.TimeoutExpired:p.kill();stdout,stderr=p.communicate()
 (out/'probe.log').write_text(stdout+stderr)
finally:server.shutdown();server.server_close();thread.join(2)
