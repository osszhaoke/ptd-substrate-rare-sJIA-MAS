// Current new-write policy only. Hashing/parsing runs before the IDB commit transaction.
import {reportUnitNeedsReview} from './report/table_fields.js';
import {reportRows} from './report/rows.js';
import {validateReportBinding} from './report/contract.js';
import {digest,hash,canonical,need,validateSource} from './model.js';
import {validateOriginBinding} from './ocr_review.js';
import {candidates} from './state/candidates.js';
export async function validateWriteBinding(payload,source){
 if(source){validateSource(source);need(await hash(await source.blob.arrayBuffer())===source.hash,'SOURCE_HASH');need(await digest({hash:source.hash,ledger:source.ledger,transformation:source.transformation,name:source.name,type:source.type})===source.bindingDigest,'SOURCE_BINDING');}
  if(payload.sourceKind==='OCR')need(source?.ledger,'OCR_SOURCE_REQUIRED');
  const lineIds=new Set(source?.ledger?.lines.map(l=>l.id)||[]);
  payload.observations.forEach(o=>o.sourceLineIds.forEach(l=>need(lineIds.has(l),'SOURCE_LINE_MISSING')));
  if(payload.formatVersion===3)need(!payload.reportRows.some(reportUnitNeedsReview),'REPORT_UNIT_INCOMPLETE');
  if(payload.formatVersion===3)validateReportBinding(payload,source,reportRows(source.ledger),{need,canonical});
  if(payload.observations.some(o=>o.ocrOrigin!==undefined))validateOriginBinding(payload,source,source?.ledger?candidates(source.ledger):[]);
}
