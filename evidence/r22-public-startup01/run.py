from pathlib import Path
import sys,json,subprocess,uuid,hashlib
r=Path(__file__).resolve().parents[2];out=Path(__file__).parent
url=json.loads((r/'runtime/alpha-01-r02/session.json').read_text())['url']
results=[]
for i in range(1,4):
 target=out/f'fresh-{i:02d}';profile=str(uuid.uuid4())
 binding={'profile':profile,'testSha256':hashlib.sha256((out/'startup.js').read_bytes()).hexdigest(),'staticVersion':json.loads((r/'deploy/STATIC_MANIFEST.json').read_text())['staticVersion']}
 target.with_suffix('.binding.json').write_text(json.dumps(binding,indent=2))
 with target.with_suffix('.log').open('w')as log:p=subprocess.run([str(r/'tools/bin/browser-probe'),url+'/',str(out/'startup.js'),str(target)],input=json.dumps({'profile':profile}),text=True,stdout=log,stderr=subprocess.STDOUT,timeout=100)
 x=json.loads(target.with_suffix('.json').read_text());print(json.dumps({'attempt':i,'ok':x.get('ok'),'error':x.get('error'),'readyMs':x.get('readyMs')}),flush=True)
 results.append({'attempt':i,**{k:v for k,v in x.items()if k!='resources'}})
 if p.returncode or x.get('ok')is not True:raise SystemExit('FRESH_PROFILE_FAILED')
(out/'summary.json').write_text(json.dumps({'ok':True,'samples':results,'identity':'author bounded fresh-profile samples; not universal startup stability or phone acceptance','paidProviderCalls':0},indent=2)+'\n')
