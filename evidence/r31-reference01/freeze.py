from pathlib import Path
import difflib,hashlib,json,sys,tarfile
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;C=R/'runtime/r31-reference-candidate01';sys.path.insert(0,str(C))
from tools.verify_debt import require_verification,fingerprint
proof=require_verification(C,C/'evidence/r31-verification02/result.json');summary=json.loads((O/'gate-summary.json').read_text());assert summary['binding']==proof['binding']['digest'];assert fingerprint(R)==json.loads((O/'plan.json').read_text())['baseline']
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
patch=[]
for d in summary['delta']:
 before=(R/d['path']).read_text().splitlines(True)if d['before']else[];after=(C/d['path']).read_text().splitlines(True);patch.extend(difflib.unified_diff(before,after,fromfile='R30/'+d['path'],tofile='R31-A1/'+d['path']))
(O/'candidate.diff').write_text(''.join(patch))
paths=[C/p for p in proof['binding']['files']]+[p for p in (C/'tools/bin').iterdir()if p.is_file()]
paths.extend(p for folder in ['evidence/r31-verification01','evidence/r31-verification02','evidence/r31-reference-target01']for p in (C/folder).rglob('*')if p.is_file())
assert len(paths)==len(set(paths));manifest={p.relative_to(C).as_posix():digest(p)for p in sorted(paths)}
(O/'frozen-inventory.json').write_text(json.dumps({'identity':'isolated source and author verification; NOT_ADOPTED','sourceBinding':proof['binding'],'includedFiles':manifest},indent=2)+'\n')
archive=O/'R31-A1-source-and-evidence.tar.gz';assert not archive.exists()
with tarfile.open(archive,'w:gz')as tf:
 for p in sorted(paths):
  assert digest(p)==manifest[p.relative_to(C).as_posix()];tf.add(p,arcname='candidate/'+p.relative_to(C).as_posix(),recursive=False)
with tarfile.open(archive,'r:gz')as tf:
 actual={}
 for member in tf.getmembers():
  assert member.isfile()and member.name.startswith('candidate/')and '..'not in Path(member.name).parts
  actual[member.name.removeprefix('candidate/')]=hashlib.sha256(tf.extractfile(member).read()).hexdigest()
 assert actual==manifest
record={'ok':True,'archive':archive.name,'bytes':archive.stat().st_size,'sha256':digest(archive),'inventory':'frozen-inventory.json','inventorySha256':digest(O/'frozen-inventory.json'),'fileCount':len(manifest),'sourceInputCount':len(proof['binding']['files']),'binding':proof['binding']['digest'],'archiveAllMembersHashVerified':True,'candidateUnchanged':proof['binding']==fingerprint(C),'rootR30Unchanged':True,'adopted':False};(O/'freeze.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
