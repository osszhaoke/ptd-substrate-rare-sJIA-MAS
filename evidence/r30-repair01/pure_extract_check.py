from pathlib import Path
import hashlib,json,shutil,subprocess
R=Path(__file__).resolve().parents[2];C=R/'runtime/r30-candidate01';out=Path(__file__).resolve().parent;P=R/'runtime/r30-pure-extract01';P.mkdir(exist_ok=False)
proof=json.loads((C/'evidence/r30-verification01/result.json').read_text())
for rel in proof['binding']['files']:
 if not rel.startswith(('web/','tests/'))and rel!='package.json':continue
 p=P/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(C/rel,p)
s=(R/'web/domain/service.js').read_text();start=s.index('if(source){validateSource(source)');end=s.index('\n  const r={schema',start);fragment=s[start:end];helper=(C/'web/domain/write_binding.js').read_text();assert fragment in helper
s=s[:start]+'await validateWriteBinding(payload,source);'+s[end:]
for line in ["import {reportRows} from './report/rows.js';\n","import {validateReportBinding} from './report/contract.js';\n","import {validateOriginBinding} from './ocr_review.js';\n","import {candidates} from './state/candidates.js';\n"]:s=s.replace(line,'')
s="import {validateWriteBinding} from './write_binding.js';\n"+s;(P/'web/domain/service.js').write_text(s)
with(out/'pure-extract-stage-tests.log').open('w')as log:p=subprocess.run(['node','--test','--test-name-pattern','^(stage reparses|raw report schema|pending original|R27-A02)','tests/report_contract.test.mjs'],cwd=P,stdout=log,stderr=subprocess.STDOUT)
assert p.returncode==0
sha=lambda b:hashlib.sha256(b).hexdigest();(out/'pure-extract-result.json').write_text(json.dumps({'ok':True,'scope':'exact original stage validation moved, save semantics still R29; not an adopted product version or full gate','fragmentSha256':sha(fragment.encode()),'fragmentBytes':len(fragment.encode()),'helperContainsExactOriginalFragment':True,'pureServiceSha256':sha(s.encode()),'pureHelperSha256':sha(helper.encode()),'servicePath':str(P/'web/domain/service.js'),'helperPath':str(P/'web/domain/write_binding.js'),'oldStageTests':4},indent=2)+'\n');print(json.dumps({'ok':True,'pureStageFragmentUnchanged':True,'oldStageTests':4}))
