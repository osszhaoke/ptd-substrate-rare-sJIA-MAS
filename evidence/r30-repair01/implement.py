from pathlib import Path
import json
R=Path(__file__).resolve().parents[2];C=R/'runtime/r30-candidate01';p=C/'web/domain/service.js';s=p.read_text();start=s.index('if(source){validateSource(source)');end=s.index('\n  const r={schema',start);validation=s[start:end]
# Move exact existing current-policy checks to one shared owner.
(C/'web/domain/write_binding.js').write_text("// Current new-write policy only. Hashing/parsing runs before the IDB commit transaction.\nimport {reportUnitNeedsReview} from './report/table_fields.js';\nimport {reportRows} from './report/rows.js';\nimport {validateReportBinding} from './report/contract.js';\nimport {digest,hash,canonical,need,validateSource} from './model.js';\nimport {validateOriginBinding} from './ocr_review.js';\nimport {candidates} from './state/candidates.js';\nexport async function validateWriteBinding(payload,source){\n "+validation+"\n}\n")
s=s[:start]+'await validateWriteBinding(payload,source);'+s[end:]
for line in ["import {reportUnitNeedsReview} from './report/table_fields.js';\n","import {reportRows} from './report/rows.js';\n","import {validateReportBinding} from './report/contract.js';\n","import {validateOriginBinding} from './ocr_review.js';\n","import {candidates} from './state/candidates.js';\n"]:s=s.replace(line,'')
s="import {validateWriteBinding} from './write_binding.js';\n"+s
old="  if(review.payload.formatVersion===3)need(!review.payload.reportRows.some(reportUnitNeedsReview),'REPORT_UNIT_INCOMPLETE');"
new="""  // A prior receipt belongs to an already committed event; commit remains authoritative
  // for idempotency/conflict/tombstone checks. Only first writes use current policy.
  const needsBinding=review.sourceBinding||review.payload.sourceKind==='OCR'||review.payload.formatVersion===3||review.payload.observations.some(o=>o.ocrOrigin!==undefined);
  if(needsBinding&&!await this.store.get('receipts',requestId)){
   const source=review.sourceBinding?await this.store.get('sources',review.sourceBinding.id):null;
   if(review.sourceBinding)need(source&&source.id===review.sourceBinding.id&&source.hash===review.sourceBinding.hash&&source.bindingDigest===review.sourceBinding.bindingDigest,'SOURCE_MISSING');
   await validateWriteBinding(review.payload,source);
  }"""
assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
p=C/'web/app/ui.js';s=p.read_text();needle="CONFIRMATION_REQUIRED:'请先核对并明确确认。',";assert s.count(needle)==1;s=s.replace(needle,"REPORT_ORIGIN_MISMATCH:'这份录入需要重新核对。请点“返回修改”，对照原图移除不该录入的项目，再核对保存。',REPORT_UNIT_INCOMPLETE:'单位没识全，尚未保存。请点“返回修改”，对照原图补全单位后重新核对。',"+needle);p.write_text(s)
p=C/'tests/report_contract.test.mjs';s=p.read_text();s=s.replace("stage:async r=>(calls.push('stage'),r),commit:async()=>calls.push('commit')","stage:async r=>(calls.push('stage'),r),get:async()=>null,commit:async()=>calls.push('commit')");p.write_text(s)
p=C/'tests/test_report_rows_runner.py';s=p.read_text();needle='  historical=historical_cases(out,server,config)';assert needle in s;s=s.replace(needle,needle+"\n  from tests.report_upgrade import run_upgrade\n  upgrade=run_upgrade(out/'upgrade',config,response,Opener)\n  config.origin=f'http://127.0.0.1:{server.server_port}'")
s=s.replace("'historical':historical,","'historical':historical,'upgrade':upgrade,");p.write_text(s)
p=C/'tools/test_plan.json';d=json.loads(p.read_text());d['browserWhitelist'].append('browser.report-upgrade.js');d['r30SaveBoundary']={'findings':['R29-A01','R29-A02'],'mandatoryBrowserEntry':'report-rows-wire -> tests/report_upgrade.py + browser.report-upgrade.js','fixture':'tests/fixtures/r27-draft-web.tgz with exact SHA/path lock','controls':['actual R27 UI stage -> current UI confirm/reject -> newPID no event/receipt and original draft/source preserved','return modify, explicit correction and restage ->27save -> newPID','incomplete unit rejected; correction explicit','valid old staged27 saves; receipt idempotency/conflict','remove save binding killed by UPGRADE_OLD_DRAFT_SAVED'],'unitEntry':'tests/report_contract.test.mjs','acceptanceMetadata':'mechanically check currentProof/verificationEvidence/binding/top counts with actual current proof/requiredChecks before delivery','original61AndThresholdsUnchanged':True};p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
