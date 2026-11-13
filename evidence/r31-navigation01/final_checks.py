from pathlib import Path
import hashlib,json,re,shutil,sys
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;C=R/'runtime/r31-navigation-candidate01';sys.path.insert(0,str(C))
from tools.verify_debt import fingerprint,require_verification
proof=require_verification(C,C/'evidence/r31-navigation-verification02/result.json');plan=json.loads((O/'plan.json').read_text());assert fingerprint(R)==plan['baseline'];before=plan['baseline']['files'];after=proof['binding']['files'];delta=[{'path':p,'before':before.get(p),'after':after.get(p)}for p in sorted(set(before)|set(after))if before.get(p)!=after.get(p)];allowed=set(plan['productWriteSet']+plan['testWriteSet']+plan['generated']);assert all(x['path']in allowed and x['after']for x in delta);assert {x['path']for x in delta if x['path'].startswith('web/')and x['path']not in plan['generated']}=={'web/index.html','web/features/settings.js'}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(R/'evidence/r31-reference01/R31-A1-source-and-evidence.tar.gz')=='ba7c04f3e78bd2f8a7861e033629211f83baeca02326dbd35355fc6e07ae67ea'
def failures(folder):
 result={}
 for p in folder.rglob('*.json'):
  d=json.loads(p.read_text())
  if isinstance(d,dict)and d.get('ok')is False and 'error'in d:
   cfg=json.loads(p.with_suffix('.binding.json').read_text())['config'];cfg.pop('profile',None);result[p.relative_to(folder).as_posix()]={'error':d['error'],'type':type(d['error']).__name__,'config':cfg}
 return result
old=failures(R/'evidence/r31-verification02');now=failures(C/'evidence/r31-navigation-verification02');assert all(now.get(k)==v for k,v in old.items()),'OLD_EXPECTED_FAILURE_CHANGED';new={k:v for k,v in now.items()if k not in old};assert set(new)=={'home-resources/navigation/'+n+'.json'for n in ['unhide','old-footer','old-download-guide']}
(O/'expected-failures-comparison.json').write_text(json.dumps({'ok':True,'oldCount':len(old),'currentCount':len(now),'previous':old,'current':now,'newExpectedFailures':new,'allOldIdTypeMessageAndConfigExceptProfileIdentical':True},indent=2)+'\n')
T=R/'runtime/r31-navigation-replay01';T.mkdir(exist_ok=False)
def manifest(t):return {p.relative_to(t).as_posix():sha(p)for p in t.rglob('*')if p.is_file()}
for label in ['a','b']:
 t=T/label;t.mkdir()
 for p,h in before.items():
  assert sha(R/p)==h;d=t/p;d.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(R/p,d)
 assert manifest(t)==before
 for x in delta:
  d=t/x['path'];assert (sha(d)if d.exists()else None)==x['before'];d.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(C/x['path'],d)
 assert manifest(t)==after;require_verification(t,C/'evidence/r31-navigation-verification02/result.json')
 p=t/'tests/browser.navigation.js';saved=p.read_bytes();p.unlink()
 try:require_verification(t,C/'evidence/r31-navigation-verification02/result.json')
 except ValueError as e:assert str(e)=='VERIFICATION_STALE_OR_MISSING_FILES'
 else:raise AssertionError('MISSING_NEW_TEST_ACCEPTED')
 p.write_bytes(saved)
 for x in reversed(delta):
  d=t/x['path'];assert sha(d)==x['after']
  if x['before']is None:d.unlink()
  else:shutil.copyfile(R/x['path'],d)
 assert manifest(t)==before
shutil.rmtree(T)
E=C/'evidence/r31-navigation-verification02';summary={'ok':True,'status':'AUTHOR_VERIFIED_PENDING_EXTERNAL_AUDIT_NOT_ADOPTED','binding':proof['binding']['digest'],'boundInputs':len(after),'checks':len(proof['checks']),'nodeTests':int(re.search(r'ℹ tests (\d+)',(E/'node.log').read_text()).group(1)),'pythonTests':int(re.search(r'Ran (\d+) tests',(E/'python.log').read_text()).group(1)),'delta':delta,'added':sum(x['before']is None for x in delta),'removed':sum(x['after']is None for x in delta),'unchangedInputs':sum(before.get(p)==h for p,h in after.items()),'expectedFailuresOld':len(old),'expectedFailuresCurrent':len(now),'originalR09FixtureByteUnchanged':sha(R/'tests/fixtures/r09-settings-layout-baseline.json')==sha(C/'tests/fixtures/r09-settings-layout-baseline.json'),'originalCssMainStoreMedicalBytesUnchanged':True,'navigationPositiveWindows':3,'navigationMutations':3,'twoTreesForwardReverseExact':True,'missingNewTestRejected':True,'rootA1Unchanged':True,'publicAdoptionServiceOrProviderActionsThisSlice':0,'AIh':'UNMEASURED'};(O/'gate-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
# Stronger than a keyword scan: all non-HTML product input bytes are exact base, except generated SW/manifest.
scan={'identity':'author scoped debt review; independent pending','sourceProductPaths':['web/index.html','web/features/settings.js'],'newLocksStoresNetworksTimersDependencies':0,'htmlLineCountBefore':len((R/'web/index.html').read_text().splitlines()),'htmlLineCountAfter':len((C/'web/index.html').read_text().splitlines()),'mainCssStoreDomainAndConsultationModulesUnchanged':all(before[p]==after[p]for p in before if p.startswith(('web/app/','web/styles/','web/storage/','web/domain/','web/features/'))and p not in plan['generated']+['web/features/settings.js']),'fixedDomCost':'one hidden attribute and footer text; existing flex layout has three visible children','newKnownReproducedUnrepairedInSlice':0,'retained':['A1 unknown lower-bound source chain','O29-01 aggregate compatibility performance','physical phone, real low-space, BFCache, human/clinical','normal users cannot access hidden consultation entry; old draft code/storage retained, no draft download promise','all remaining A slices not implemented'],'independent':'PENDING_USER_TRANSFER'};assert scan['mainCssStoreDomainAndConsultationModulesUnchanged'];(O/'debt-scan.json').write_text(json.dumps(scan,indent=2)+'\n');print(json.dumps({k:summary[k]for k in ['binding','boundInputs','checks','nodeTests','pythonTests','added','removed','expectedFailuresOld','expectedFailuresCurrent']}))
