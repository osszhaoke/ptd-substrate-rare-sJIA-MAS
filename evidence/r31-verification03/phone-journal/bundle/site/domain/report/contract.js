import {reportProjection} from './fields.js';
const fields=['name','valueLiteral','unit','comparator','referenceRange','abnormalFlag','sourceLineIds'];
const keys=(o,allowed)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===allowed.length&&allowed.every(k=>Object.hasOwn(o,k));
function validateRow(row,{need,text,id},original=false){
 for(const [k,n]of [['name',100],['valueLiteral',100],['unit',40],['referenceRange',200],['abnormalFlag',10]])text(row[k],n);
 need(row.name.trim()&&(original||row.valueLiteral.trim()),'REPORT_ROW_EMPTY');
 need([null,'<','<=','>','>='].includes(row.comparator),'COMPARATOR_INVALID');
 need(['','↑','↓','H','L'].includes(row.abnormalFlag),'REPORT_FLAG_INVALID');
 need(Array.isArray(row.sourceLineIds)&&row.sourceLineIds.length>0&&row.sourceLineIds.length<=100&&new Set(row.sourceLineIds).size===row.sourceLineIds.length,'REPORT_SOURCE_LINES');row.sourceLineIds.forEach(id);
}
export function validateReport(p,helpers){
 const {need,canonical}=helpers;
 need(p.documentKind==='lab'&&p.sourceKind==='OCR','REPORT_SOURCE_REQUIRED');
 need(Array.isArray(p.reportRows)&&p.reportRows.length>0&&p.reportRows.length<=100&&Array.isArray(p.manualObservations)&&p.manualObservations.length+p.reportRows.length<=100,'REPORT_LIMIT');
 for(const r of p.reportRows){need(keys(r,[...fields,'origin','checked',...(Object.hasOwn(r,'ocrOrigin')?['ocrOrigin']:[])]),'REPORT_FIELDS');validateRow(r,helpers);need(r.checked===true,'REPORT_REVIEW_REQUIRED');need(keys(r.origin,fields),'REPORT_ORIGIN_INVALID');validateRow(r.origin,helpers,true);need(canonical(r.sourceLineIds)===canonical(r.origin.sourceLineIds),'REPORT_ORIGIN_INVALID');}
 need(canonical(p.observations)===canonical([...reportProjection(p.reportRows),...p.manualObservations]),'REPORT_PROJECTION_MISMATCH');
}
export function validateReportBinding(p,source,parsed,{need,canonical}){
 if(p.formatVersion!==3)return;
 need(source?.ledger,'REPORT_SOURCE_REQUIRED');const originals=new Map();
 const key=r=>canonical({origin:r.origin,ocrOrigin:r.ocrOrigin||null});
 for(const r of parsed){const k=key(r);originals.set(k,(originals.get(k)||0)+1);}
 const ids=new Set(source.ledger.lines.map(l=>l.id));
 for(const r of p.reportRows){need(r.sourceLineIds.every(id=>ids.has(id)),'SOURCE_LINE_MISSING');const k=key(r),n=originals.get(k)||0;need(n>0,'REPORT_ORIGIN_MISMATCH');originals.set(k,n-1);}
}
