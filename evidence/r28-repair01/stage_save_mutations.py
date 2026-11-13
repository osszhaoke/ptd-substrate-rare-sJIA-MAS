"""Additional fictional behavioral guards; no live service or real provider."""
from pathlib import Path
import hashlib,json,shutil,subprocess,uuid
ROOT=Path(__file__).resolve().parents[2];candidate=ROOT/'runtime/r28-candidate01';out=Path(__file__).resolve().parent/'stage-save-mutations01';out.mkdir(exist_ok=False)
needle="if(payload.formatVersion===3)need(!payload.reportRows.some(reportUnitNeedsReview),'REPORT_UNIT_INCOMPLETE');"
save="if(review.payload.formatVersion===3)need(!review.payload.reportRows.some(reportUnitNeedsReview),'REPORT_UNIT_INCOMPLETE');"
results={}
for label,target in [('control',None),('stage-bypass',needle),('save-bypass',save)]:
 tree=ROOT/'runtime'/('r28-service-mutant-'+str(uuid.uuid4()));tree.mkdir()
 for name in ['web','tests']:shutil.copytree(candidate/name,tree/name)
 shutil.copy2(candidate/'package.json',tree/'package.json')
 if target:
  file=tree/'web/domain/service.js';s=file.read_text();assert s.count(target)==1;file.write_text(s.replace(target,'/* deliberate test-only omitted guard */'))
 command=['node','--test','--test-name-pattern','new stage/save reject','tests/report_contract.test.mjs']
 result=subprocess.run(command,cwd=tree,capture_output=True,text=True,timeout=30)
 (out/(label+'.log')).write_text(result.stdout+result.stderr)
 assert result.returncode==(0 if label=='control'else 1),(label,result.stdout[-1000:])
 if target:assert 'Missing expected rejection' in result.stdout,'NOT_BEHAVIORAL_REJECTION'
 results[label]={'exit':result.returncode,'guardSha256':hashlib.sha256((tree/'web/domain/service.js').read_bytes()).hexdigest(),'expectedBehavior':not target or 'Missing expected rejection' in result.stdout}
 shutil.rmtree(tree)
(out/'result.json').write_text(json.dumps({'ok':True,'scope':'author fictional direct service-stage/save behavioral mutations with unmodified positive control','noProductMutation':True,'realProviderCalls':0,'results':results},indent=2)+'\n')
print(json.dumps({'ok':True,'positiveControls':1,'effectiveMutations':2}))
