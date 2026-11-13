import {validateReport} from './report/contract.js';
import {validateOrigin} from './ocr_review.js';
import {FLAGS,knownUnit} from './state/catalog.js';
export {candidates} from './state/candidates.js';
export const SCHEMA = 'ptds-browser/1';
export const DICTIONARY_VERSION = 'r12/1';
export const SCHEMA_V2='ptds-browser/2', DICTIONARY_V2='sjia-h5/2';
export const SCHEMA_V3='ptds-browser/3', DICTIONARY_V3='cbc-report/1';
export {DICTIONARY,LEGACY_DICTIONARY} from './report/fields.js';
import {DICTIONARY,LEGACY_DICTIONARY} from './report/fields.js';
export const LIMITS = Object.freeze({imageBytes:8*1024*1024, imagePixels:24000000, records:20000, drafts:100, backupBytes:128*1024*1024, page:50});
export function need(ok, code) { if (!ok) throw new Error(code); }
export function text(v,n=10000) { need(typeof v==='string'&&v.length<=n&&!/[\x00-\x08\x0b-\x1f]/.test(v),'INVALID_TEXT');return v; }
export function id(v) { need(typeof v==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(v),'INVALID_ID');return v; }
export const uid=()=>crypto.randomUUID();
export function canonical(v) {
 if(v===null||typeof v!=='object') {const s=JSON.stringify(v);need(s!==undefined&&!(typeof v==='number'&&!Number.isFinite(v)),'INVALID_JSON');return s;}
 if(Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
 return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
}
export async function hash(bytes) { const b=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join(''); }
export const digest=v=>hash(canonical(v));
export function timezone(z) { text(z,100);need(z.length>0,'TIMEZONE_REQUIRED');try{new Intl.DateTimeFormat('en',{timeZone:z}).format();}catch{throw new Error('INVALID_TIMEZONE');}return z; }
export function today(z, now=new Date()) {timezone(z);const p=new Intl.DateTimeFormat('en-CA',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');}
export function schemaForPayload(p){return p?.formatVersion===3?SCHEMA_V3:p?.formatVersion===2?SCHEMA_V2:SCHEMA;}
export function dictionaryForSchema(s){need([SCHEMA,SCHEMA_V2,SCHEMA_V3].includes(s),'UNSUPPORTED_SCHEMA');return s===SCHEMA?DICTIONARY_VERSION:s===SCHEMA_V3?DICTIONARY_V3:DICTIONARY_V2;}
export function validatePayload(p,schema=schemaForPayload(p)) {
 need(p&&typeof p==='object','INVALID_PAYLOAD');dictionaryForSchema(schema);const v3=schema===SCHEMA_V3,v2=schema!==SCHEMA;need(v2?p.formatVersion===(v3?3:2):p.formatVersion===undefined,'PAYLOAD_SCHEMA_MISMATCH');
 need(v3||p.reportRows===undefined&&p.manualObservations===undefined,'V3_FIELDS_REQUIRE_V3');if(v3)validateReport(p,{need,text,id,canonical});const dict=v2?DICTIONARY:LEGACY_DICTIONARY;timezone(p.instanceTimezone);
 const d=p.clinicalDate;need(typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number(d.slice(0,4))>=1&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d,'INVALID_DATE');
 need(d<=today(p.instanceTimezone),'FUTURE_DATE');need(['manual','lab'].includes(p.documentKind),'DOCUMENT_KIND_UNSUPPORTED');
 need(['SYNTHETIC','REAL'].includes(p.nature),'NATURE_REQUIRED');need(['MANUAL','OCR'].includes(p.sourceKind),'SOURCE_KIND_INVALID');need(p.trustTier==='USER_REVIEWED','TRUST_TIER_INVALID');
 text(p.note);need(Array.isArray(p.observations)&&p.observations.length<=100,'INVALID_OBSERVATIONS');
 for(const o of p.observations){need(Object.hasOwn(dict,o.code),'UNKNOWN_METRIC');text(o.displayName,100);text(o.unit,40);need(o.unit.trim(),'UNIT_REQUIRED');need(o.context===dict[o.code][2],'CONTEXT_MISMATCH');need(typeof o.valueLiteral==='string'&&/^[-+]?\d{1,8}(?:\.\d{1,8})?$/.test(o.valueLiteral),'INVALID_VALUE');need(Array.isArray(o.sourceLineIds)&&o.sourceLineIds.length<=100,'INVALID_SOURCE_LINES');o.sourceLineIds.forEach(id);validateOrigin(o,dict);need(v2||o.ocrOrigin===undefined,'V2_FIELDS_REQUIRE_V2');}
 if(!v2)need(p.clinicalFlags===undefined&&p.observedAt===undefined&&p.observations.every(o=>o.comparator==null),'V2_FIELDS_REQUIRE_V2');
 if(v2){
  need(p.clinicalFlags&&typeof p.clinicalFlags==='object'&&!Array.isArray(p.clinicalFlags),'CLINICAL_FLAGS_REQUIRED');
  for(const [k,v]of Object.entries(p.clinicalFlags))need(Object.hasOwn(FLAGS,k)&&(v===true||v===false||v===null),'CLINICAL_FLAG_INVALID');
  for(const o of p.observations){need([null,'<','<=','>','>='].includes(o.comparator??null),'COMPARATOR_INVALID');need(knownUnit(o.code,o.unit),'UNIT_UNSUPPORTED');}
  need(p.observedAt===null||typeof p.observedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(p.observedAt)&&Number.isFinite(Date.parse(p.observedAt))&&Number(p.observedAt.slice(11,13))<24&&Number(p.observedAt.slice(14,16))<60&&Number(p.observedAt.slice(17,19))<60&&new Date(p.observedAt.slice(0,10)).toISOString().slice(0,10)===p.observedAt.slice(0,10)&&today(p.instanceTimezone,new Date(p.observedAt))===d&&Date.parse(p.observedAt)<=Date.now(),'OBSERVED_AT_INVALID');
 }
 need(p.observations.length||v3&&p.reportRows.length||p.note.trim()||v2&&Object.values(p.clinicalFlags).some(v=>v!==null),'EMPTY_REVIEW');return p;
}
export function validateLedger(ledger) {
 need(ledger&&ledger.version==='ocr-ledger/1'&&Array.isArray(ledger.lines)&&ledger.lines.length<=20000,'INVALID_LEDGER');
 text(ledger.rawText,2000000);const ids=new Set();
 ledger.lines.forEach((l,i)=>{id(l.id);need(!ids.has(l.id)&&l.order===i,'LEDGER_ORDER');ids.add(l.id);text(l.text,10000);need(l.page===null||Number.isInteger(l.page)&&l.page>=1,'INVALID_PAGE');need(l.confidence===null||Number.isFinite(l.confidence)&&l.confidence>=0&&l.confidence<=1,'INVALID_CONFIDENCE');need(l.coordinates===null||Array.isArray(l.coordinates)&&l.coordinates.length<=16&&l.coordinates.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'INVALID_COORDINATES');});
 return ledger;
}
export function validateSource(s) { id(s.id);text(s.name,300);need(['image/png','image/jpeg'].includes(s.type),'UNSUPPORTED_MEDIA');need(s.blob instanceof Blob&&s.blob.size>0&&s.blob.size<=LIMITS.imageBytes,'IMAGE_SIZE');need(/^[a-f0-9]{64}$/.test(s.hash),'SOURCE_HASH');if(s.ledger)validateLedger(s.ledger);return s; }
export function reviewContent(r) {const schema=r.schema||SCHEMA,dictionary=r.dictionary||DICTIONARY_VERSION;need(dictionary===dictionaryForSchema(schema),'DICTIONARY_SCHEMA_MISMATCH');return {schema,dictionary,payload:r.payload,source:r.sourceBinding};}
