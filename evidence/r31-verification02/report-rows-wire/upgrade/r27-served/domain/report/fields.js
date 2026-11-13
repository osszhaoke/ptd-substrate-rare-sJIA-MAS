import {OCR_ALIASES} from '../state/ocr_aliases.js';
import {METRIC_CODES} from '../state/catalog.js';
import {H1_DICTIONARY} from '../../rules/definitions.js';

export const DICTIONARY = {
 ferritin:['铁蛋白','ng/mL','LAB'], plt:['血小板','10^9/L','LAB'], wbc:['白细胞','10^9/L','LAB'],
 crp:['C反应蛋白','mg/L','LAB'], esr:['血沉','mm/h','LAB'], ast:['AST','U/L','LAB'], tg:['甘油三酯','mmol/L','LAB'],
 lab_glucose:['化验血糖','mmol/L','LAB_UNKNOWN'], cgm_glucose:['CGM血糖','mmol/L','CGM'],
 heart_rate:['心率','bpm','WEARABLE'], spo2:['血氧','%','WEARABLE'], skin_temp:['皮肤温度','°C','SKIN'], body_temp:['体温','°C','BODY']
};
export const LEGACY_DICTIONARY=Object.freeze({...DICTIONARY});
Object.assign(DICTIONARY,{fib:['纤维蛋白原','g/L','LAB'],ldh:['乳酸脱氢酶','U/L','LAB'],hb:['血红蛋白','g/L','LAB'],anc:['中性粒细胞绝对计数','10^9/L','LAB'],scd25:['可溶性CD25','U/mL','LAB']});

// Exact spelling tables only: no fuzzy medical-name or concentration inference.
export const CBC_NAMES=['RBC','红细胞','红细胞计数','HCT','红细胞压积','MCV','平均红细胞体积','MCH','平均红细胞血红蛋白量','MCHC','平均红细胞血红蛋白浓度','RDW-CV','红细胞分布宽度变异系数','RDW-SD','红细胞分布宽度标准差','MPV','平均血小板体积','PDW','血小板分布宽度','PCT','血小板压积','P-LCR','大血小板比率','NEUT%','中性粒细胞百分比','LYMPH%','淋巴细胞百分比','LYMPH#','淋巴细胞绝对值','MONO%','单核细胞百分比','MONO#','单核细胞绝对值','EO%','嗜酸性粒细胞百分比','EO#','嗜酸性粒细胞绝对值','BASO%','嗜碱性粒细胞百分比','BASO#','嗜碱性粒细胞绝对值'];
export const NAME_HEADERS=new Set(['中文名称','检验名称','项目名称']);
export const NUMERIC=/^[-+]?\d{1,8}(?:\.\d{1,8})?$/;
export function splitResult(text){
 const m=text.trim().match(/^([↑↓HLhl]?)\s*(<=|>=|<|>|≤|≥)?\s*([-+]?\d{1,8}(?:\.\d{1,8})?)\s*([↑↓HLhl]?)$/);
 if(!m||m[1]&&m[4]&&m[1].toUpperCase()!==m[4].toUpperCase())return null;
 return {valueLiteral:m[3],comparator:({'≤':'<=','≥':'>='}[m[2]]||m[2]||null),abnormalFlag:(m[1]||m[4]).toUpperCase()};
}
export function splitUnit(text){const m=text.match(/^([↑↓])(.+)$/);return m?{unit:m[2],abnormalFlag:m[1]}:{unit:text,abnormalFlag:''};}
export function metricCode(name){
 const labels=Object.entries(DICTIONARY).flatMap(([code,[n]])=>[n,...(OCR_ALIASES[code]||[])].map(label=>({code,label:label.toLowerCase()}))).sort((a,b)=>b.label.length-a.label.length);
 let rest=name.trim().replace(/^\d+(?:\s+|(?=[★*＊]))/,''),code=null;
 while(rest){rest=rest.replace(/^[\s★*＊]+/,'');if(!rest)break;const match=labels.find(x=>rest.toLowerCase().startsWith(x.label));if(!match||code&&code!==match.code)return null;code=match.code;rest=rest.slice(match.label.length);}
 return code;
}
export function metricUnit(code,raw){
 if(!code)return null;
 const h=METRIC_CODES[code],allowed=h?Object.keys(H1_DICTIONARY.codes[h].units):[DICTIONARY[code][1]];
 if(allowed.includes(raw))return raw;
 // Explicit count-unit spelling normalization; raw unit remains in report and ledger.
 if(/^(?:[xX×*])?10(?:[\^~]9|⁹)\/[Ll]$/.test(raw)&&allowed.includes('10^9/L'))return '10^9/L';
 return null;
}
export function reportObservation(row){
 const code=metricCode(row.name),unit=metricUnit(code,row.unit);
 if(!code||!unit||!NUMERIC.test(row.valueLiteral))return null;
 return {code,displayName:DICTIONARY[code][0],valueLiteral:row.valueLiteral,unit,context:DICTIONARY[code][2],comparator:row.comparator??null,sourceLineIds:[...(row.ocrOrigin?.sourceLineIds||row.sourceLineIds)],...(row.ocrOrigin?{ocrOrigin:structuredClone(row.ocrOrigin)}:{})};
}
export function reportProjection(rows){return rows.map(reportObservation).filter(Boolean);}
