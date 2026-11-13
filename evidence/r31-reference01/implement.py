from pathlib import Path
R=Path(__file__).resolve().parents[2];C=R/'runtime/r31-reference-candidate01'
(C/'web/domain/report/reference.js').write_text(r'''// Read-only quality projection v1. Never invent a missing bound or change saved literals.
import {dec} from '../state/decimal.js';
export const REFERENCE_READER_VERSION='report-reference/1';
const number='[-+]?\\d+(?:\\.\\d+)?';
const interval=new RegExp('^('+number+')\\s*(?:[-–—~～]|至|到)\\s*('+number+')$');
const limit=new RegExp('^(<=|>=|<|>|≤|≥)\\s*('+number+')$');
const scalar=new RegExp('^'+number+'$');
export function readReference(value){
 const raw=String(value??''),s=raw.trim().replace(/[−﹣－]/g,'-');
 const state=(kind,hint,extra={})=>({version:REFERENCE_READER_VERSION,kind,raw,hint,...extra});
 if(!s)return state('missing','参考范围未提供。不能据此判断是否正常；原单未写时可以留空。');
 const range=s.match(interval);
 if(range){
  if(dec(range[1]).cmp(range[2])>0)return state('incomplete','参考范围待核对：上下限顺序不清楚，请对照原图；不会自动调换。');
  return state('range','参考范围来自报告，请对照原图核对。',{lower:range[1],upper:range[2]});
 }
 const boundary=s.match(limit);
 if(boundary)return state('limit','这是原报告的单侧参考界限，请核对方向和数值。',{operator:boundary[1],value:boundary[2]});
 if(scalar.test(s))return state('ambiguous','参考范围待核对：只识出一个数字，可能是单值，也可能缺少上下限；请对照原图。');
 if(/^[\d\s.,+\-–—~～<>≤≥=/]+$/.test(s))return state('incomplete','参考范围待核对：数字或分隔符没有识全，请对照原图；不会猜填。');
 return state('text','这是报告参考文字，尚未解析成数值范围；请按原单核对。');
}
export function referenceLabel(value){
 const {kind}=readReference(value);
 return kind==='missing'?'参考范围未提供':kind==='ambiguous'||kind==='incomplete'?'参考范围待核对（原文）':kind==='text'?'报告参考文字':'参考范围';
}
''')
p=C/'web/features/report_rows.js';s=p.read_text();s="import {readReference,referenceLabel} from '../domain/report/reference.js';\n"+s
old='function extraFields(r){return `<label class="field">参考范围<input class="report-reference" maxlength="200" value="${esc(r.referenceRange)}"></label>'
new='''export function refreshReferenceStatus(el){
 const input=el.querySelector('.report-reference'),status=el.querySelector('.reference-status');
 if(input&&status){const info=readReference(input.value);status.textContent=info.hint;status.dataset.referenceQuality=info.kind;}
}
function referenceHint(value){const info=readReference(value);return `<small class="reference-status" role="status" data-reference-quality="${info.kind}">${esc(info.hint)}</small>`;}
function extraFields(r){return `<label class="field">参考范围<input class="report-reference" maxlength="200" value="${esc(r.referenceRange)}"></label>${referenceHint(r.referenceRange)}'''
assert s.count(old)==1;s=s.replace(old,new)
s=s.replace('我已对照这项的名称、结果和单位</label>', '我已对照名称、结果、单位和参考信息；不清楚的仍待核实</label>')
old="${r.referenceRange?`<br>参考范围：${esc(r.referenceRange)}`:''}${reportOriginNote(r)}<small>已逐项核对</small>"
new="<br>${esc(referenceLabel(r.referenceRange))}${r.referenceRange?'：'+esc(r.referenceRange):''}${referenceHint(r.referenceRange)}${reportOriginNote(r)}<small>已核对报告项目；待核实的参考信息仍会提示</small>"
assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
p=C/'web/app/report_editor.js';s=p.read_text();s=s.replace("import {renderReportRows}","import {renderReportRows,refreshReferenceStatus}")
old="if(el&&!event.target.matches('.report-checked'))el.querySelector('.report-checked').checked=false;"
new="if(el&&!event.target.matches('.report-checked')){el.querySelector('.report-checked').checked=false;refreshReferenceStatus(el);}"
assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
