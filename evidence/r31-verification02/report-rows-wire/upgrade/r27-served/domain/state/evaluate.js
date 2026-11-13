import {PACK,H1_DICTIONARY,RULE_BINDING} from '../../rules/definitions.js';
import {dec} from './decimal.js';
export const triAnd=a=>a.some(x=>x===false)?false:a.every(x=>x===true)?true:null;
export const triOr=a=>a.some(x=>x===true)?true:a.every(x=>x===false)?false:null;
export function kOf(a,k){const n=a.filter(x=>x===true).length,u=a.filter(x=>x===null).length;return n>=k?true:n+u<k?false:null;}
export const resultFrom=(v,g)=>v===true?'MET':v===false?(g===false?'NOT_APPLICABLE':'NOT_MET'):'INDETERMINATE';
export function normalize(code,literal,unit){const def=H1_DICTIONARY.codes[code],rule=def?.units?.[unit];if(!rule)throw Error('UNIT_UNSUPPORTED');return rule==='IDENTITY'?dec(literal):rule.startsWith('SCALE:')?dec(literal).mul(rule.slice(6)):(()=>{throw Error('UNIT_RULE_UNSUPPORTED');})();}
export function compare(value,comparator,op,threshold){
 if(value===null||value===undefined)return null;const v=dec(value),t=dec(threshold),c=v.cmp(t);
 const aboveOpen=comparator==='>'?c>=0:['<','<='].includes(comparator)?false:c>0;
 const aboveClosed=['<','<='].includes(comparator)?false:c>=0;
 const belowOpen=comparator==='<'?c<=0:['>','>='].includes(comparator)?false:c<0;
 const belowClosed=['>','>='].includes(comparator)?false:c<=0;
 if(op==='>')return aboveOpen?true:belowClosed?false:null;
 if(op==='>=')return aboveClosed?true:belowOpen?false:null;
 if(op==='<')return belowOpen?true:aboveClosed?false:null;
 if(op==='<=')return belowClosed?true:aboveOpen?false:null;
 throw Error('RULE_OP_INVALID');
}
function valueJson(v){return v?{value:v.value,comparator:v.comparator??null,missing:false,conflict:!!v.conflict,refs:v.refs||[]}:{value:null,comparator:null,missing:true,conflict:false,refs:[]};}
function criterion(c,values){
 let outcome,detail;
 if(c.code){const v=values[c.code];if(v?.value!=null&&v.unit!==H1_DICTIONARY.codes[c.code].unit_canonical)throw Error('UNIT_MISMATCH_AT_EVALUATION');const threshold=normalize(c.code,c.value,c.unit).toString();outcome=compare(v?.value??null,v?.comparator,c.op,threshold);detail={code:c.code,op:c.op,threshold,unit:H1_DICTIONARY.codes[c.code].unit_canonical,...valueJson(v),outcome};}
 else if(c.flag){const v=values[c.flag];outcome=v?.value??null;detail={flag:c.flag,...valueJson(v),outcome};}
 else if(c.any){const a=c.any.map(x=>criterion(x,values));outcome=triOr(a.map(x=>x.outcome));detail={any:a,outcome};}
 else{const a=c.items.map(x=>criterion(x,values));outcome=kOf(a.map(x=>x.outcome),c.k_of);detail={k_of:c.k_of,items:a,outcome};}
 return {...detail,...(c.id?{id:c.id}:{})};
}
function missing(parts){return [...new Set(parts.flatMap(p=>p.any?missing(p.any):p.items?missing(p.items):p.missing||p.conflict?[p.code||p.flag]:[]))].sort();}
export function evaluate(ruleId,values){
 const rule=PACK.rules[ruleId];if(!rule)throw Error('RULE_UNKNOWN');
 const gates=(rule.gate||[]).map(c=>criterion(c,values)),gate=triAnd(gates.map(x=>x.outcome));
 const out={rule:ruleId,name_zh:rule.name_zh,expert_review:rule.expert_review,gate:{outcome:gate,items:gates},binding:RULE_BINDING};let parts=[...gates],part;
 if(rule.kind==='GATED_REQUIRED_K_OF_N'){
  const required=rule.required.map(c=>criterion(c,values)),additional=rule.additional.map(c=>criterion(c,values));
  part=triAnd([triAnd(required.map(x=>x.outcome)),kOf(additional.map(x=>x.outcome),rule.additional_min)]);parts.push(...required,...additional);
  Object.assign(out,{required,additional,additional_min:rule.additional_min,additional_true:additional.filter(x=>x.outcome===true).length,additional_unknown:additional.filter(x=>x.outcome===null).length});
 }else if(rule.kind==='K_OF_N'){
  const criteria=rule.criteria.map(c=>criterion(c,values));part=kOf(criteria.map(x=>x.outcome),rule.min_met);parts.push(...criteria);
  Object.assign(out,{criteria,min_met:rule.min_met,met_count:criteria.filter(x=>x.outcome===true).length,unknown_count:criteria.filter(x=>x.outcome===null).length});
 }else{
  const terms=rule.terms.map(t=>{const key=t.code||t.flag,v=values[key],usable=v?.value!==null&&v?.value!==undefined&&!v.comparator;return{input:key,coef:t.coef,unit:t.unit??null,...valueJson(v),usable};});
  const score=terms.every(t=>t.usable)?terms.reduce((s,t)=>s.add(dec(t.coef).mul(typeof t.value==='boolean'?(t.value?'1':'0'):t.value)),dec('0')).toString():null;
  part=compare(score,null,rule.cutoff.op,rule.cutoff.value);parts.push(...terms.filter(t=>!t.usable).map(t=>({...t,code:t.input})));
  Object.assign(out,{terms,score,cutoff:rule.cutoff,censored:terms.filter(t=>t.comparator).map(t=>t.input)});
 }
 out.criteria_part=resultFrom(part,true);out.result=resultFrom(triAnd([gate,part]),gate);out.missing=missing(parts);return out;
}
