import {renderReportRows,reportPayload} from './report_rows.js';
import {stepLabels} from './step_labels.js';
import {clinicalFlags,readFlags} from './clinical_flags.js';
import {DICTIONARY,today} from '../domain/model.js';
import {esc,button} from '../app/ui.js';
export function editor({zone,payload,source,config}){
 const p=payload||{clinicalDate:today(zone),nature:'REAL',observations:[],note:''};
 return `<div class="home-heading">` +
  `<h1>录入</h1>${button('resume-draft','继续上次录入','link')}</div>
 ${stepLabels('editor',['选资料','核信息','存数据'],'录入步骤')}
 ${sourceStep(source,config)}
 ${reviewStep(p,zone)}
 ${confirmationStep()}
 ${button('discard','放弃这次录入','danger wide')}`;
}
export function row(o={code:'crp',displayName:'C反应蛋白',valueLiteral:'',unit:'mg/L',context:'LAB',sourceLineIds:[]}){
 return `<div class="metric-row" data-lines="${esc(JSON.stringify(o.sourceLineIds))}"${o.ocrOrigin?` data-ocr-origin="${esc(JSON.stringify(o.ocrOrigin))}"`:""}>` +
  `<label class="field">指标<select class="metric-code">${Object.entries(DICTIONARY).map(([k,v])=>`<option value="${k}" ${o.code===k?'selected':''}>${v[0]}</option>`).join('')}</select>` +
  `</label>` +
  `<label class="field">数值前的符号<select class="metric-comparator">${[['','没有符号'],['<','< 小于'],['<=','≤ 小于或等于'],['>','> 大于'],['>=','≥ 大于或等于']].map(([v,label])=>`<option value="${esc(v)}" ${(o.comparator||'')===v?'selected':''}>${esc(label)}</option>`).join('')}</select>` +
  `</label>` +
  `<label class="field">数值（照原样填）<input class="metric-value" value="${esc(o.valueLiteral)}" inputmode="decimal" required>` +
  `</label>` +
  `<label class="field">单位<input class="metric-unit" maxlength="40" value="${esc(o.unit)}" required>` +
  `</label>` +
  `<button type="button" class="remove-metric danger">移除</button>${o.unitInferred?'<small>这个单位是识别时补上的，请对照原图核对。</small>':''}<small>${o.sourceLineIds.length?'已关联图片原文':'手工填写'}</small>` +
  `</div>`;
}
export function readPayload(zone,source){return reportPayload({formatVersion:2,clinicalFlags:readFlags(),observedAt:document.querySelector('#observed-at').value.trim()||null,clinicalDate:document.querySelector('#clinical-date').value,instanceTimezone:zone,documentKind:source?'lab':'manual',nature:document.querySelector('#nature').value,sourceKind:source?.ledger?'OCR':'MANUAL',trustTier:'USER_REVIEWED',note:document.querySelector('#note').value,observations:[...document.querySelectorAll('.metric-row:not([data-report])')].map(el=>{const code=el.querySelector('.metric-code').value;
 return {code,displayName:DICTIONARY[code][0],context:DICTIONARY[code][2],comparator:el.querySelector('.metric-comparator').value||null,valueLiteral:el.querySelector('.metric-value').value,unit:el.querySelector('.metric-unit').value,sourceLineIds:JSON.parse(el.dataset.lines),...(el.dataset.ocrOrigin?{ocrOrigin:JSON.parse(el.dataset.ocrOrigin)}:{})};
 })},document.querySelector('#editor'));
 }
export function ledgerView(source){
 if(!source)return '<p class="muted">没有图片。</p>';
 const l=source.ledger;
 return `<p>${esc(source.name)}</p>${button('download-original','下载原图')}${l?`<p class="muted">识别原文，共 ${l.lines.length} 行。重复或没认出的内容也保留。</p>` +
  `<pre>${esc(l.rawText)}</pre>` +
  `<ol>${l.lines.map(x=>`<li>` +
  `<pre>${esc(x.text)}</pre>` +
  `</li>`).join('')}</ol>`:'<p class="muted">只保留了图片，未在线识别。</p>'}<details>` +
  `<summary>核验信息</summary>` +
  `<p class="hash">图片指纹 ${esc(source.hash)}</p>${l?`<p>${esc(l.provider)} · ${esc(l.region)}</p>` +
  `<pre>${esc(JSON.stringify(l.lines,null,2))}</pre>`:''}</details>`;
}

function sourceStep(source,config) {
 return `<section class="panel" id="source-step">` +
  `<h2>先选一份资料</h2>` +
  `<p class="muted">为自己记病程时，可拍照、选图或手填。选图先留在本机，只有点“上传并识别”才会上传。</p>` +
  `<label class="capture-action">拍照或选择图片<input id="image" type="file" accept="image/png,image/jpeg">` +
  `</label>` +
  `<p id="source-name">${source?esc(source.name):'还没选图片'}</p>` +
  `<p class="muted">支持 JPG、PNG，每张不超过8 MB。PDF或HEIC请先转成图片。</p>
 ${config.enabled?`<details>` +
  `<summary>在线识别图片 · 可用</summary>` +
  `<p class="muted">${esc(config.disclosure||'尚未开通，不会上传图片。')}</p>` +
  `<p class="muted">在线识别每张最多 ${((config.maxImageBytes||8*1024*1024)/1048576).toFixed(0)} MB；超出可手填，本机仍保留原图。</p>` +
  (config.publicTrial ? `<input id="trial-token" type="hidden" value="public-24h">` :
  `<label class="field">识别试用码<input id="trial-token" type="password" autocomplete="off" maxlength="200"></label><p class="muted">由提供者给出，只用于在线识别。</p>`) +
  `<label class="check">` +
  `<input type="checkbox" id="upload-consent">我已看过图片，同意上传到上面说明的服务。</label>${button('ocr','上传并识别','wide')}${button('cancel-ocr','取消等待','wide')}<p class="muted">已上传的图片无法撤回；取消后不会自动重试。</p>` +
  `</details>`:'<p class="muted">在线识别暂未开通，可直接手填。</p>'}
 <details>` +
  `<summary>查看图片来源和识别原文</summary>` +
  `<div id="ledger">${ledgerView(source)}</div>` +
  `</details>
 ${button('start-review',source?'下一步：核信息':'直接手填','primary wide')}</section>`;
}

function reviewStep(p,zone) {
 return `<form id="editor">` +
  `<section class="panel" id="review-step" hidden>` +
  `<h2>核信息</h2><p class="muted">请对照报告，为自己核准日期、数值和单位，方便下次就诊。这里只在本机填写，不会发给医生或 AI。</p>` +
  `<label class="field">记录日期<input id="clinical-date" type="date" value="${esc(p.clinicalDate)}" required>` +
  `</label>` +
  `<input id="nature" type="hidden" value="${esc(p.nature)}">
 <details>` +
  `<summary>同一天有多次检查？填写采样时间</summary>` +
  `<label class="field">采样时间（可不填）<input id="observed-at" value="${esc(p.observedAt||'')}" placeholder="例如 2026-01-01T08:00:00+08:00">` +
  `</label>` +
  `<p class="muted">同一天同一指标有多个数值时，需靠采样时间区分。记录时区：${esc(zone)}。</p>` +
  `</details>
 <div id="observations">${p.reportRows?renderReportRows(p.reportRows,row)+(p.manualObservations||[]).map(row).join(''):p.observations.map(row).join('')}</div>${button('add-metric','＋ 添加指标')}${clinicalFlags(p.clinicalFlags||{})}<label class="field">病程与备注<textarea id="note" maxlength="10000">${esc(p.note)}</textarea>` +
  `</label>` +
  `<p class="muted">图片识别可能有错，请对照原图核对数值和单位。</p>${button('prepare-review','下一步：存数据','primary wide')}${button('back-source','返回选资料','wide')}</section>` +
  `</form>`;
}

function confirmationStep() {
 return `<section class="panel" id="confirmation" hidden>` +
  `<h2>存数据</h2><p class="muted">由你确认后存入本机病程，方便看变化或就诊时出示。不会自动发送；清理网站数据会丢失，请到“本机”导出备份。</p>` +
  `<div id="review-summary">` +
  `</div>` +
  `<p id="review-status">核对完成后才能保存。</p>` +
  `<label class="check">` +
  `<input id="confirmed" type="checkbox" disabled>我已核对，确认保存。</label>${button('save','确认保存','primary wide')}${button('edit-review','返回修改','wide')}</section>`;
}
