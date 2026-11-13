from pathlib import Path
import hashlib,json,tarfile,shutil,difflib
R=Path(__file__).resolve().parents[1];O=R/'evidence/r31-navigation02';C=R/'runtime/r31-navigation-candidate02';B=R/'runtime/r31-navigation-candidate01';O.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def files(root):
 out=[]
 for p in root.rglob('*'):
  if not p.is_file() or 'tools/bin' in p.as_posix() or '__pycache__' in p.parts or p.suffix=='.pyc':continue
  out.append(p)
 return sorted(out)
# exact source/test delta from the audited A2 candidate
old={p.relative_to(B).as_posix():sha(p) for p in files(B)};new={p.relative_to(C).as_posix():sha(p) for p in files(C)}
delta=[{'path':p,'before':old.get(p),'after':new.get(p)} for p in sorted(set(old)|set(new)) if old.get(p)!=new.get(p)]
# only source manifest and evidence are committed in this handoff; generate exact changed source list separately
source_delta=[]
for p in ['tools/test_plan.json','tests/test_navigation_runner.py']:
 source_delta.append({'path':p,'before':old[p],'after':new[p]})
patch=[]
for d in source_delta:patch.extend(difflib.unified_diff((B/d['path']).read_text().splitlines(True),(C/d['path']).read_text().splitlines(True),fromfile='R31-A2/'+d['path'],tofile='R31-A2R1/'+d['path']))
(O/'candidate.diff').write_text(''.join(patch))
manifest={p.relative_to(C).as_posix():{'bytes':p.stat().st_size,'sha256':sha(p)} for p in files(C)}
(O/'frozen-inventory.json').write_text(json.dumps({'identity':'R31-A2R1 verification-governance repair; product still unadopted','candidateBinding':'34d6a5d267d2c55cc7d6576eb2534a94e821dbd18ea3bf5094782a3553d6aa9d','sourceDelta':source_delta,'fileCount':len(manifest),'files':manifest},ensure_ascii=False,indent=2)+'\n')
archive=O/'R31-A2R1-source-and-evidence.tar.gz'
with tarfile.open(archive,'w:gz') as tf:
 for p in files(C):tf.add(p,arcname='candidate/'+p.relative_to(C).as_posix(),recursive=False)
actual={}
with tarfile.open(archive,'r:gz') as tf:
 for m in tf.getmembers():
  assert m.isfile() and m.name.startswith('candidate/') and '..' not in Path(m.name).parts
  actual[m.name.removeprefix('candidate/')]={'bytes':m.size,'sha256':hashlib.sha256(tf.extractfile(m).read()).hexdigest()}
assert actual==manifest
rec={'ok':True,'archive':archive.name,'archiveBytes':archive.stat().st_size,'archiveSha256':sha(archive),'fileCount':len(manifest),'binding':'34d6a5d267d2c55cc7d6576eb2534a94e821dbd18ea3bf5094782a3553d6aa9d','sourceDeltaPaths':['tools/test_plan.json','tests/test_navigation_runner.py'],'productDeltaPaths':[],'authorFullGate':'PASS_61_REQUIRED_CHECKS','adopted':False,'serviceOperations':0}
(O/'freeze.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rec))
