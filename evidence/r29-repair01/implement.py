from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[2];C=ROOT/'runtime/r29-candidate01';plan=json.loads((Path(__file__).resolve().parent/'plan.json').read_text());lock=plan['frozenParser']
for rel,expected in lock['files'].items():
 b=subprocess.check_output(['git','show',lock['commit']+':'+rel],cwd=ROOT);assert hashlib.sha256(b).hexdigest()==expected['sha256']and len(b)==expected['bytes'];p=C/'web/compat/r27'/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
(C/'web/compat/r27/LOCK.json').write_text(json.dumps(lock,indent=2)+'\n')
(C/'web/domain/report/restore_binding.js').write_text('''// Restore-only compatibility: an untagged backup must match one complete,
// exact interpretation. Never used by stage/save or row-by-row fallback.
import {reportRows} from './rows.js';
import {validateReportBinding} from './contract.js';
export async function validateRestoredReportBinding(payload,source,helpers){
 try{validateReportBinding(payload,source,reportRows(source.ledger),helpers);return 'current';}
 catch(error){if(error.message!=='REPORT_ORIGIN_MISMATCH')throw error;}
 const historical=await import('../../compat/r27/web/domain/report/rows.js');
 validateReportBinding(payload,source,historical.reportRows(source.ledger),helpers);
 return 'cbc-report/r27-exact-source/1';
}
''')
p=C/'web/storage/backup.js';s=p.read_text();s=s.replace("import {reportRows} from '../domain/report/rows.js';\nimport {validateReportBinding} from '../domain/report/contract.js';","import {validateRestoredReportBinding} from '../domain/report/restore_binding.js';")
s=s.replace('let bytes=0,done=0;','const originPolicies={};\n let bytes=0,done=0;')
s=s.replace('validateReportBinding(e.payload,s,reportRows(s.ledger),{need,canonical});','const policy=await validateRestoredReportBinding(e.payload,s,{need,canonical});originPolicies[policy]=(originPolicies[policy]||0)+1;')
s=s.replace('bytes,duplicates,conflicts,exportedAt:data.exportedAt','bytes,duplicates,conflicts,exportedAt:data.exportedAt,originPolicies');p.write_text(s)
