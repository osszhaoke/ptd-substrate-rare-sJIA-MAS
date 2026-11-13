import {readReference,referenceLabel} from '../domain/report/reference.js';
import {reportUnitNeedsReview} from '../domain/report/table_fields.js';
import {DICTIONARY} from '../domain/model.js';
import {reportObservation,reportProjection} from '../domain/report/fields.js';
import {esc} from '../app/ui.js';
const compareOptions=selected=>[['','没有符号'],['<','< 小于'],['<=','≤ 小于或等于'],['>','> 大于'],['>=','≥ 大于或等于']].map(([v,t])=>`<option value="${esc(v)}" ${(selected||'')===v?'selected':''}>${t}</option>`).join('');
export function refreshReferenceStatus(el){
 const input=el.querySelector('.report-reference'),status=el.querySelector('.reference-status');
 if(input&&status){const info=readReference(input.value);status.textContent=info.hint;status.dataset.referenceQuality=info.kind;}
}
function referenceHint(value){const info=readReference(value);return `<small class="reference-status" role="status" data-reference-quality="${info.kind}">${esc(info.hint)}</small>`;}
function extraFields(r){return `<label class="field">参考范围<input class="report-reference" maxlength="200" value="${esc(r.referenceRange)}"></label>${referenceHint(r.referenceRange)}<label class="field">报告上的升降标记<select class="report-flag">${['','↑','↓','H','L'].map(v=>`<option value="${v}" ${r.abnormalFlag===v?'selected':''}>${v||'无标记'}</option>`).join('')}</select></label><label class="check report-check"><input type="checkbox" class="report-checked" ${r.checked?'checked':''}>我已对照名称、结果、单位和参考信息；不清楚的仍待核实</label>`;}
export function renderReportRows(rows,renderMetric){return rows.map(r=>{
 const o=reportObservation(r),data=esc(JSON.stringify(r));
 if(o){const html=renderMetric({...o,unit:r.unit});return html.replace('<div ',`<div data-report="${data}" `).replace(/<\/div>$/,`<small>报告名称：${esc(r.name)}</small>${extraFields(r)}</div>`);}
 return `<div class="report-row" data-report="${data}" data-lines="${esc(JSON.stringify(r.sourceLineIds))}"><label class="field">项目名称<input class="report-name" maxlength="100" value="${esc(r.name)}"></label><label class="field">结果<input class="metric-value" maxlength="100" value="${esc(r.valueLiteral)}"></label><label class="field">数值前的符号<select class="metric-comparator">${compareOptions(r.comparator)}</select></label><label class="field">单位<input class="metric-unit" maxlength="40" value="${esc(r.unit)}"></label>${extraFields(r)}<small>${reportUnitNeedsReview(r)?'单位没识全，请对照原图补全；不能只勾选后保存。':r.valueLiteral?'按报告保存；不参与首页三卡计算。':'这项文字没分清。请对照原图，核准名称、结果和单位。'}</small><button type="button" class="remove-metric danger">移除</button><small class="ocr-row-status"></small></div>`;
 }).join('');}
export function readReportRow(el){
 const r=JSON.parse(el.dataset.report),original=reportObservation(r),selected=el.querySelector('.metric-code')?.value,nameInput=el.querySelector('.report-name');
 return {...r,name:nameInput?nameInput.value.trim():(selected&&selected!==original?.code?DICTIONARY[selected][0]:r.name),valueLiteral:el.querySelector('.metric-value').value.trim(),unit:el.querySelector('.metric-unit').value.trim(),comparator:el.querySelector('.metric-comparator').value||null,referenceRange:el.querySelector('.report-reference').value.trim(),abnormalFlag:el.querySelector('.report-flag').value,checked:el.querySelector('.report-checked').checked};
}
export function reportPayload(base,root){
 const rows=[...root.querySelectorAll('[data-report]')].map(readReportRow);if(!rows.length)return base;
 if(rows.some(r=>!r.name.trim()))throw Error('请填写项目名称，或移除不需要的项目。');
 if(rows.some(r=>!r.valueLiteral.trim()))throw Error('有项目还缺结果，请对照原图补填，或移除不需要的项目。');
 if(rows.some(reportUnitNeedsReview))throw Error('有项目的单位没识全，请对照原图补全单位，或移除不需要的项目。');
 if(rows.some(r=>!r.checked))throw Error('请逐项对照报告，勾选核对后再存数据。');
 return {...base,formatVersion:3,reportRows:rows,manualObservations:base.observations,observations:[...reportProjection(rows),...base.observations]};
}
export function reportWasCorrected(r){return ['name','valueLiteral','unit','comparator','referenceRange','abnormalFlag'].some(k=>(r[k]??null)!==(r.origin[k]??null));}
export function reportOriginNote(r){return `<small class="ocr-origin-note">${reportWasCorrected(r)?'你修改后保存；识别时为：':'识别时为：'}${esc(r.origin.name)} ${esc(r.origin.comparator||'')}${esc(r.origin.valueLiteral)} ${esc(r.origin.unit)}${r.origin.abnormalFlag?' '+esc(r.origin.abnormalFlag):''}${r.origin.referenceRange?'；参考范围 '+esc(r.origin.referenceRange):''}</small>`;}
export function reportDetails(p){return p.reportRows?`<div class="report-details">${p.reportRows.map(r=>`<p><b>${esc(r.name)}</b> ${esc(r.comparator||'')}${esc(r.valueLiteral)} ${esc(r.unit)} ${esc(r.abnormalFlag)}<br>${esc(referenceLabel(r.referenceRange))}${r.referenceRange?'：'+esc(r.referenceRange):''}${referenceHint(r.referenceRange)}${reportOriginNote(r)}<small>已核对报告项目；待核实的参考信息仍会提示</small></p>`).join('')}</div>`:'';}
