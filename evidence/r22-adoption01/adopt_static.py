"""One-use exact static adoption; does not restart the gateway or touch data/fees."""
import ctypes,hashlib,json,os,shutil,sys,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from tools.verify_debt import fingerprint,require_verification
C=ROOT/'runtime/startup-candidate01';OUT=Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'Cache-Control':'no-cache'}),timeout=25)as r:return r.read()
def swap(a,b):
 lib=ctypes.CDLL(None,use_errno=True);fn=lib.renamex_np;fn.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_uint];fn.restype=ctypes.c_int
 if fn(os.fsencode(a),os.fsencode(b),2):raise OSError(ctypes.get_errno(),os.strerror(ctypes.get_errno()))
def main():
 proof=require_verification(C,C/'evidence/r22-verification02/result.json');baseline=json.loads((C/'BASELINE.json').read_text());assert fingerprint(ROOT)==baseline,'ROOT_BASELINE_CHANGED'
 session_path=ROOT/'runtime/alpha-01-r02/session.json';session_bytes=session_path.read_bytes();session=json.loads(session_bytes);os.kill(session['pid'],0)
 url=session['url'];health=json.loads(fetch(url+'/health'));assert health['expiresAt']=='2026-11-09T15:59:00+00:00'and health['ocrEnabled']is True
 assert sha((ROOT/'deploy/PTDS-H5-sjia-mas-r19.zip').read_bytes())=='751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d'
 before=baseline['files'];after=proof['binding']['files'];delta=[p for p in sorted(set(before)|set(after))if before.get(p)!=after.get(p)]
 allowed={'web/app/startup_plan.js', 'tools/test_plan.json', 'package.json', 'tools/verify_debt.py', 'tools/build.py', 'web/sw.js', 'tests/test_startup_plan.py', 'tests/browser.startup.js', 'deploy/STATIC_MANIFEST.json', 'tools/run_browser.py', 'web/app/startup.js', 'web/index.html', 'tests/startup.test.mjs', 'PUBLIC_SOURCE_MANIFEST.json', 'tests/test_startup_runner.py', 'tools/startup_plan.py', 'web/app/startup_task.js'}
 assert set(delta)==allowed,(set(delta)-allowed,allowed-set(delta));assert len(set(before)-set(after))==0
 staged=ROOT/'runtime/r22-web-swap';assert not staged.exists();shutil.copytree(C/'web',staged)
 for name in after:
  if name.startswith('web/'):assert sha((staged/name[4:]).read_bytes())==after[name]
 rollback=OUT/'before-nonweb';rollback.mkdir(exist_ok=False);nonweb=[p for p in delta if not p.startswith('web/')]
 for name in nonweb:
  if name in before:
   p=rollback/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,p)
 (OUT/'adoption-intent.json').write_text(json.dumps({'exactDelta':[{'path':p,'before':before.get(p),'after':after.get(p)}for p in delta],'baseline':baseline['digest'],'adoptedBinding':proof['binding']['digest'],'livePid':session['pid'],'deadline':health['expiresAt'],'healthBefore':health,'atomicWebSwap':True,'oldWebWillRemainAt':str(staged)},indent=2)+'\n')
 swapped=False
 try:
  # At this point the candidate is fully tested; publishing web is one atomic operation.
  swap(ROOT/'web',staged);swapped=True
  for name in nonweb:
   path=ROOT/name;path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name(path.name+'.r22-tmp');shutil.copy2(C/name,tmp);os.replace(tmp,path)
  assert fingerprint(ROOT)==proof['binding'],'ADOPTED_BINDING_MISMATCH'
  checks=[]
  for name in sorted(set(p for p in delta if p.startswith('web/'))|{'web/index.html'}):
   data=fetch(url+('/'if name=='web/index.html'else'/'+name[4:]));assert sha(data)==sha((ROOT/name).read_bytes()),'PUBLIC_BYTES_MISMATCH '+name;checks.append({'path':name,'sha256':sha(data),'http':200})
  health_after=json.loads(fetch(url+'/health'));assert health_after==health;os.kill(session['pid'],0);assert session_path.read_bytes()==session_bytes
  assert sha((ROOT/'deploy/PTDS-H5-sjia-mas-r19.zip').read_bytes())=='751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d'
  result={'ok':True,'binding':proof['binding']['digest'],'boundInputs':len(after),'checks':len(proof['checks']),'staticVersion':json.loads((ROOT/'deploy/STATIC_MANIFEST.json').read_text())['staticVersion'],'gatewayVersion':health['version'],'staticPatch':'r19-ocr03','pidUnchanged':session['pid'],'deadlineUnchanged':health['expiresAt'],'publicExactGETs':checks,'providerCallsThisOperation':0,'dataOrBudgetReadOrChanged':False,'oldZIPUnchanged':True,'verification':'evidence/r22-verification02/result.json','exactDelta':[{'path':p,'before':before.get(p),'after':after.get(p)}for p in delta],'identity':'author exact static adoption and HTTP byte checks; not physical/human/independent acceptance'}
  (OUT/'adoption-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
 except BaseException as error:
  if swapped:swap(ROOT/'web',staged)
  for name in nonweb:
   if name in before:shutil.copy2(rollback/name,ROOT/name)
   elif (ROOT/name).exists():(ROOT/name).unlink()
  assert fingerprint(ROOT)==baseline,'ROLLBACK_MISMATCH'
  (OUT/'adoption-failure.json').write_text(json.dumps({'error':str(error),'rolledBackExact':True},indent=2)+'\n');raise
if __name__=='__main__':main()
