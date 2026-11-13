import {reportRows} from './report/rows.js';
import {validateReportBinding} from './report/contract.js';
import {SCHEMA,DICTIONARY_VERSION,schemaForPayload,dictionaryForSchema,uid,digest,hash,canonical,need,id,validatePayload,validateSource,reviewContent,LIMITS} from './model.js';
import {validateOriginBinding} from './ocr_review.js';
import {candidates} from './state/candidates.js';
export class RecordService {
 constructor(store){this.store=store;}
 async source(file,ledger=null){
  need(file.size<=LIMITS.imageBytes,'IMAGE_SIZE');
  const source={id:uid(),name:file.name||'image',type:file.type,hash:await hash(await file.arrayBuffer()),blob:file,ledger,transformation:null};
  validateSource(source);source.bindingDigest=await digest({hash:source.hash,ledger:source.ledger,transformation:null,name:source.name,type:source.type});return source;
 }
 async stage(payload,source=null,previous=null){
  payload=structuredClone(payload);const schema=schemaForPayload(payload),dictionary=dictionaryForSchema(schema);validatePayload(payload,schema);if(source){validateSource(source);need(await hash(await source.blob.arrayBuffer())===source.hash,'SOURCE_HASH');need(await digest({hash:source.hash,ledger:source.ledger,transformation:source.transformation,name:source.name,type:source.type})===source.bindingDigest,'SOURCE_BINDING');}
  if(payload.sourceKind==='OCR')need(source?.ledger,'OCR_SOURCE_REQUIRED');
  const lineIds=new Set(source?.ledger?.lines.map(l=>l.id)||[]);
  payload.observations.forEach(o=>o.sourceLineIds.forEach(l=>need(lineIds.has(l),'SOURCE_LINE_MISSING')));
  if(payload.formatVersion===3)validateReportBinding(payload,source,reportRows(source.ledger),{need,canonical});
  if(payload.observations.some(o=>o.ocrOrigin!==undefined))validateOriginBinding(payload,source,source?.ledger?candidates(source.ledger):[]);
  const r={schema,dictionary,id:previous?.id||uid(),revision:(previous?.revision||0)+1,payload:structuredClone(payload),sourceBinding:source?{id:source.id,hash:source.hash,bindingDigest:source.bindingDigest}:null,confirmation:null,requestId:uid(),updatedAt:new Date().toISOString()};
  r.digest=await digest(reviewContent(r));return this.store.stage(r,source,previous?.revision||0);
 }
 async confirm(review,explicit){
  need(explicit===true,'CONFIRMATION_REQUIRED');
  need(await digest(reviewContent(review))===review.digest,'REVIEW_INTEGRITY');
  return this.store.confirm(review.id,review.revision,review.digest,{revision:review.revision,digest:review.digest,at:new Date().toISOString(),kind:'CLIENT_USER_ACTION_NOT_IDENTITY_PROOF'});
 }
 async save(review,requestId=review.requestId){
  id(requestId);validatePayload(review.payload,review.schema||SCHEMA);need(await digest(reviewContent(review))===review.digest,'REVIEW_INTEGRITY');
  const eventId=uid(),at=new Date().toISOString();
  const event={id:eventId,schema:review.schema||SCHEMA,dictionary:review.dictionary||DICTIONARY_VERSION,revision:1,payload:review.payload,sourceBinding:review.sourceBinding,digest:review.digest,requestId,createdAt:at};
  const receipt={id:requestId,eventId,digest:review.digest,at,scope:'THIS_BROWSER_LOCAL_ONLY',deleted:false};
  return this.store.commit(review,requestId,event,receipt);
 }
}
