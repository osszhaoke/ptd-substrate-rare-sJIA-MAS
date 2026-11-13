import {reportBoxes} from './layout.js';
import {generalTableRows,hasReportHeaders,metadataName,reportDataBoxes} from './tables.js';
import {validateLedger} from '../model.js';
import {candidates} from '../state/candidates.js';
import {ocrOrigin} from '../ocr_review.js';
import {tableRows} from '../state/ocr_tables.js';
import {CBC_NAMES,NAME_HEADERS,splitResult,splitUnit,metricCode,reportObservation} from './fields.js';
const range=/^(?:(?:<=|>=|<|>|≤|≥)\s*[-+]?\d+(?:\.\d+)?|[-+]?\d+(?:\.\d+)?\s*[-–—~～]\s*[-+]?\d+(?:\.\d+)?)$/;
const heads=new Set(['项目','检查项目','检验项目']),resultHeads=new Set(['结果','检验结果','检测结果']),refs=new Set(['参考范围','参考值','正常范围']);
const clean=l=>l.text.trim();
function cellsRow(parts){
 if(![3,4].includes(parts.length)||new Set(parts.map(p=>p.page)).size!==1)return null;
 const [name,result,unit,referenceRange='']=parts.map(clean),value=splitResult(result);
 if(!name||name.length>100||!/[A-Za-z\u4e00-\u9fff]/.test(name)||!value||!unit||unit.length>40||/\s/.test(unit)||range.test(unit)||(referenceRange&&!range.test(referenceRange)))return null;
 const u=splitUnit(unit);if(value.abnormalFlag&&u.abnormalFlag&&value.abnormalFlag!==u.abnormalFlag)return null;return {name,...value,unit:u.unit,abnormalFlag:value.abnormalFlag||u.abnormalFlag,referenceRange,sourceLineIds:parts.map(p=>p.id),order:Math.min(...parts.map(p=>p.order))};
}
export function reportRows(ledger){
 validateLedger(ledger);const out=[],seen=new Set(),add=r=>{
  if(!r||!r.valueLiteral&&metadataName(r.name)||out.length>=100)return;const key=r.sourceLineIds.join('|');if(seen.has(key))return;seen.add(key);
  const {order,...value}=r;out.push({...value,origin:structuredClone(value),checked:false,order});
 };
 const pages=new Map();for(const b of reportBoxes(ledger)){const list=pages.get(b.line.page)||[];list.push(b);pages.set(b.line.page,list);}
 for(const pageBoxes of pages.values()){
  if(out.length>=100)break;
  const boxes=reportDataBoxes(pageBoxes);
  for(const r of tableRows(boxes,()=>null,{report:true}))add(r);
  for(const r of generalTableRows(boxes,new Set(out.flatMap(r=>r.sourceLineIds))))add(r);
  // Explicit multi-column tables never fall back to whole-page joins.
  if(hasReportHeaders(boxes))continue;
  boxes.sort((a,b)=>a.cy-b.cy||a.left-b.left);let group=[];
  const flush=()=>{if(![3,4].includes(group.length))return;const sorted=group.slice().sort((a,b)=>a.left-b.left),overlap=Math.min(...sorted.map(b=>b.bottom))-Math.max(...sorted.map(b=>b.top));
   if(overlap<Math.min(...sorted.map(b=>b.bottom-b.top))*.5||sorted.some((b,i)=>i&&b.left<sorted[i-1].right))return;add(cellsRow(sorted.map(b=>b.line)));};
  for(const b of boxes){const a=group[0];if(a&&Math.abs(b.cy-a.cy)>Math.min(b.bottom-b.top,a.bottom-a.top)*.5){flush();group=[];}group.push(b);}flush();
 }
 const lines=ledger.lines;
 for(let i=0;i<lines.length-2;i++){
  if(!heads.has(clean(lines[i]))||!resultHeads.has(clean(lines[i+1]))||clean(lines[i+2])!=='单位')continue;
  const width=refs.has(clean(lines[i+3]||{text:''}))?4:3;let j=i+width;
  for(;j+width<=lines.length;j+=width){const parts=lines.slice(j,j+width);if(parts.some(p=>p.coordinates!==null))break;const r=cellsRow(parts);if(!r)break;add(r);}i=j-1;
 }
 // Standalone lines require an exact known metric or common CBC name, not arbitrary prose.
 for(const line of lines){
  const m=clean(line).match(/^(.+?)\s*[:：]?\s+((?:<=|>=|<|>|≤|≥)?\s*[-+]?\d{1,8}(?:\.\d{1,8})?\s*[↑↓HLhl]?)\s+([^\s,，;；]+)$/);
  if(!m||!metricCode(m[1])&&!CBC_NAMES.some(n=>n.toLowerCase()===m[1].trim().toLowerCase()))continue;
  if(out.some(r=>r.sourceLineIds.includes(line.id)))continue;add(cellsRow([{...line,text:m[1]},{...line,text:m[2]},{...line,text:m[3]}].map((l,i)=>({...l,id:line.id}))));
 }
 // Preserve the prior source snapshot for existing candidates, including exact literal/IDs.
 const legacy=candidates(ledger);
 // Retain every previously accepted inline spelling (including CRP:4.2 or Chinese names abutting digits).
 for(const o of legacy){if(out.some(r=>o.sourceLineIds.every(id=>r.sourceLineIds.includes(id))))continue;
  add({name:o.displayName,valueLiteral:o.valueLiteral,unit:o.unit,comparator:o.comparator??null,referenceRange:'',abnormalFlag:'',sourceLineIds:[...o.sourceLineIds],order:ledger.lines.find(l=>l.id===o.sourceLineIds[0]).order});
 }

 for(const r of out){r.sourceLineIds=[...new Set(r.sourceLineIds)];r.origin.sourceLineIds=[...r.sourceLineIds];const p=reportObservation(r);
  const old=p&&legacy.find(o=>o.code===p.code&&o.valueLiteral===p.valueLiteral&&o.unit===p.unit&&(o.comparator??null)===(p.comparator??null)&&o.sourceLineIds.every(id=>r.sourceLineIds.includes(id)));
  if(old)r.ocrOrigin=ocrOrigin(old);
 }
 return out.sort((a,b)=>a.order-b.order).map(({order,...r})=>r);
}
export function reportCoverage(ledger,rows){const used=new Set(rows.flatMap(r=>r.sourceLineIds));return {items:rows.length,unpairedFragments:ledger.lines.filter(l=>!used.has(l.id)).length,pendingRows:rows.filter(r=>!r.valueLiteral.trim()).length,capped:rows.length===100};}
