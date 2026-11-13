"""Exact local static adoption; no service restart, upload, DB or secret access."""
import ctypes,hashlib,json,os,shutil,sys,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from tools.verify_debt import fingerprint,require_verification
candidate=ROOT/'runtime/r29-candidate01';out=Path(__file__).resolve().parent
assert not (out/'adoption-result.json').exists(),'ADOPTION_ALREADY_EXISTS'
old=require_verification(ROOT,ROOT/'evidence/r28-verification01/result.json')['binding']
proof=require_verification(candidate,candidate/'evidence/r29-verification01/result.json')
before,after=old['files'],proof['binding']['files']
delta=[{'path':p,'before':before.get(p),'after':after.get(p)}for p in sorted(set(before)|set(after))if before.get(p)!=after.get(p)]
plan=json.loads((ROOT/'evidence/r29-repair01/plan.json').read_text())
allowed=set(plan['productWriteSet']+plan['testWriteSet']+plan['generated'])
assert {r['path']for r in delta}<=allowed,'OUTSIDE_FROZEN_WRITE_SET'
allowed={r['path']for r in delta}
assert 'web/storage/backup.js'in allowed and 'web/domain/report/restore_binding.js'in allowed
(out/'frozen-delta.json').write_text(json.dumps(delta,indent=2)+'\n')
assert {r['path']for r in delta}==allowed,'UNEXPECTED_EXACT_DELTA'
assert all(r['after']for r in delta),'UNAPPROVED_REMOVAL'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
archive=ROOT/'deploy/PTDS-H5-sjia-mas-r19.zip';archive_sha=sha(archive)
assert archive_sha=='751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d'
rehearsal=ROOT/'runtime/r29-adoption-rehearsal01';rehearsal.mkdir(exist_ok=False)
for rel in before:
 dest=rehearsal/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/rel,dest)
assert fingerprint(rehearsal)==old,'REPLAY_BASELINE_MISMATCH'
for row in delta:
 dest=rehearsal/row['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(candidate/row['path'],dest)
assert fingerprint(rehearsal)==proof['binding'],'FORWARD_REPLAY_MISMATCH'
for row in delta:
 dest=rehearsal/row['path']
 if row['before'] is None:dest.unlink()
 else:shutil.copy2(ROOT/row['path'],dest)
assert fingerprint(rehearsal)==old,'REVERSE_REPLAY_MISMATCH'
(out/'replay-result.json').write_text(json.dumps({'ok':True,'before':old['digest'],'after':proof['binding']['digest'],'forwardAndReverseExact':True,'paths':len(delta)},indent=2)+'\n')
backup=ROOT/'runtime/r29-source-before01';backup.mkdir(exist_ok=False)
stage=ROOT/'runtime/r29-web-swap01';shutil.copytree(candidate/'web',stage)
expected_web={p.removeprefix('web/'):h for p,h in after.items()if p.startswith('web/')}
assert {p.relative_to(stage).as_posix():sha(p)for p in stage.rglob('*')if p.is_file()}==expected_web
nonweb=[r for r in delta if not r['path'].startswith('web/')]
for r in nonweb:
 if r['before'] is not None:
  dest=backup/r['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/r['path'],dest);assert sha(dest)==r['before']
for name in ['SOURCE_MANIFEST.json','STATUS.json','ACCEPTANCE.json','AUTHORIZATION.json']:
 dest=backup/'metadata'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,dest)
def replace_from(source,dest):
 dest.parent.mkdir(parents=True,exist_ok=True);temp=dest.with_name(dest.name+'.r29-'+str(uuid.uuid4()));shutil.copy2(source,temp);os.replace(temp,dest)
lib=ctypes.CDLL(None,use_errno=True)
lib.renameatx_np.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint]
def exchange():
 if lib.renameatx_np(-2,os.fsencode(stage),-2,os.fsencode(ROOT/'web'),2)!=0:raise OSError(ctypes.get_errno(),'RENAME_SWAP_FAILED')
swapped=False
try:
 for r in nonweb:replace_from(candidate/r['path'],ROOT/r['path'])
 exchange();swapped=True
 assert fingerprint(ROOT)==proof['binding'],'ADOPTED_INPUT_SET_OR_HASH_MISMATCH'
 assert sha(archive)==archive_sha,'ARCHIVE_CHANGED'
except BaseException:
 if swapped:exchange()
 for r in nonweb:
  if r['before'] is None:(ROOT/r['path']).unlink(missing_ok=True)
  else:replace_from(backup/r['path'],ROOT/r['path'])
 assert fingerprint(ROOT)==old,'ROLLBACK_FAILED'
 raise
shutil.copytree(candidate/'evidence/r29-verification01',ROOT/'evidence/r29-verification01')
require_verification(ROOT,ROOT/'evidence/r29-verification01/result.json')
receipt={'ok':True,'identity':'author exact local static adoption after complete isolated fictional proof; not independent/phone/clinical acceptance',
 'batch':'R29','staticPatch':'r19-restore01','staticVersion':json.loads((ROOT/'deploy/STATIC_MANIFEST.json').read_text())['staticVersion'],
 'binding':proof['binding']['digest'],'boundInputs':len(after),'checks':len(proof['checks']),'verification':'evidence/r29-verification01/result.json',
 'previousAdoption':'evidence/r28-adoption01/adoption-result.json','previousAdoptionSha256':sha(ROOT/'evidence/r28-adoption01/adoption-result.json'),
 'exactDelta':delta,'oldWebAt':str(stage.relative_to(ROOT)),'otherBeforeBytes':str(backup.relative_to(ROOT)),
 'serviceRestarts':0,'newProviderCallsDuringAdoption':0,'runningGateway':'No gateway source change in R29; existing in-memory gateway identity is not inferred from files; no restart or credential access','realDatabaseCredentialsOrBudgetReadOrModified':False,'oldZIPUnchanged':archive_sha,
 'rollback':'atomic web exchange back plus exact non-web restoration/deletion; baseline asserted before and after'}
(out/'adoption-result.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'ok':True,'staticVersion':receipt['staticVersion'],'binding':receipt['binding'],'changedPaths':len(delta),'newPaths':sum(r['before']is None for r in delta)}))
