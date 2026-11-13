import {NAME_HEADERS,splitResult,splitUnit} from '../report/fields.js';
// Read-only projection of explicitly headed spatial tables. Evidence is never rewritten.
const VALUE=/^(?:<=|>=|<|>|≤|≥)?\s*[-+]?\d{1,8}(?:\.\d{1,8})?$/;
const overlap=(a,b)=>Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>=Math.max(a.bottom-a.top,b.bottom-b.top)*.5;
const center=b=>(b.left+b.right)/2;
function lower(list,y){let a=0,b=list.length;while(a<b){const m=(a+b)>>>1;if(list[m].cy<y)a=m+1;else b=m;}return a;}
function aligned(list,b){
 const h=b.bottom-b.top,out=[];
 for(let i=lower(list,b.cy-h*1.5);i<list.length&&list[i].cy<=b.cy+h*1.5;i++)if(overlap(list[i],b))out.push(list[i]);
 return out;
}
export function tableRows(boxes,resolveName,{report=false}={}){
 const isName=t=>report?NAME_HEADERS.has(t):t==='中文名称';
 const out=[],nameHeaders=boxes.filter(b=>isName(b.line.text.trim()));
 // Malformed header floods are rejected, never interpreted as data.
 if(nameHeaders.length>32)return out;
 const headers=[];
 for(const name of nameHeaders){
  const cells=boxes.filter(b=>overlap(b,name));
  const following=cells.filter(b=>(b.line.text.trim()==='英文'||isName(b.line.text.trim()))&&b.left>name.right);
  const boundary=following.length?Math.min(...following.map(b=>b.left)):Infinity;
  const one=(text,after)=>{const found=cells.filter(b=>b.line.text.trim()===text&&b.left>after&&b.right<boundary);return found.length===1?found[0]:null;};
  const result=one('结果',name.right),unit=result&&one('单位',result.right),ref=unit&&one('参考范围',unit.right);
  const previous=cells.filter(b=>b.right<name.left).sort((a,b)=>b.right-a.right)[0];
  const en=previous?.line.text.trim()==='英文'?previous:null;
  if(en&&result&&unit&&ref){
   const previousRef=cells.filter(b=>b.line.text.trim()==='参考范围'&&b.right<en.left).sort((a,b)=>b.right-a.right)[0];
   const nextName=cells.filter(b=>(b.line.text.trim()==='英文'||isName(b.line.text.trim()))&&b.left>ref.right).sort((a,b)=>a.left-b.left)[0];
   headers.push({en,name,result,unit,ref,previousRef,nextName});
  }
 }
 headers.sort((a,b)=>a.name.cy-b.name.cy||a.en.left-b.en.left);
 for(const h of headers){
  // Region boundaries also honor neighboring *invalid* tables, never borrow their cells.
  const nameMargin=h.en.left-(h.name.left-h.en.left);
  const left=Math.max(nameMargin,h.previousRef?(3*h.previousRef.right+h.en.left)/4:nameMargin);
  const right=h.nextName?(3*h.ref.right+h.nextName.left)/4:Infinity;
  const next=nameHeaders.filter(x=>x.top>h.name.bottom&&center(x)>left&&center(x)<right).map(x=>x.top);
  const bottom=next.length?Math.min(...next):Infinity;
  const nr=h.result.left-(h.result.left-h.name.right)*.15,ru=(h.result.right+h.unit.left)/2,ur=h.ref.left-(h.ref.left-h.unit.right)*.15;
  const cols=report?[[],[],[],[]]:[[],[],[]],merged=[];
  for(const b of boxes){
   if(b.cy<=Math.max(h.name.bottom,h.unit.bottom)||b.cy>=bottom||center(b)<=left||center(b)>=right)continue;
   // A cell spanning a column boundary is ambiguous; do not move it to either column.
   const limits=[[left,nr],[nr,ru],[ru,ur],...(report?[[ur,right]]:[])];
   if(report&&b.left>=left&&b.left<nr&&b.right>nr&&b.right<=ru&&/[\u4e00-\u9fff]/.test(b.line.text))merged.push(b);
   for(let i=0;i<cols.length;i++)if(b.left>=limits[i][0]&&b.right<=limits[i][1]){cols[i].push(b);break;}
  }
  cols.forEach(c=>c.sort((a,b)=>a.cy-b.cy||a.left-b.left));
  for(const value of cols[1]){
   if(!(report?splitResult(value.line.text.trim()):VALUE.test(value.line.text.trim()))||aligned(cols[1],value).length!==1)continue;
   const names=aligned(cols[0],value).sort((a,b)=>a.left-b.left),units=aligned(cols[2],value);
   if(!names.length||units.length!==1||names.some((b,i)=>i&&b.left<names[i-1].right))continue;
   const name=names.map(b=>b.line.text).join(' '),label=report?name:resolveName(name),unit=units[0].line.text.trim();
   if(!label||!unit||/\s/.test(unit))continue;
   let reference=report?aligned(cols[3],value).sort((a,b)=>a.left-b.left):[];
   // An ambiguous reference range stays in raw text; it must not discard a reliable result.
   if(reference.some((b,i)=>i&&b.left<reference[i-1].right))reference=[];
   const parts=[...names,value,units[0],...reference],sourceLineIds=parts.map(b=>b.line.id),order=Math.min(...parts.map(b=>b.line.order));
   const parsed=splitResult(value.line.text.trim()),u=splitUnit(unit);
   if(report&&parsed.abnormalFlag&&u.abnormalFlag&&parsed.abnormalFlag!==u.abnormalFlag)continue;
   out.push(report?{name,...parsed,unit:u.unit,abnormalFlag:parsed.abnormalFlag||u.abnormalFlag,referenceRange:reference.map(b=>b.line.text.trim()).join(''),sourceLineIds,order}:{text:label+' '+value.line.text.trim()+' '+unit,sourceLineIds,order});
   if(out.length===100)return out;
  }
  // OCR sometimes merges a name and its result across the column boundary.
  // Retain the combined text and leave the value empty for actual user review; never split trailing digits.
  if(report)for(const value of merged){
   const unitCells=aligned(cols[2],value),other=aligned(merged,value);if(unitCells.length!==1||other.length!==1||aligned(cols[1],value).length)continue;
   const names=aligned(cols[0],value).filter(b=>b.right<=value.left),parts=[...names,value,unitCells[0]],u=splitUnit(unitCells[0].line.text.trim());
   if(!u.unit||/\s/.test(u.unit))continue;
   out.push({name:[...names,value].map(b=>b.line.text).join(' '),valueLiteral:'',comparator:null,abnormalFlag:u.abnormalFlag,unit:u.unit,referenceRange:'',sourceLineIds:parts.map(b=>b.line.id),order:Math.min(...parts.map(b=>b.line.order))});
   if(out.length===100)return out;
  }
 }
 return out;
}
