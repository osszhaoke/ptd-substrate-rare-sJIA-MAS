import {tableResult,QUALITATIVE,reportUnit,dimensionless,headerText,referenceThenUnit} from './table_fields.js';
import {splitResult,splitUnit,metricCode} from './fields.js';
const NAME = new Set(['项目','检验项目','检查项目','中文名称','检验名称','项目名称']);
const RESULT = new Set(['结果','测定结果','检测结果','检验结果']);
const REFERENCE = new Set(['参考范围','参考区间','生物参考区间','参考值','正常范围']);
const ENGLISH = new Set(['英文','英文名称']);
const text = b => b.line.text.trim();
const header = b => headerText(b.line.text);
const cx = b => (b.left+b.right)/2;
const height = b => b.bottom-b.top;
const letters = s => /[A-Za-z\u4e00-\u9fff]/.test(s);

export const metadataName = name => /[：:]|时间|地址|医师|审核|检验者|报告仅|备\s*注/.test(name.replace(/[（(][^()（）]*[）)]/g,''));
export function reportDataBoxes(boxes) {
 const starts=nameHeaders(boxes);if(!starts.length)return boxes;
 const stops=boxes.filter(b=>/^(?:备\s*注|申请医师|检验者|检验人员|审核者|审核人|报告时间|采样时间|送检时间|此报告|[^\s]{2,30}项目说明[：:])/.test(text(b)));
 // Multiple photographed report pages may share one image. Each table keeps its own footer.
 const windows=starts.map(a=>({top:a.top,bottom:Math.min(Infinity,...stops.filter(b=>b.top>a.bottom).map(b=>b.top))}));
 return boxes.filter(b=>windows.some(w=>b.cy>=w.top&&b.cy<w.bottom));
}

const UNIT_PREFIX = /^(↑|↓)?((?:m|µ|μ|u)?mol\/[Ll]|(?:m|n|µ|μ|u)?g\/[mM]?[Ll]|[kK]?[uUI]+\/[mM]?[Ll]|%)(.*)$/;
function unitAndReference(value) {
 value=value.replace(/^([↑↓])\s+(?=[A-Za-zµμ%])/,'$1');
 if(reportUnit(value))return {unit:value,reference:''};
 const spaced=value.match(/^([↑↓]?[^\s]+)\s+(.+)$/);
 if(spaced)return {unit:spaced[1],reference:spaced[2]};
 const joined=value.match(UNIT_PREFIX);
 if(joined&&joined[3]&&/^(?:(?:[<>≤≥]=?)?\d|正常人群)/.test(joined[3]))return {unit:(joined[1]||'')+joined[2],reference:joined[3]};
 return {unit:value,reference:''};
}
function nameHeaders(boxes) {
 const result = boxes.filter(b=>NAME.has(header(b)));
 // An explicitly split 项目 header; never interpret arbitrary body prose as a header.
 for(const a of boxes.filter(b=>header(b)==='项')){
  const tails=boxes.filter(b=>['目','日'].includes(header(b))&&b.left>=a.right&&b.left-a.right<height(a)*4&&Math.abs(b.cy-a.cy)<height(a));
  if(tails.length===1)result.push({...a,right:tails[0].right});
 }
 for (const a of boxes.filter(b=>['No项','No.项'].includes(text(b).replace(/\s/g,'')))) {
  const tails=boxes.filter(b=>text(b)==='目'&&b.left>a.right&&b.left-a.right<height(a)*4&&Math.abs(b.cy-a.cy)<height(a));
  if(tails.length===1)result.push({...a,right:tails[0].right});
 }
 return result;
}
export const hasReportHeaders = boxes => nameHeaders(boxes).length > 0;
function headers(boxes) {
 const names=nameHeaders(boxes);if(names.length>32)return [];
 const result=[];
 for(const name of names) {
  const sameBand=b=>Math.abs(b.cy-name.cy)<=Math.max(height(b),height(name))*4;
  const next=names.filter(b=>b.left>name.right&&sameBand(b)).sort((a,b)=>a.left-b.left)[0];
  const band=boxes.filter(b=>b.left>name.right&&(!next||b.right<next.left)&&sameBand(b));
  const one=accept=>{const found=band.filter(b=>accept(header(b)));return found.length===1?found[0]:null;};
  const value=one(s=>RESULT.has(s)),unit=one(s=>s==='单位'),ref=one(s=>REFERENCE.has(s));
  if(!value||!unit||!ref||value.left<=name.right)continue;
  const flag=one(s=>s==='提示'),columns=[{role:'name',...name},{role:'value',...value},{role:'unit',...unit},{role:'ref',...ref},...(flag?[{role:'flag',...flag}]:[])].sort((a,b)=>a.left-b.left);
  const previous=names.filter(b=>b.right<name.left&&sameBand(b)).sort((a,b)=>b.right-a.right)[0];
  const previousRef=previous?boxes.filter(b=>REFERENCE.has(header(b))&&b.left>previous.right&&b.right<name.left&&sameBand(b)).sort((a,b)=>b.right-a.right)[0]:null;
  const english=boxes.filter(b=>ENGLISH.has(header(b))&&b.right<name.left&&sameBand(b)).sort((a,b)=>b.right-a.right)[0];
  const left=previousRef?(previousRef.right+name.left)/2:Math.min(name.left-(value.left-name.right),english?.left??Infinity)-height(name);
  const last=columns.at(-1),right=next?(last.right+next.left)/2:Infinity;
  const meanX=columns.reduce((sum,b)=>sum+cx(b),0)/columns.length,meanY=columns.reduce((sum,b)=>sum+b.cy,0)/columns.length;
  const denominator=columns.reduce((sum,b)=>sum+(cx(b)-meanX)**2,0);
  let slope=denominator?columns.reduce((sum,b)=>sum+(cx(b)-meanX)*(b.cy-meanY),0)/denominator:0;
  if(Math.abs(slope)>.3)continue;
  const wide=boxes.filter(b=>cx(b)>left&&cx(b)<right&&b.cy>name.bottom&&b.right-b.left>=height(b)*2&&b.slope!==null&&!metadataName(text(b))).map(b=>b.slope).sort((a,b)=>a-b);
  if(wide.length>=5)slope=wide[Math.floor(wide.length/2)];
  const boundaries=[left];
  for(let i=0;i<columns.length-1;i++) {
   const a=columns[i],b=columns[i+1];
   boundaries.push(a.role==='name'||b.role==='ref'?b.left-(b.left-a.right)*.15:(a.right+b.left)/2);
  }
  boundaries.push(right);
  const bottom=Math.min(Infinity,...names.filter(b=>b.top>name.bottom+height(name)*2&&cx(b)>left&&cx(b)<right).map(b=>b.top-slope*cx(b)));
  result.push({columns,boundaries,slope,bottom,top:Math.min(...columns.map(b=>b.cy-slope*cx(b)+height(b)/2)),name,value,unit,ref});
 }
 return result;
}
export function generalTableRows(boxes,used=new Set()) {
 const out=[];
 for(const h of headers(boxes)) {
  const y=b=>b.cy-h.slope*cx(b),groups={name:[],value:[],unit:[],ref:[],flag:[]},merged=[],crossNames=[],published=[];
  for(const b of boxes) {
   if(y(b)>h.top&&y(b)<h.bottom&&b.left<h.boundaries[0]&&b.right>h.boundaries[0]&&b.right<=h.boundaries[1]&&/\d+\s+[A-Za-z][A-Za-z0-9 -]*\s+[\u4e00-\u9fff]/.test(text(b))&&!metadataName(text(b)))crossNames.push(b);
   if(y(b)<=h.top||y(b)>=h.bottom||cx(b)<=h.boundaries[0]||cx(b)>=h.boundaries.at(-1)||NAME.has(header(b))||RESULT.has(header(b))||REFERENCE.has(header(b))||ENGLISH.has(header(b))||['单位','提示','目','No项','No.项'].includes(text(b)))continue;
   const column=h.columns.findIndex((c,i)=>b.left>=h.boundaries[i]&&b.right<=h.boundaries[i+1]||(c.role==='value'&&tableResult(text(b),splitResult)||c.role==='unit'&&reportUnit(text(b)))&&cx(b)>=h.boundaries[i]&&cx(b)<=h.boundaries[i+1]&&b.right-b.left<h.boundaries[i+1]-h.boundaries[i]);
   if(column>=0){const role=h.columns[column].role,reverse=role==='ref'?referenceThenUnit(text(b)):null;
    if(reverse){groups.unit.push({...b,combinedUnit:reverse.unit,combinedReference:reverse.reference});continue;}
    const decoded=role==='unit'?unitAndReference(text(b)):null;groups[role].push(decoded?.reference?{...b,combinedUnit:decoded.unit,combinedReference:decoded.reference}:b);continue;}
   const ni=h.columns.findIndex(c=>c.role==='name'),vi=h.columns.findIndex(c=>c.role==='value');
   if(b.left>=h.boundaries[ni]&&b.left<h.boundaries[ni+1]&&b.right>h.boundaries[ni+1]&&b.right<=h.boundaries[vi+1]&&letters(text(b)))merged.push(b);
   const ui=h.columns.findIndex(c=>c.role==='unit'),ri=h.columns.findIndex(c=>c.role==='ref');
   const reverse=referenceThenUnit(text(b));if(reverse&&b.left>=h.boundaries[ri]&&b.left<h.boundaries[ri+1]&&cx(b)<h.boundaries[ui+1]){groups.unit.push({...b,combinedUnit:reverse.unit,combinedReference:reverse.reference});continue;}
   if(ri===ui+1&&b.left>=h.boundaries[ui]-height(b)*.75&&b.left<h.boundaries[ui+1]&&b.right<=h.boundaries[ri+1]) {
    const decoded=unitAndReference(text(b));
    if(decoded.reference&&letters(decoded.unit)&&decoded.unit.length<=40&&decoded.reference.length<=200)groups.unit.push({...b,combinedUnit:decoded.unit,combinedReference:decoded.reference});
    else if(!decoded.reference&&cx(b)<h.boundaries[ui+1]&&/^[↑↓]?[A-Za-zµμ%°0-9^×xX⁹/.*−-]+$/.test(decoded.unit)&&letters(decoded.unit))groups.unit.push(b);
   }
  }
  for(const list of Object.values(groups))list.sort((a,b)=>y(a)-y(b)||a.left-b.left);
  // Bounded binary search avoids a full row-to-column scan at 20k fragments.
  const aligned=(list,b,slope=h.slope)=>{
   const target=y(b),radius=height(b)*1.5+Math.abs(slope-h.slope)*Math.max(...h.columns.map(c=>Math.abs(cx(c)-cx(b))))*1.5;let lo=0,hi=list.length;
   while(lo<hi){const m=(lo+hi)>>>1;if(y(list[m])<target-radius)lo=m+1;else hi=m;}
   const found=[];
   for(let i=lo;i<list.length&&y(list[i])<=target+radius;i++)if(Math.abs(list[i].cy-b.cy-slope*(cx(list[i])-cx(b)))<=Math.min(height(list[i]),height(b))*.65){found.push(list[i]);if(found.length>100)break;}
   return found;
  };
  const emit=(anchor,pending=false)=>{
   const numeric=aligned(groups.value,anchor).filter(b=>tableResult(text(b),splitResult));
   if(pending?numeric.length!==0:numeric.length!==1)return;
   const names=aligned(groups.name,anchor).sort((a,b)=>a.left-b.left);
   const units=aligned(groups.unit,anchor),references=aligned(groups.ref,anchor);
   if(pending)names.push(anchor);
   const name=names.map(text).join(' ');
   if(!name||name.length>100||!letters(name)||names.some((b,i)=>i&&b.left<names[i-1].right))return;
   const flags=[...aligned(groups.flag,anchor),...aligned(groups.value,anchor).filter(b=>/^[↑↓HL]$/.test(text(b)))];
   const unitTexts=units.map(b=>b.combinedUnit??text(b)),unitTokens=unitTexts.filter(s=>s&&!(/^[↑↓HL]$/.test(s)));
   if(unitTokens.length>1)return;
   const unit=splitUnit(unitTokens[0]||''),parsed=pending?{valueLiteral:'',comparator:null,abnormalFlag:''}:tableResult(text(anchor),splitResult);
   const marks=[parsed.abnormalFlag,unit.abnormalFlag,...unitTexts.filter(s=>/^[↑↓HL]$/.test(s)),...flags.map(text).filter(s=>/^[↑↓HL]$/.test(s))].filter(Boolean);
   if(new Set(marks).size>1||unit.unit.length>40)return;
   if(unit.unit&&!reportUnit(unit.unit))return;
   if(!unit.unit&&!dimensionless(name)&&!QUALITATIVE.test(text(anchor)))return;
   if(metadataName(name))return;
   const reference=units.find(b=>b.combinedReference)?.combinedReference??references.sort((a,b)=>a.left-b.left).map(text).join(' ');
   const parts=[...names,...(pending?[]:[anchor]),...units,...references,...flags];
   const ids=[...new Set(parts.map(b=>b.line.id))];
   if(ids.some(id=>used.has(id))||reference.length>200)return;
   out.push({name,...parsed,unit:unit.unit,referenceRange:reference,abnormalFlag:marks[0]||'',sourceLineIds:ids,order:Math.min(...parts.map(b=>b.line.order))});
   ids.forEach(id=>used.add(id));published.push(...names);
  };
  for(const b of groups.value){if(tableResult(text(b),splitResult))emit(b);if(out.length>=100)return out;}
  merged.sort((a,b)=>y(a)-y(b));
  for(const b of merged){if(aligned(merged,b).length===1)emit(b,true);if(out.length>=100)return out;}
  // An explicit but unpaired *unknown* project remains a correction task, never a guessed value/unit.
  for(const b of [...groups.name,...merged,...crossNames].sort((a,b)=>y(a)-y(b)||a.left-b.left)) {
   if(used.has(b.line.id)||!crossNames.includes(b)&&published.some(a=>Math.abs(y(a)-y(b))<Math.max(height(a),height(b))*.85))continue;
   const parts=crossNames.includes(b)?[b]:[b,...aligned(groups.name,b).filter(a=>a!==b&&!used.has(a.line.id)&&(a.right<=b.left||a.left>=b.right))].sort((a,b)=>a.left-b.left);
   const name=parts.map(text).join(' '),ids=parts.map(p=>p.line.id);
   if(!parts.length||ids.some(id=>used.has(id))||(!letters(name)&&!(/^\d{1,3}$/.test(name)&&aligned(groups.value,b).length&&aligned(groups.unit,b).length))||name.length>100||metricCode(name)||metadataName(name))continue;
   out.push({name,valueLiteral:'',comparator:null,unit:'',referenceRange:'',abnormalFlag:'',sourceLineIds:ids,order:Math.min(...parts.map(p=>p.line.order))});
   ids.forEach(id=>used.add(id));published.push(b);
   if(out.length>=100)return out;
  }
 }
 return out;
}
