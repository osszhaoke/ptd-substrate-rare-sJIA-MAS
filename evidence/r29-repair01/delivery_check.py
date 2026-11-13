from pathlib import Path
import hashlib,json,re,subprocess,sys
R=Path(__file__).resolve().parents[2];sys.path.insert(0,str(R))
from tools.verify_debt import require_verification
from importlib.util import spec_from_file_location,module_from_spec
proof=require_verification(R,R/'evidence/r29-verification01/result.json');sp=spec_from_file_location('r29manifest',R/'evidence/r29-adoption01/finalize_manifest.py');m=module_from_spec(sp);sp.loader.exec_module(m);receipt=json.loads((R/'evidence/r29-adoption01/adoption-result.json').read_text());index=json.loads((R/'SOURCE_MANIFEST.json').read_text());m.validate(index,receipt)
for name in ['REPAIR_R29.md','AUDIT_REVIEW_R29.md']:
 text=(R/'docs'/name).read_text();assert '<!-- R29_IDENTITY -->'not in text
 for dest in re.findall(r'\]\(([^)]+)\)',text):
  if not dest.startswith(('http://','https://','#')):assert (R/'docs'/dest).is_file(),dest
assert hashlib.sha256((R/'deploy/PTDS-H5-sjia-mas-r19.zip').read_bytes()).hexdigest()=='751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d'
for name in ['STATUS.json','ACCEPTANCE.json']:
 d=json.loads((R/name).read_text());assert d['verificationBinding']==proof['binding']['digest']and d['debtSummary']['independentFindingsAwaitingClosure']==1 and d['debtSummary']['newAggregateRestorePerformanceObservation']['experimentalProbePassed']is False
subprocess.run(['git','diff','--check'],cwd=R,check=True)
result={'ok':True,'currentRootProofExact':proof['binding']['digest'],'sourceManifestEntries':len(index['files']),'documentsValid':True,'oldZIPUnchanged':True,'independentClosurePending':1,'original61Passed':True,'supplementalAggregatePerformanceObservation':'OPEN_NOT_PASSED','serviceOperationsAndRealOCR':0,'gitDiffWhitespaceCheck':True}
(R/'evidence/r29-repair01/final-delivery-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
