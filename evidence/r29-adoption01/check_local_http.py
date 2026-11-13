import datetime,hashlib,json,subprocess,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];out=Path(__file__).resolve().parent
assert not (out/'local-http-after.json').exists()
origin='http://127.0.0.1:18791/'
manifest=json.loads((ROOT/'deploy/STATIC_MANIFEST.json').read_text());assets=[]
for path,expected in [*[(p,h)for p,h in manifest['assets'].items()if not p.endswith('.json')],('sw.js',hashlib.sha256((ROOT/'web/sw.js').read_bytes()).hexdigest())]:
 with urllib.request.urlopen(origin+(''if path=='index.html'else path),timeout=8)as r:
  actual=hashlib.sha256(r.read()).hexdigest();assert r.status==200 and actual==expected;assets.append({'path':path,'sha256':actual,'status':r.status})
with urllib.request.urlopen(origin+'health',timeout=8)as r:health=json.load(r)
assert health['status']=='ok' and health['ocrEnabled']is True
pids=subprocess.run(['lsof','-nP','-t','-iTCP:18791','-sTCP:LISTEN'],capture_output=True,text=True,check=True).stdout.split();assert pids==['45593']
proof=json.loads((ROOT/'evidence/r29-verification01/result.json').read_text())
(out/'local-http-after.json').write_text(json.dumps({'ok':True,'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':origin,'staticVersion':manifest['staticVersion'],'binding':proof['binding']['digest'],'getAssetCount':len(assets)-1,'serviceWorkerExact':True,'allGetBytesExact':True,'gatewayCodeInMemory':'Not reverified; R27 source adoption requires a new operator process/loading evidence; health is not same-version OCR proof','health':health,'requestsMethod':'GET_ONLY','providerCalls':0,'listeningPIDs':list(map(int,pids)),'serviceRestarts':0,'assets':assets},indent=2)+'\n')
print(json.dumps({'ok':True,'assets':len(assets)-1,'PID':pids[0]}))
