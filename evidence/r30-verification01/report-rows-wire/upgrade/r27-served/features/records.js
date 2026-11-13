import {reportDetails} from './report_rows.js';
import {originNote} from './ocr_evidence.js';
import {esc,button} from '../app/ui.js';
import {ledgerView} from './editor.js';
import {FLAG_LABELS as FLAGS} from './health_labels.js';
import {today} from '../domain/model.js';
export function recordsPage(page,date='',states=''){

 return `<h1 class="sr-only">状态与近期病程</h1>${states}<div class="calendar-head row">` +
  `<h2>近期病程</h2>` +
  `<input id="filter-date" aria-label="筛选日期" type="date" value="${esc(date)}">${button('clear-date','全部')}</div>` +
  `<div id="calendar-days" class="week">` +
  `</div>` +
  `<p class="muted">按日期从近到远排列。</p>` +
  `<div class="timeline">${page.items.map(e=>`<article class="event">` +
  `<div class="event-head">` +
  `<span>${esc(e.payload.clinicalDate)}</span>` +
  `</div>` +
  `<p>${(e.payload.reportRows?[...e.payload.reportRows.map(r=>({...r,displayName:r.name})),...e.payload.manualObservations].slice(0,4):e.payload.observations).map(o=>`${esc(o.displayName)} ${esc(o.comparator||'')}${esc(o.valueLiteral)} ${esc(o.unit)}`).join('；')||esc(e.payload.note.slice(0,160))}${e.payload.reportRows?'；共 '+(e.payload.reportRows.length+e.payload.manualObservations.length)+' 项，详情可看完整报告。':''}</p>` +
  `<button class="open-event" data-id="${esc(e.id)}">查看详情</button>` +
  `</article>`).join('')||'<div class="empty">这里还没有记录。<br>从一次手工录入开始。</div>'}</div>${page.next?button('next-page','下一页','wide'):''}`;
}
export function calendarDays(date,zone){const anchor=new Date((date||today(zone))+'T12:00:00Z');
 return Array.from({length:7},(_,i)=>{const d=new Date(anchor);
 d.setUTCDate(d.getUTCDate()-6+i);
 const day=d.toISOString().slice(0,10);
 return `<button class="day ${day===date?'selected':''}" data-date="${day}">${['日','一','二','三','四','五','六'][d.getUTCDay()]}<strong>${d.getUTCDate()}</strong>` +
  `<small>${d.getUTCMonth()+1}月</small>` +
  `</button>`;
 }).join('');
 }
export function detailPage(event,receipt,source){const p=event.payload;
 return `<h1>${esc(p.clinicalDate)}</h1>` +
  `<section class="panel">` +
  `<span class="badge">${p.sourceKind==='OCR'?'在线识别':'手工录入'} · 已核对</span>` +
  `<p class="muted">时区 ${esc(p.instanceTimezone)}</p>${reportDetails(p)}${(p.reportRows?p.manualObservations:p.observations).map(o=>`<p>` +
  `<b>${esc(o.displayName)}</b> ${esc(o.comparator||'')}${esc(o.valueLiteral)} ${esc(o.unit)}<br>` +
  `<small>${o.sourceLineIds.length?'已关联图片原文':'手工填写'}</small>` +
  `${originNote(o)}</p>`).join('')}${Object.entries(p.clinicalFlags||{}).filter(([,v])=>v!==null).map(([k,v])=>`<p>${esc(FLAGS[k]||k)}：${v?'是':'否'}</p>`).join('')}<pre>${esc(p.note)}</pre>` +
  `</section>` +
  `<details class="panel">` +
  `<summary>保存详情</summary>` +
  `<p class="hash">${esc(receipt.id)}<br>${esc(receipt.at)}<br>内容摘要 ${esc(receipt.digest)}</p>` +
  `</details>` +
  `<section class="panel">${ledgerView(source)}</section>` +
  `<p class="muted">删除后无法找回，请先备份。</p>${button('delete-record','删除这条记录和原图','danger wide')}${button('back-records','返回状态','wide')}`;
 }
