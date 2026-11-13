import {esc} from '../app/ui.js';
import {DICTIONARY} from '../domain/model.js';
import {wasCorrected} from '../domain/ocr_review.js';
export function originLabel(r){return `${DICTIONARY[r.code]?.[0]||r.code} ${r.comparator||''}${r.valueLiteral} ${r.unit}`;}
export function originNote(o){
 if(!o.ocrOrigin)return '';
 return `<small class="ocr-origin-note">${wasCorrected(o)?'你修改后保存；识别时为：':'识别时为：'}${esc(originLabel(o.ocrOrigin))}</small>`;
}
// Preserve raw rows and order; never search for a nearby or equal-valued substitute.
export function evidenceIndex(source){
 const index=new Map((source?.ledger?.lines||[]).map(l=>[l.id,l]));
 return ids=>{
  if(!ids.length||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>!index.has(id)))return null;
  return ids.map(id=>index.get(id)).sort((a,b)=>a.order-b.order);
 };
}
export function evidencePolygons(source,lines,width,height){
 if(source?.ledger?.provider!=='tencent-general-accurate'||!source.ledger.mapping?.includes('coordinates=Polygon'))return [];
 if(!lines?.length||!(width>0&&height>0))return [];
 const valid=lines.every(l=>(l.page===null||l.page===1)&&l.coordinates?.length>=3&&l.coordinates.length<=16&&l.coordinates.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=width&&p.y<=height)&&Math.max(...l.coordinates.map(p=>p.x))>Math.min(...l.coordinates.map(p=>p.x))&&Math.max(...l.coordinates.map(p=>p.y))>Math.min(...l.coordinates.map(p=>p.y)));
 return valid?lines.map(l=>l.coordinates.map(p=>`${p.x},${p.y}`).join(' ')):[];
}
