from pathlib import Path
import datetime,hashlib,json,subprocess,urllib.request
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent
assert not (O/'http-after.json').exists()
manifest=json.loads((R/'deploy/STATIC_MANIFEST.json').read_text());session=json.loads((R/'runtime/alpha-r30-public02/session.json').read_text());results=[]
assets=[(p,h)for p,h in manifest['assets'].items()if not p.endswith('.json')]+[('sw.js',hashlib.sha256((R/'web/sw.js').read_bytes()).hexdigest())]
for label,origin in [('loopback','http://127.0.0.1:18795'),('public',session['url'])]:
 rows=[]
 for p,h in assets:
  url=origin+('/'if p=='index.html'else'/'+p)+'?r31='+manifest['staticVersion']
  with urllib.request.urlopen(url,timeout=15)as response:
   actual=hashlib.sha256(response.read()).hexdigest();assert response.status==200 and actual==h,(label,p);rows.append({'path':p,'sha256':actual,'status':response.status})
 with urllib.request.urlopen(origin+'/health',timeout=15)as response:health=json.load(response)
 assert health['status']=='ok'and health['expiresAt']==session['expiresAt'];results.append({'origin':origin,'label':label,'assets':rows,'health':health})
pids=subprocess.run(['lsof','-nP','-t','-iTCP:18795','-sTCP:LISTEN'],check=True,capture_output=True,text=True).stdout.split();assert pids==['7138'];assert json.loads((R/'runtime/alpha-r30-public02/session.json').read_text())==session
(O/'http-after.json').write_text(json.dumps({'ok':True,'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'staticVersion':manifest['staticVersion'],'requests':'GET_ONLY; no records API, no uploads or OCR calls','assetCountPerOrigin':len(assets),'origins':results,'listenerPidUnchanged':7138,'deadlineUnchanged':session['expiresAt'],'gatewayLoadedIdentity':'not inferred from GET; existing gateway not changed or restarted','browserFreshLoad':'NOT_TESTED_BY_THIS_HTTP_CHECK'},indent=2)+'\n');print(json.dumps({'ok':True,'assetsPerOrigin':len(assets),'PID':7138}))
