"""Deterministic static shell manifest and transport bundle; no dependencies downloaded."""
from pathlib import Path
import argparse,hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
def sha(b):return hashlib.sha256(b).hexdigest()
def prepare_shell():
    web=ROOT/'web'
    assets={p.relative_to(web).as_posix():sha(p.read_bytes())for p in sorted(web.rglob('*'))if p.is_file()and p.name!='sw.js'}
    version=sha(json.dumps(assets,sort_keys=True).encode())[:16]
    # JSON files are exact build inputs; browser imports definitions.js. Server does not expose raw JSON.
    shell=['/']+['/'+p for p in assets if not p.endswith('.json')]
    worker="const CACHE='ptds-h5-"+version+"';\nconst SHELL="+json.dumps(shell)+";\n"+'''self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
// No skipWaiting or automatic page reload: close all tabs before activating an update.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ptds-h5-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!SHELL.includes(u.pathname))return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(u.pathname))||fetch(e.request)));});
'''
    (web/'sw.js').write_text(worker)
    manifest={'staticVersion':version,'assets':assets,'serviceWorkerSha256':sha((web/'sw.js').read_bytes())}
    (ROOT/'deploy/STATIC_MANIFEST.json').write_text(json.dumps(manifest,indent=2))
    return manifest

def prepare_public_manifest():
    paths=[p for folder in ['web','gateway','public_trial'] for p in (ROOT/folder).rglob('*')
           if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc']
    paths.extend(ROOT/p for p in ['deploy/invite_runner.py','deploy/TRIAL_POLICY.json','deploy/PUBLIC_CONFIG.example.json','START_PUBLIC_24H.command','tools/public_qr.swift','tools/bin/public-qr'])
    entries=[{'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(set(paths))]
    (ROOT/'PUBLIC_SOURCE_MANIFEST.json').write_text(json.dumps({'version':'h5-sjia-mas-r19','scope':'exact temporary public launch files; no deployment is performed by building','files':entries},indent=2)+'\n')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--prepare',action='store_true',help='regenerate shell only; never creates a distributable');parser.add_argument('--evidence',type=Path);args=parser.parse_args()
    manifest=prepare_shell();prepare_public_manifest();version=manifest['staticVersion']
    if args.prepare:
        print(json.dumps({'preparedOnly':True,'staticVersion':version,'packageCreated':False}));return
    from tools.verify_debt import require_verification
    require_verification(ROOT,args.evidence)

    product=[]
    for folder in ['web','gateway','deploy','public_trial']:
        product.extend(p for p in (ROOT/folder).rglob('*')if p.is_file()and '__pycache__'not in p.parts and p.suffix!='.zip')
    product.extend(ROOT/p for p in ['START_LOCAL.command','START_INVITE_TEST.command','START_PUBLIC_24H.command','PUBLIC_SOURCE_MANIFEST.json','tools/public_qr.swift','tools/bin/public-qr','tools/build.py','tools/verify_debt.py','tools/test_plan.json','tools/build_rules.py','tools/prepare_mainland.py','tools/phone_acceptance.py'])
    product.extend(p for p in (ROOT/'tools/phone_acceptance').rglob('*') if p.is_file())
    entries=[{'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size}for p in sorted(set(product))]
    tree=sha(json.dumps(entries,sort_keys=True,separators=(',',':')).encode())
    (ROOT/'SOURCE_MANIFEST.json').write_text(json.dumps({'version':'h5-sjia-mas-r19','productTreeSha256':tree,'scope':'web, gateway, deployment and explicit launch/build wiring; excludes docs/evidence/runtime','hashMethod':'SHA256 of sorted path/sha256/bytes entries, compact JSON with sorted keys','files':entries},indent=2)+'\n')
    for name in ['STATUS.json','ACCEPTANCE.json']:
        p=ROOT/name
        if p.exists():
            data=json.loads(p.read_text());data['productTreeSha256']=tree;p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    files=[]
    for folder in ['web','gateway','docs','public_trial','share']:
        files.extend(p for p in(ROOT/folder).rglob('*')if p.is_file()and '__pycache__'not in p.parts)
    files.extend(p for p in (ROOT/'tools/phone_acceptance').rglob('*') if p.is_file())
    files.append(ROOT/'tools/phone_acceptance.py')
    files.extend(ROOT/p for p in ['START_PUBLIC_24H.command','PUBLIC_SOURCE_MANIFEST.json','tools/public_qr.swift','tools/bin/public-qr'])
    files.extend(ROOT/p for p in ['README.md','START_LOCAL.command','START_INVITE_TEST.command','DECISIONS.md','AUTHORIZATION.json','ACCEPTANCE.json','STATUS.json','SOURCE_MANIFEST.json','deploy/Dockerfile','deploy/Caddyfile','deploy/CONFIG.example','deploy/STATIC_MANIFEST.json','deploy/_headers','deploy/compose.yaml','deploy/PUBLIC_CONFIG.example.json','deploy/ptds-h5.service','deploy/invite_runner.py','deploy/TRIAL_POLICY.json','tools/prepare_mainland.py','tools/build_rules.py','tools/build.py','tools/verify_debt.py','tools/test_plan.json']if(ROOT/p).exists())
    with zipfile.ZipFile(ROOT/'deploy/PTDS-H5-sjia-mas-r19.zip','w',zipfile.ZIP_DEFLATED)as z:
        for p in sorted(files):
            info=zipfile.ZipInfo(p.relative_to(ROOT).as_posix(),(2026,11,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=(0o755 if p.suffix=='.command' or p==ROOT/'tools/bin/public-qr' else 0o644)<<16;z.writestr(info,p.read_bytes())
    print(json.dumps({'staticVersion':version,'transportSha256':sha((ROOT/'deploy/PTDS-H5-sjia-mas-r19.zip').read_bytes()),'files':len(files)}))
if __name__=='__main__':main()
