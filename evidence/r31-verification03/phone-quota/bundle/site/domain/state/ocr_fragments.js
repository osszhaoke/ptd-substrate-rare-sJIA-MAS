import {tableRows} from './ocr_tables.js';
// Produce review-only views of existing fragments; never rewrite the evidence ledger.
const VALUE=/^(?:<=|>=|<|>|≤|≥)?\s*[-+]?\d{1,8}(?:\.\d{1,8})?$/;
const RANGE=/^(?:(?:<=|>=|<|>|≤|≥)\s*[-+]?\d+(?:\.\d+)?|[-+]?\d+(?:\.\d+)?\s*[-–—~～]\s*[-+]?\d+(?:\.\d+)?)$/;
const clean=line=>line.text.trim();
const names=new Set(['项目','检查项目','检验项目']);
const results=new Set(['结果','检验结果','检测结果']);
const references=new Set(['参考范围','参考值','正常范围']);

function box(line){
 if(!Array.isArray(line.coordinates)||line.coordinates.length<3)return null;
 const xs=line.coordinates.map(p=>p.x),ys=line.coordinates.map(p=>p.y);
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 return right>left&&bottom>top?{line,left,right,top,bottom,cy:(top+bottom)/2}:null;
}
function row(parts,isName){
 if(![3,4].includes(parts.length))return null;
 const text=parts.map(clean);
 if(!isName(text[0])||!VALUE.test(text[1])||!text[2]||/\s/.test(text[2]))return null;
 if(parts.length===4&&!RANGE.test(text[3]))return null;
 if(new Set(parts.map(p=>p.page)).size!==1)return null;
 return {text:text.slice(0,3).join(' '),sourceLineIds:parts.slice(0,3).map(p=>p.id),order:Math.min(...parts.map(p=>p.order))};
}

export function fragmentRows(ledger,isName,resolveName=()=>null){
 const out=[],seen=new Set();
 const add=parts=>{const result=row(parts,isName);if(!result)return;const key=result.sourceLineIds.join('|');if(!seen.has(key)){seen.add(key);out.push(result);}};
 // Spatial evidence takes priority. Never join partial geometry via text order.
 const pages=new Map();
 for(const line of ledger.lines){const b=box(line);if(!b)continue;const page=line.page;const list=pages.get(page)||[];list.push(b);pages.set(page,list);}
 for(const boxes of pages.values()){
  for(const result of tableRows(boxes,resolveName)){const key=result.sourceLineIds.join('|');if(!seen.has(key)){seen.add(key);out.push(result);}}
  // An explicit bilingual table must not fall back to a whole-page row join.
  if(boxes.some(b=>clean(b.line)==='中文名称'))continue;
  boxes.sort((a,b)=>a.cy-b.cy||a.left-b.left);let group=[];
  const flush=()=>{
   if(![3,4].includes(group.length))return;
   const sorted=group.slice().sort((a,b)=>a.left-b.left);
   const overlap=Math.min(...sorted.map(b=>b.bottom))-Math.max(...sorted.map(b=>b.top));
   if(overlap<Math.min(...sorted.map(b=>b.bottom-b.top))*0.5)return;
   if(sorted.some((b,i)=>i&&b.left<sorted[i-1].right))return;
   add(sorted.map(b=>b.line));
  };
  for(const b of boxes){
   const anchor=group[0];
   if(anchor&&Math.abs(b.cy-anchor.cy)>Math.min(b.bottom-b.top,anchor.bottom-anchor.top)*0.5){flush();group=[];}
   group.push(b);
  }
  flush();
 }
 // With no positions, only accept a strict, explicitly headed result/unit table.
 // Stop at the first invalid row instead of sliding through reference values.
 const lines=ledger.lines;
 for(let i=0;i<lines.length-2;i++){
  if(!names.has(clean(lines[i]))||!results.has(clean(lines[i+1]))||clean(lines[i+2])!=='单位')continue;
  const width=references.has(clean(lines[i+3]||{text:''}))?4:3;
  let j=i+width;
  for(;j+width<=lines.length;j+=width){
   const parts=lines.slice(j,j+width);
   if(parts.some(p=>p.coordinates!==null)||!row(parts,isName))break;
   add(parts);
  }
  i=j-1;
 }
 return out.sort((a,b)=>a.order-b.order);
}
