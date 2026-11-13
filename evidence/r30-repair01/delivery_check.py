from pathlib import Path
import json,hashlib,re,subprocess,sys,importlib.util
R=Path(__file__).resolve().parents[2];sys.path.insert(0,str(R))
from tools.verify_debt import require_verification
from tools.acceptance_index import expected_index,validate_index
proof=require_verification(R,R/'evidence/r30-verification01/result.json');validate_index(json.loads((R/'ACCEPTANCE.json').read_text()),expected_index(R,R/'evidence/r30-verification01/result.json'))
sp=importlib.util.spec_from_file_location('r30manifest',R/'evidence/r30-adoption01/finalize_manifest.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m);adopt=json.loads((R/'evidence/r30-adoption01/adoption-result.json').read_text());index=json.loads((R/'SOURCE_MANIFEST.json').read_text());m.validate(index,adopt)
for name in ['REPAIR_R30.md','AUDIT_REVIEW_R30.md']:
 text=(R/'docs'/name).read_text();assert '<!-- R30_IDENTITY -->'not in text
 for dest in re.findall(r'\]\(([^)]+)\)',text):
  if not dest.startswith(('http://','https://','#')):assert (R/'docs'/dest).is_file(),dest
assert hashlib.sha256((R/'deploy/PTDS-H5-sjia-mas-r19.zip').read_bytes()).hexdigest()=='751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d'
for name in ['STATUS.json','ACCEPTANCE.json']:
 d=json.loads((R/name).read_text());assert d['verificationBinding']==proof['binding']['digest']and d['debtSummary']['independentFindingsAwaitingClosure']==2;assert d['repairR29']['findings']['R28-A01']=='CLOSED_INDEPENDENTLY_ON_R29_OLD_FORMAL_BACKUP';assert d['debtSummary']['newAggregateRestorePerformanceObservation']['experimentalProbePassed']is False
subprocess.run(['git','diff','--check'],cwd=R,check=True)
result={'ok':True,'binding':proof['binding']['digest'],'sourceManifestEntries':len(index['files']),'currentDefaultIndexMatchesProofAndNodePythonLogs':True,'documentsAndLinksChecked':True,'oldZIPUnchanged':True,'independentPending':2,'O29_01ObservationRetained':True,'serviceRestartOrRealOCR':0}
(R/'evidence/r30-repair01/final-delivery-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
