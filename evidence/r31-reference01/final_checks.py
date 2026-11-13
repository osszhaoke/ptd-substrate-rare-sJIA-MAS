from pathlib import Path
import hashlib,json,re,shutil,sys
R=Path(__file__).resolve().parents[2];C=R/'runtime/r31-reference-candidate01';O=Path(__file__).resolve().parent
sys.path.insert(0,str(C))
from tools.verify_debt import require_verification,fingerprint
proof=require_verification(C,C/'evidence/r31-verification02/result.json');plan=json.loads((O/'plan.json').read_text());before=plan['baseline']['files'];after=proof['binding']['files']
assert fingerprint(R)==plan['baseline'],'ROOT_R30_CHANGED'
first=json.loads((C/'evidence/r31-verification01/result.json').read_text());assert first['binding']==proof['binding'],'TWO_WINDOWS_SOURCE_DIFFERS'
serviceBefore=json.loads((O/'service-before.json').read_text());serviceNow=json.loads((R/'runtime/alpha-r30-public02/session.json').read_text());(O/'service-after.json').write_text(json.dumps(serviceNow,indent=2)+'\n');assert serviceBefore==serviceNow,'SERVICE_METADATA_CHANGED'
delta=[{'path':p,'before':before.get(p),'after':after.get(p)}for p in sorted(set(before)|set(after))if before.get(p)!=after.get(p)]
allowed=set(plan['productWriteSet']+plan['testWriteSet']+plan['generated']);assert all(d['path']in allowed and d['after']for d in delta)
def failures(folder):
 result={}
 for p in folder.rglob('*.json'):
  d=json.loads(p.read_text())
  if isinstance(d,dict)and d.get('ok')is False and 'error'in d:
   rel=p.relative_to(folder).as_posix();cfg=json.loads(p.with_suffix('.binding.json').read_text())['config'];cfg.pop('profile',None);result[rel]={'error':d['error'],'type':type(d['error']).__name__,'config':cfg}
 return result
old=failures(R/'evidence/r30-verification01');now=failures(C/'evidence/r31-verification02');assert all(now.get(k)==v for k,v in old.items()),'PREVIOUS_EXPECTED_FAILURE_CHANGED';extra={k:v for k,v in now.items()if k not in old};assert set(extra)=={'report-rows-wire/reference-quality/'+n+'.json'for n in ['hide-hint','scalar-as-range','no-refresh']}
(O/'expected-failures-comparison.json').write_text(json.dumps({'ok':True,'oldCount':len(old),'currentCount':len(now),'allPreviousIdTypeMessageAndConfigExceptProfileIdentical':True,'previous':old,'current':now,'newExpectedFailures':extra},indent=2)+'\n')
# Full input trees copied from explicit positive inventories, never fuzzy patches; deletion absence is checked.
T=R/'runtime/r31-reference-replay01';T.mkdir(exist_ok=False)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()if p.is_file()else None
def tree_manifest(tree):return {p.relative_to(tree).as_posix():digest(p)for p in tree.rglob('*')if p.is_file()}
for label in ['first','second']:
 t=T/label;t.mkdir()
 for p,h in before.items():
  assert digest(R/p)==h;target=t/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(R/p,target)
 assert tree_manifest(t)==before
 for d in delta:
  assert digest(t/d['path'])==d['before'];target=t/d['path'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(C/d['path'],target);assert digest(target)==d['after']
 assert tree_manifest(t)==after
 require_verification(t,C/'evidence/r31-verification02/result.json')
 missing=t/'web/domain/report/reference.js';held=missing.read_bytes();missing.unlink()
 try:require_verification(t,C/'evidence/r31-verification02/result.json')
 except ValueError as error:assert str(error)=='VERIFICATION_STALE_OR_MISSING_FILES'
 else:raise AssertionError('MISSING_NEW_INPUT_ACCEPTED')
 missing.write_bytes(held);assert tree_manifest(t)==after
 for d in reversed(delta):
  target=t/d['path'];assert digest(target)==d['after']
  if d['before']is None:target.unlink()
  else:shutil.copyfile(R/d['path'],target)
  assert digest(target)==d['before']
 assert tree_manifest(t)==before
# Both trees actually rejected a missing new file at the verification gate.
shutil.rmtree(T)
new=C/'evidence/r31-verification02';windows=list((new/'report-rows-wire').rglob('*.binding.json'));positive=sum(json.loads(p.with_suffix('').with_suffix('.json').read_text()).get('ok')is True for p in windows)
summary={'ok':True,'status':'AUTHOR_VERIFIED_PENDING_EXTERNAL_AUDIT_NOT_ADOPTED','binding':proof['binding']['digest'],'boundInputs':len(after),'checks':len(proof['checks']),'nodeTests':int(re.search(r'ℹ tests (\d+)',(new/'node.log').read_text()).group(1)),'pythonTests':int(re.search(r'Ran (\d+) tests',(new/'python.log').read_text()).group(1)),'delta':delta,'added':sum(d['before']is None for d in delta),'removed':sum(d['after']is None for d in delta),'unchangedInputs':sum(before.get(p)==h for p,h in after.items()),'reportWindows':len(windows),'reportPositiveWindows':positive,'reportExpectedFailures':len(windows)-positive,'expectedFailuresOld':len(old),'expectedFailuresCurrent':len(now),'twoTreeForwardReverseExact':True,'missingRequiredFileRejected':True,'rootR30Unchanged':True,'serviceOperations':0,'paidProviderCalls':0,'independentAudit':'PENDING_USER_TRANSFER_TO_01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6','AIh':'UNMEASURED'}
(O/'gate-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
scan={'identity':'author scoped structural review; not independent technical debt acceptance','productDelta':[d for d in delta if d['path']in plan['productWriteSet']],'newLocksStoresNetworkTimersDependencies':0,'parserOriginWireRestoreAndMedicalRulesUnchanged':True,'pureReferenceProjection':'<=100 rows, <=200-character stored literal; long decimal never throws; no inferred bounds','knownUnrepairedInSlice':0,'externalAudit':'PENDING','largestWebJSByLines':sorted([{'path':p.relative_to(C).as_posix(),'lines':len(p.read_text().splitlines()),'bytes':p.stat().st_size}for p in (C/'web').rglob('*.js')],key=lambda e:e['lines'],reverse=True)[:8],'retained':['actual screenshot lower-bound-loss root cause UNKNOWN; no original/same response','remaining A slices not implemented incl consultation hide','O29-01 aggregate20k compatibility performance observation','physical phone memory/real low space/BFCache','human and clinical acceptance','gateway in-memory identity and historical performance unique cause','no whole-table OCR accuracy guarantee']}
(O/'debt-scan.json').write_text(json.dumps(scan,indent=2)+'\n');print(json.dumps({k:summary[k]for k in ['checks','nodeTests','pythonTests','boundInputs','added','removed','reportWindows','reportPositiveWindows','expectedFailuresCurrent','binding']}))
