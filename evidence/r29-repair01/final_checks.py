from pathlib import Path
import json,hashlib,sys,re
R=Path(__file__).resolve().parents[2];C=R/'runtime/r29-candidate01';sys.path.insert(0,str(C))
from tools.verify_debt import require_verification,fingerprint
out=Path(__file__).resolve().parent;proof=require_verification(C,C/'evidence/r29-verification01/result.json');plan=json.loads((out/'plan.json').read_text());before=plan['baseline']['files'];after=proof['binding']['files'];delta=[{'path':p,'before':before.get(p),'after':after.get(p)}for p in sorted(set(before)|set(after))if before.get(p)!=after.get(p)];allowed=set(plan['productWriteSet']+plan['testWriteSet']+plan['generated']);assert all(d['path']in allowed and d['after']for d in delta)
assert fingerprint(R)==plan['baseline'],'ROOT_BASELINE_CHANGED'
old=R/'evidence/r28-verification01';new=C/'evidence/r29-verification01'
def failures(folder):
 result={}
 for p in folder.rglob('*.json'):
  d=json.loads(p.read_text())
  if isinstance(d,dict)and d.get('ok')is False and 'error'in d:
   rel=p.relative_to(folder).as_posix();cfg=json.loads(p.with_suffix('.binding.json').read_text())['config'];cfg.pop('profile',None);result[rel]={'error':d['error'],'type':type(d['error']).__name__,'config':cfg}
 return result
prev,now=failures(old),failures(new);assert all(now.get(k)==v for k,v in prev.items()),'OLD_FAILURE_CHANGED';extra={k:v for k,v in now.items()if k not in prev};assert set(extra)=={'report-rows-wire/history-no-compat.json'}
(out/'expected-failures-comparison.json').write_text(json.dumps({'ok':True,'oldCount':len(prev),'currentCount':len(now),'allPreviousIdTypeMessageAndConfigExceptProfileIdentical':True,'previous':prev,'current':now,'newExpectedFailures':extra},indent=2)+'\n')
report=new/'report-rows-wire';results=[json.loads(p.read_text())for p in report.glob('*.json')if not p.name.endswith(('.binding.json','-served.json','budget.json'))];windows=[p for p in report.glob('*.binding.json')];success=[p for p in windows if json.loads(p.with_suffix('').with_suffix('.json').read_text()).get('ok')is True]
summary={'ok':True,'binding':proof['binding']['digest'],'boundInputs':len(after),'checks':len(proof['checks']),'nodeTests':int(re.search(r'ℹ tests (\d+)',(new/'node.log').read_text()).group(1)),'pythonTests':int(re.search(r'Ran (\d+) tests',(new/'python.log').read_text()).group(1)),'reportWindows':len(windows),'reportPositiveWindows':len(success),'reportExpectedFailures':len(windows)-len(success),'historical':json.loads((report/'result.json').read_text())['historical'],'delta':delta,'added':sum(d['before']is None for d in delta),'removed':sum(d['after']is None for d in delta),'unchangedInputs':sum(before.get(p)==h for p,h in after.items()),'expectedFailuresOld':len(prev),'expectedFailuresCurrent':len(now),'realCalls':0,'independent':'PENDING_R28_A01_ONLY','AIh':'UNMEASURED'}
(out/'gate-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
changed={d['path']for d in delta};assert not any(p.startswith(('gateway/','web/rules/'))or p in ['web/domain/service.js','web/app/main.js','web/storage/store.js','package.json']for p in changed)
scan={'ok':True,'knownReproducibleUnrepairedLocalCodeItems':0,'independentFindingsAwaitingClosure':1,'frozenClosureBytes':plan['frozenParser']['bytes'],'frozenModuleCount':len(plan['frozenParser']['files']),'newGlobalLocksStoresNetworksTimersDependencies':0,'unchanged':['gateway','current parser and stage/save','medical rules','Store','frontend main','package.json'],'largestWebJSByLines':sorted([{'path':p.relative_to(C).as_posix(),'lines':len(p.read_text().splitlines()),'bytes':p.stat().st_size}for p in (C/'web').rglob('*.js')],key=lambda e:e['lines'],reverse=True)[:8],'retained':['independent R28-A01 closure','phone memory/real low space/BFCache','human and clinical','in-memory gateway loading identity','historical performance unique cause','no all-historical-version compatibility or OCR accuracy claim']}
(out/'debt-scan.json').write_text(json.dumps(scan,indent=2)+'\n');print(json.dumps({k:summary[k]for k in ['checks','nodeTests','pythonTests','boundInputs','reportWindows','reportPositiveWindows','reportExpectedFailures','added','unchangedInputs']}))
