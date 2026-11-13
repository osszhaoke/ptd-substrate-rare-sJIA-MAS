// Report-only literal grammar. No new medical codes, unit inference or clinical interpretation.
export const QUALITATIVE=/^(?:阴性|陽性|阳性|陰性|弱阳性|弱陽性|均一性|非均一性|混合性|未检出|未检测到|未见|正常|异常|无|有|NEG(?:ATIVE)?|POS(?:ITIVE)?|不详|未检测|[-－—]|[+＋]{1,4}|[1-4][+＋]|[±])(?:\s*[（(][+＋－-][）)])?$/i;
export const incompleteReportUnit=value=>/[/／]\s*$/.test(value);
export const reportUnit=value=>value.length<=40&&!incompleteReportUnit(value)&&/^[A-Za-zµμ%°0-9^×xX⁹¹²/.*~−()（）-]+(?: (?:FEU|DDU))?$/.test(value);
export function tableResult(value,splitNumeric){return splitNumeric(value)||(QUALITATIVE.test(value.trim())?{valueLiteral:value.trim(),comparator:null,abnormalFlag:''}:null);}
export const dimensionless=name=>/(?:^|[\s★*])(?:INR|A\/G)(?:$|[\s（(])|(?:^|[\s★*])(?:比重|酸碱度)(?:$|[\s（(])|白球比|白蛋白\/球蛋白|白蛋白球蛋白比/i.test(name);
export const headerText=value=>value.trim().replace(/\s/g,'');

export function referenceThenUnit(value){
 const m=value.match(/^((?:[<>≤≥]=?)?[-+]?\d+(?:\.\d+)?(?:[-–—~～][-+]?\d+(?:\.\d+)?)?)((?:m|µ|μ|u)?mol\/[Ll]|(?:m|n|µ|μ|u)?g\/[mM]?[Ll]|[kK]?[uUI]+\/[mM]?[Ll]|%)$/);
 return m?{reference:m[1],unit:m[2]}:null;
}

// New review/save gates only. Stored historical literal rows keep their existing wire contract.
export const reportUnitNeedsReview=row=>incompleteReportUnit(row.unit)||incompleteReportUnit(row.origin?.unit||'')&&!row.unit.trim()&&!dimensionless(row.name)&&!QUALITATIVE.test(row.valueLiteral.trim());
