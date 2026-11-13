import {METRIC_CODES} from './catalog.js';
import {normalize} from './evaluate.js';
import {dec} from './decimal.js';
import {H1_DICTIONARY} from '../../rules/definitions.js';
export const relevant=e=>e.payload.observations.some(o=>Object.hasOwn(METRIC_CODES,o.code))||Object.values(e.payload.clinicalFlags||{}).some(v=>v!==null);
export function selectInputs(events){
 const groups={},sources={};
 function add(code,x){(groups[code]??=[]).push(x);sources[x.ref]=x;}
 for(const e of events){const p=e.payload,legacy=e.schema==='ptds-browser/1';
  p.observations.forEach((o,index)=>{const code=METRIC_CODES[o.code];if(!code)return;const ref=e.id+':'+index;let value=null,error=null;
   try{value=normalize(code,o.valueLiteral,o.unit).toString();}catch{error='单位或数值无法使用';}
   add(code,{code,ref,eventId:e.id,sourceLineIds:o.sourceLineIds,value,unit:H1_DICTIONARY.codes[code].unit_canonical,literal:o.valueLiteral,originalUnit:o.unit,comparator:legacy?null:o.comparator??null,instant:legacy?null:p.observedAt||null,error});
  });
  for(const [code,value]of Object.entries(legacy?{}:p.clinicalFlags||{})){if(value===null)continue;add(code,{code,ref:e.id+':'+code,eventId:e.id,sourceLineIds:[],value,unit:null,comparator:null,instant:p.observedAt||null});}
 }
 const values={};
 for(const [code,rows]of Object.entries(groups)){
  const refs=rows.map(x=>x.ref).sort(),conflict=reason=>({value:null,unit:rows[0].unit,comparator:null,conflict:true,refs,reason});let selected;
  if(rows.some(x=>x.error)){values[code]=conflict('单位或数值无法使用');continue;}
  if(rows.length===1)selected=rows;
  else if(H1_DICTIONARY.codes[code]?.value_type==='BOOLEAN'){const value=rows.some(x=>x.value===true);selected=rows.filter(x=>x.value===value);}
  else if(code==='TEMP'){
   if(rows.some(x=>x.comparator)){values[code]=conflict('同日多个带比较符的体温');continue;}
   const top=rows.reduce((a,b)=>dec(a.value).cmp(b.value)>=0?a:b).value;selected=rows.filter(x=>dec(x.value).cmp(top)===0);
  }else{
   if(rows.some(x=>!x.instant)){values[code]=conflict('同日多条读数缺少精确采集时刻');continue;}
   const sorted=[...rows].sort((a,b)=>Date.parse(b.instant)-Date.parse(a.instant));
   if(Date.parse(sorted[0].instant)===Date.parse(sorted[1].instant)){values[code]=conflict('同一采集时刻存在多条读数');continue;}selected=[sorted[0]];
  }
  const x=selected[0];values[code]={value:x.value,comparator:x.comparator,unit:x.unit,conflict:false,refs:selected.map(x=>x.ref).sort()};
 }
 return {values,sources};
}
export function metricChange(current,previous){
 if(!current||!previous)return{available:false,reason:'缺少本次或上次数据'};
 if(current.conflict||previous.conflict)return{available:false,reason:'输入冲突或单位无法使用'};
 if(current.comparator||previous.comparator)return{available:false,reason:'区间读数不计算精确差值'};
 if(current.unit!==previous.unit)return{available:false,reason:'单位不可比'};
 if(typeof current.value==='boolean'||typeof previous.value==='boolean')return{available:true,before:previous.value,after:current.value,delta:null,percent:null};
 if(current.value===null||previous.value===null)return{available:false,reason:'资料未知'};
 const delta=dec(current.value).sub(previous.value);return{available:true,before:previous.value,after:current.value,delta:delta.toString(),percent:dec(previous.value).cmp('0')===0?null:delta.mul('100').ratio(dec(previous.value).cmp('0')<0?dec(previous.value).mul('-1'):dec(previous.value)),reason:dec(previous.value).cmp('0')===0?'前值为零，不计算百分比':null};
}
