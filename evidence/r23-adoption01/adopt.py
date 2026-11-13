"""Exact local source adoption after isolated proof; no service, provider, DB or ZIP action."""
import argparse,hashlib,json,os,shutil,sys,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from tools.verify_debt import fingerprint,require_verification
p=argparse.ArgumentParser();p.add_argument('--verification',required=True);a=p.parse_args()
candidate=ROOT/'runtime/startup-fallback-candidate01';out=Path(__file__).resolve().parent
assert not (out/'adoption-result.json').exists(),'ADOPTION_EXISTS'
baseline=json.loads((ROOT/'evidence/r23-baseline01/binding.json').read_text())
assert fingerprint(ROOT)==baseline,'LIVE_SOURCE_CHANGED'
proof=require_verification(candidate,candidate/a.verification)
assert set(proof['binding']['files'])==set(baseline['files']),'INPUT_SET_CHANGED'
delta=[{'path':name,'before':before,'after':proof['binding']['files'][name]} for name,before in baseline['files'].items() if before!=proof['binding']['files'][name]]
allowed={'PUBLIC_SOURCE_MANIFEST.json','deploy/STATIC_MANIFEST.json','tests/browser.startup.js','tests/test_startup_runner.py','tools/test_plan.json','web/index.html','web/sw.js'}
assert {row['path'] for row in delta}==allowed,'UNEXPECTED_DELTA'
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
zip_sha=sha(ROOT/'deploy/PTDS-H5-sjia-mas-r19.zip');assert zip_sha=='751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d'
backup=ROOT/'runtime/r23-source-before01';backup.mkdir(exist_ok=False)
for row in delta:
 dest=backup/row['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/row['path'],dest);assert sha(dest)==row['before']
def replace_from(source,dest):
 temp=dest.with_name(dest.name+'.r23-'+str(uuid.uuid4()));shutil.copy2(source,temp);os.replace(temp,dest)
try:
 for row in delta:replace_from(candidate/row['path'],ROOT/row['path'])
 assert fingerprint(ROOT)==proof['binding'],'ADOPTED_COMBINATION_MISMATCH'
 assert sha(ROOT/'deploy/PTDS-H5-sjia-mas-r19.zip')==zip_sha
except BaseException:
 for row in delta:replace_from(backup/row['path'],ROOT/row['path'])
 assert fingerprint(ROOT)==baseline,'ROLLBACK_FAILED'
 raise
receipt={'ok':True,'identity':'author exact local source adoption after isolated automated proof; not public deployment, independent, phone or clinical acceptance','staticPatch':'r19-startup01','batch':'R23','staticVersion':json.loads((ROOT/'deploy/STATIC_MANIFEST.json').read_text())['staticVersion'],'binding':proof['binding']['digest'],'boundInputs':len(proof['binding']['files']),'checks':len(proof['checks']),'verification':a.verification,'previousAdoption':'evidence/r22-adoption02/adoption-result.json','previousAdoptionSha256':sha(ROOT/'evidence/r22-adoption02/adoption-result.json'),'exactDelta':delta,'sourceBackup':str(backup.relative_to(ROOT)),'serviceActions':0,'newProviderCalls':0,'realDataOrCredentialsOrBudgetReadOrModified':False,'oldZIPUnchanged':zip_sha}
(out/'adoption-result.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'ok':True,'staticVersion':receipt['staticVersion'],'binding':receipt['binding'],'exactDeltaCount':len(delta)}))
