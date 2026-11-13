import {H1_DICTIONARY} from '../../rules/definitions.js';
export const METRIC_CODES={ferritin:'FERRITIN',plt:'PLT',ast:'AST',tg:'TG',fib:'FIB',ldh:'LDH',hb:'HB',anc:'ANC',scd25:'SCD25',body_temp:'TEMP'};
export const FLAGS={FEVER:'发热',SJIA_KNOWN_OR_SUSPECTED:'已知或疑似 sJIA',LAB_NOT_OTHERWISE_EXPLAINED:'实验室异常不能由其他原因解释',SPLENOMEGALY:'脾大',HEMOPHAGOCYTOSIS:'噬血',NK_LOW:'NK 活性低',CNS_INVOLVEMENT:'中枢神经系统受累',HEMORRHAGE:'出血',ARTHRITIS:'活动性关节炎'};
export const RULES=[
 {id:'R2',ref:'MAS.HLH-2004@0.1',name:'HLH-2004',doi:'https://doi.org/10.1002/pbc.21039',summary:'八项中满足至少五项。'},
 {id:'R1',ref:'MAS.EULAR-2016@0.1',name:'2016 分类',doi:'https://doi.org/10.1136/annrheumdis-2015-208982',summary:'前提成立、铁蛋白 >684 ng/mL，另满足至少两项。'},
 {id:'R3',ref:'MAS.MS-2019@0.1',name:'MS 评分',doi:'https://doi.org/10.1136/annrheumdis-2019-215211',summary:'发热且已知或疑似 sJIA，七项加权评分，界值 ≥−2.1。'}
];
export const RESULT_ZH={MET:'成立',NOT_MET:'不成立',INDETERMINATE:'缺数据',NOT_APPLICABLE:'不适用'};
export const LABELS=Object.fromEntries(Object.entries(H1_DICTIONARY.codes).map(([k,v])=>[k,v.label_zh]));
const OTHER_UNITS={wbc:['10^9/L','×10^9/L'],crp:['mg/L'],esr:['mm/h'],lab_glucose:['mmol/L','mg/dL'],cgm_glucose:['mmol/L','mg/dL'],heart_rate:['bpm'],spo2:['%'],skin_temp:['°C']};
export function knownUnit(code,unit){const h=METRIC_CODES[code];return h?Object.hasOwn(H1_DICTIONARY.codes[h].units,unit):!!OTHER_UNITS[code]?.includes(unit);}
