"""GET-only exact-public-byte check. Never uploads reports or reads credentials."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib,json,time,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).parent
session=json.loads((ROOT/'runtime/alpha-r30-public02/session.json').read_text())
assert session['state']=='SERVING'
url=session['url'];expected_deadline='2026-11-12T15:59:00+00:00'
def get(path):
    attempts=[]
    for _ in range(2):
        try:
            with urllib.request.urlopen(urllib.request.Request(url+path,headers={'Cache-Control':'no-cache'}),timeout=25) as r:
                body=r.read();attempts.append({'status':r.status,'bytes':len(body)})
                return body,dict(r.headers),attempts
        except Exception as e:
            attempts.append({'errorType':type(e).__name__})
    return None,{},attempts
rows=[]
for path in ['/health','/trial-status','/api/ocr/config']:
    body,headers,attempts=get(path)
    data=json.loads(body) if body else None
    assert data and data['expiresAt']==expected_deadline,(path,attempts)
    assert data.get('ocrEnabled',data.get('enabled')) is True,(path,'OCR_DISABLED')
    rows.append({'path':path,'attempts':attempts,'response':data})
files=sorted(p for p in (ROOT/'web').rglob('*') if p.is_file() and p.suffix in {'.html','.js','.css','.svg','.webmanifest','.png','.jpg'})
def one(p):
    path='/'+p.relative_to(ROOT/'web').as_posix()
    body,headers,attempts=get(path)
    expected=hashlib.sha256(p.read_bytes()).hexdigest()
    actual=hashlib.sha256(body).hexdigest() if body is not None else None
    return {'path':path,'ok':expected==actual,'expectedSha256':expected,'actualSha256':actual,'attempts':attempts}
with ThreadPoolExecutor(max_workers=4)as pool:assets=list(pool.map(one,files))
for path in ['/STATUS.json','/gateway/credentials.py','/../STATUS.json','/compat/r27/LOCK.json','/rules/h1-dictionary-0.1.json','/rules/sjia-rulepack-0.1.json']:
    try:
        with urllib.request.urlopen(url+path,timeout=15) as r:status=r.status
    except urllib.error.HTTPError as e:status=e.code
    rows.append({'path':path,'status':status,'ok':status==(400 if path=='/../STATUS.json' else 404)})
result={'ok':all(x['ok'] for x in assets) and all(x.get('ok',True) for x in rows),'url':url,'deadlineUTC':expected_deadline,'assets':assets,'checks':rows,'paidOcrCalls':0,'phoneCellularTested':False,'identity':'author GET-only public reachability and byte comparison from this Mac'}
(OUT/'public-probes02.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'ok':result['ok'],'assets':len(assets),'failedAssets':[a['path'] for a in assets if not a['ok']]}))
assert result['ok']
