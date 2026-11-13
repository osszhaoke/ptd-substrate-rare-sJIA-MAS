import {DICTIONARY,validateLedger} from '../model.js';
import {METRIC_CODES} from './catalog.js';
import {H1_DICTIONARY} from '../../rules/definitions.js';
import {OCR_ALIASES as ALIASES} from './ocr_aliases.js';
import {fragmentRows} from './ocr_fragments.js';
function supportedUnit(code,unit){
 const h1=METRIC_CODES[code],allowed=h1?Object.keys(H1_DICTIONARY.codes[h1].units):[DICTIONARY[code][1]];
 if(allowed.includes(unit))return unit;
 // OCR x/X/× is a multiplication glyph, not a different concentration unit.
 // Project only this explicit spelling to an already supported unit; raw stays in ledger.
 if(/^[xX×]10(?:\^9|⁹)\/L$/.test(unit)&&allowed.includes('10^9/L'))return '10^9/L';
 return null;
}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function candidates(ledger){
 validateLedger(ledger);const out=[];
 const labels=new Set(Object.entries(DICTIONARY).flatMap(([code,[name]])=>[name,...(ALIASES[code]||[])].map(s=>s.toLowerCase())));
 // Strip only an explicit leading row number / star, then consume exact known labels.
 // Both languages must identify the same metric; partial matches are rejected.
 const tableLabels=Object.entries(DICTIONARY).flatMap(([code,[name]])=>[name,...(ALIASES[code]||[])].map(label=>({code,label:label.toLowerCase()}))).sort((a,b)=>b.label.length-a.label.length);
 const resolveName=text=>{
  let rest=text.trim().replace(/^\d+\s+/,''),code=null;
  while(rest){rest=rest.replace(/^[\s*＊]+/,'');if(!rest)break;
   const match=tableLabels.find(x=>rest.toLowerCase().startsWith(x.label));if(!match||code&&code!==match.code)return null;
   code=match.code;rest=rest.slice(match.label.length);
  }
  return code?DICTIONARY[code][0]:null;
 };
 const joined=fragmentRows(ledger,text=>labels.has(text.toLowerCase()),resolveName);
 const input=[...ledger.lines.map(line=>({...line,sourceLineIds:[line.id]})),...joined].sort((a,b)=>a.order-b.order);
 for(const line of input){let found=null;
  for(const [code,[name,defaultUnit,context]]of Object.entries(DICTIONARY)){
   const matches=[];for(const label of [name,...(ALIASES[code]||[])]){
    const boundary='(?<![A-Za-z0-9\\u4e00-\\u9fff])';
    const end=/[A-Za-z0-9]$/.test(label)?'(?![A-Za-z0-9\\u4e00-\\u9fff])':'(?![A-Za-z\\u4e00-\\u9fff])';
    const pattern=new RegExp(boundary+escape(label)+end+'\\s*[:：]?\\s*(<=|>=|<|>|≤|≥)?\\s*([-+]?\\d{1,8}(?:\\.\\d{1,8})?)(?![\\d.])\\s*([^\\s,，;；]+)','gi');
    for(const match of line.text.matchAll(pattern)){
     const unit=supportedUnit(code,match[3]);if(!unit)continue;
     matches.push({code,displayName:name,valueLiteral:match[2],unit,context,comparator:({'≤':'<=','≥':'>='}[match[1]]||match[1]||null),sourceLineIds:line.sourceLineIds,unitInferred:false});
    }
   }
   const distinct=new Map(matches.map(x=>[JSON.stringify([x.valueLiteral,x.unit,x.comparator]),x]));
   if(distinct.size>1){found=null;break;}
   if(distinct.size===1){if(found&&found.code!==code){found=null;break;}found=[...distinct.values()][0];}
  }
  if(found)out.push(found);if(out.length===100)break;
 }
 return out;
}
