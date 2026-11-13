// Optional v2 provenance. The original snapshot is immutable evidence, not a user action log.
const fields=['version','code','valueLiteral','unit','comparator','sourceLineIds'];
const fail=(ok)=>{if(!ok)throw new Error('OCR_ORIGIN_INVALID');};
export function ocrOrigin(o){
 return {version:'ocr-review/1',code:o.code,valueLiteral:o.valueLiteral,unit:o.unit,comparator:o.comparator??null,sourceLineIds:[...o.sourceLineIds]};
}
export function validateOrigin(o,dictionary){
 const r=o.ocrOrigin;if(r===undefined)return;
 fail(r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).length===fields.length&&fields.every(k=>Object.hasOwn(r,k)));
 fail(r.version==='ocr-review/1'&&Object.hasOwn(dictionary,r.code));
 fail(typeof r.valueLiteral==='string'&&/^[-+]?\d{1,8}(?:\.\d{1,8})?$/.test(r.valueLiteral));
 fail(typeof r.unit==='string'&&r.unit.length>0&&r.unit.length<=40&&!/[\x00-\x1f]/.test(r.unit));
 fail([null,'<','<=','>','>='].includes(r.comparator));
 fail(Array.isArray(r.sourceLineIds)&&r.sourceLineIds.length>0&&r.sourceLineIds.length<=100&&new Set(r.sourceLineIds).size===r.sourceLineIds.length);
 fail(JSON.stringify(r.sourceLineIds)===JSON.stringify(o.sourceLineIds));
}
export function originKey(r){return JSON.stringify([r.code,r.valueLiteral,r.unit,r.comparator??null,r.sourceLineIds]);}
export function validateOriginBinding(payload,source,parsed){
 const originals=payload.observations.filter(o=>o.ocrOrigin!==undefined);if(!originals.length)return;
 if(payload.sourceKind!=='OCR'||!source?.ledger)throw new Error('OCR_ORIGIN_SOURCE');
 const keys=new Set(parsed.map(originKey));
 for(const o of originals)if(!keys.has(originKey(o.ocrOrigin)))throw new Error('OCR_ORIGIN_MISMATCH');
}
export function wasCorrected(o){
 const r=o.ocrOrigin;return !!r&&['code','valueLiteral','unit','comparator'].some(k=>(o[k]??null)!==(r[k]??null));
}
