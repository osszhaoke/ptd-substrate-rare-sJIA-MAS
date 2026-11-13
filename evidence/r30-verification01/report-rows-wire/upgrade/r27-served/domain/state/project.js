import {RULES} from './catalog.js';
import {evaluate} from './evaluate.js';
import {selectInputs} from './select.js';
import {RULE_BINDING} from '../../rules/definitions.js';
export function projectSnapshot(snapshot,{nature,zone}){
 const grouped=new Map(snapshot.dates.map(d=>[d,[]]));for(const e of snapshot.events)grouped.get(e.payload.clinicalDate)?.push(e);
 const points=snapshot.dates.map(date=>{const {values,sources}=selectInputs(grouped.get(date));return{date,values,sources,rules:Object.fromEntries(RULES.map(r=>[r.id,evaluate(r.id,values)]))};});
 return{revision:snapshot.revision,nature,zone,points,next:snapshot.next,excludedTimezone:snapshot.excludedTimezone,binding:RULE_BINDING};
}
export function ruleInputCodes(rule){const out=new Set();function walk(x){if(x&&typeof x==='object'){if(x.code)out.add(x.code);if(x.flag)out.add(x.flag);for(const v of Object.values(x))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);}}walk(rule);return[...out];}
