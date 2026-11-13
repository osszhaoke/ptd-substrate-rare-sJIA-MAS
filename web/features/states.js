import {esc,button} from '../app/ui.js';
import {FLAG_LABELS} from './health_labels.js';
import {RULES,RESULT_ZH,LABELS as RULE_LABELS} from '../domain/state/catalog.js';
import {PACK} from '../rules/definitions.js';
import {ruleInputCodes} from '../domain/state/project.js';
import {metricChange} from '../domain/state/select.js';
import {dec} from '../domain/state/decimal.js';
const LABELS={...RULE_LABELS,...FLAG_LABELS};
const truth=v=>v===true?'满足':v===false?'不满足':'未知';
const result=r=>r?RESULT_ZH[r.result]:'暂无数据';
function hint(r,id){if(!r)return'等待已保存的记录';
 if(id==='R2')return`符合 ${r.met_count}/8 项 · ${r.unknown_count} 项不清楚`;
 if(id==='R1')return`其他条件 ${r.additional_true}/4 · 适用条件${truth(r.gate.outcome)}`;
 return r.score===null?'还缺评分所需资料':`参考分界 ≥−2.1 · ${result(r)}`;
 }
export function stateCards(snapshot,enabled=true){const point=snapshot?.points[0];
 return `<section class="state-overview" aria-label="sJIA·MAS状态">` +
  `<div class="section-label row">` +
  `<h2>sJIA·MAS</h2>` +
  `</div>${point?`<p class="muted">${esc('截至 '+point.date)}</p>`:''}${enabled?`<div class="state-cards">${RULES.map(rule=>{const r=point?.rules[rule.id];return `<button class="state-card" data-state-rule="${rule.id}">` +
  `<span class="state-name">${rule.name}</span>` +
  `<strong>${esc(rule.id==='R3'?(r?.score??'—'):result(r))}</strong>` +
  `<small>${esc(hint(r,rule.id))}</small>${rule.id==='R3'&&r?.score!==null&&r?.result==='INDETERMINATE'?'<small>适用条件或资料不清楚</small>':''}</button>`;}).join('')}</div>`:'<p class="muted">暂无结果。</p>'}${snapshot?.excludedTimezone?'<p class="muted">有些记录的时区不同，未放入这次计算。</p>':''}</section>`;
 }
function criterionRows(rule){const parts=[...(rule?.gate.items||[]),...(rule?.criteria||[]),...(rule?.required||[]),...(rule?.additional||[])];
 return parts;
 }
function itemLabel(item){if(item.id)return LABELS[item.id]||item.id;
 if(item.code||item.flag)return LABELS[item.code||item.flag]||item.code||item.flag;
 return item.any?'任一条件':'组合条件';
 }
function conditions(r){return criterionRows(r).map(c=>`<div class="state-condition">` +
  `<span>${esc(itemLabel(c))}</span>` +
  `<b>${truth(c.outcome)}</b>` +
  `</div>`).join('');
 }
const display=v=>!v?'缺数据':v.conflict?'数值有冲突':typeof v.value==='boolean'?(v.value?'是':'否'):v.value===null?'未知':`${v.comparator||''}${v.value}${v.unit?' '+v.unit:''}`;
function changeRows(codes,now,prev){return codes.map(code=>{const c=metricChange(now?.values[code],prev?.values[code]);
 const change=c.available?(c.delta===null?'标记对照':`差 ${c.delta}${now.values[code].unit?' '+now.values[code].unit:''}${c.percent===null?' · '+(c.reason||'百分比不可用'):' · '+c.percent+'%'}`):c.reason;
 return `<tr>` +
  `<th scope="row">${esc(LABELS[code]||code)}</th>` +
  `<td>${esc(display(prev?.values[code]))}</td>` +
  `<td>${esc(display(now?.values[code]))}</td>` +
  `<td>${esc(change)}</td>` +
  `</tr>`;
 }).join('');
 }
export function stateDetail(snapshot,id,{history=false,date=null}={}){
 const rule=RULES.find(x=>x.id===id);
 if(!rule)throw Error('RULE_UNKNOWN');
 const index=date?snapshot.points.findIndex(x=>x.date===date):0;
 if(date&&index<0)throw Error('STATE_DATE_GONE');
 const def=PACK.rules[id],point=snapshot.points[Math.max(0,index)],prev=snapshot.points[Math.max(0,index)+1],r=point?.rules[id],before=prev?.rules[id],codes=ruleInputCodes(def);
 const refs=point?[...new Set(codes.flatMap(c=>point.values[c]?.refs||[]))]:[];
 const sources=refs.map(ref=>point.sources[ref]).filter(Boolean);
 const scoreDiff=id==='R3'&&r?.score!=null&&before?.score!=null&&r.gate.outcome===true&&before.gate.outcome===true?dec(r.score).sub(before.score).toString():null;
 return `<h1>${esc(rule.name)}</h1>` +
  `<p class="muted">${esc(point?.date||'没有记录日期')}</p>${currentResult(id,r)}${changesPanel(snapshot,id,history,point,prev,r,before,codes,scoreDiff)}${sourcesPanel(sources,rule,def,snapshot)}${button('back-records','返回状态','wide')}`;
}

// Chart geometry uses Number only for pixels; all scores and threshold decisions remain exact.
function scoreTrend(points){
 const rows=[...points].reverse(),valid=rows.map(p=>p.rules.R3.score===null?null:Number(p.rules.R3.score));
 if(!valid.some(x=>x!==null))return '<p class="muted">资料还不够，暂时画不出评分变化。</p>';
 const nums=valid.filter(x=>x!==null),lo=Math.min(...nums,-2.1)-0.2,hi=Math.max(...nums,-2.1)+0.2,xy=(v,i)=>[24+i*252/Math.max(1,rows.length-1),140-(v-lo)/(hi-lo)*110];
 let path='',pen=false;
 valid.forEach((v,i)=>{if(v===null){pen=false;
 return;
 }const [x,y]=xy(v,i);
 path+=(pen?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' ';
 pen=true;
 });
 const threshold=xy(-2.1,0)[1];
 return `<figure class="score-trend">` +
  `<svg viewBox="0 0 300 180" role="img" aria-label="MS评分随采集日变化，缺项处断开">` +
  `<line x1="24" x2="276" y1="${threshold}" y2="${threshold}" stroke="#999" stroke-dasharray="4 3"/>` +
  `<path d="${path}" fill="none" stroke="#252525" stroke-width="2"/>${valid.map((v,i)=>{if(v===null)return '';const[x,y]=xy(v,i);return `<circle cx="${x}" cy="${y}" r="3" fill="#ae0011">` +
  `<title>${esc(rows[i].date)}：${esc(rows[i].rules.R3.score)}</title>` +
  `</circle>`;}).join('')}</svg>` +
  `<div class="trend-dates">` +
  `<span>${esc(rows[0].date)}</span>` +
  `<span>${esc(rows.at(-1).date)}</span>` +
  `</div>` +
  `<figcaption>MS分数 · 虚线为原界值 −2.1；资料不全时断开，点开记录可看详情。</figcaption>` +
  `</figure>`;
}

function currentResult(id,r) {
 return `<section class="panel">` +
  `<h2>本次结果</h2>` +
  `<p class="state-result">${esc(id==='R3'?(r?.score??'—'):result(r))}</p>` +
  `<p>${esc(hint(r,id))}</p>${id==='R3'&&r?`<p>判定：${result(r)} · 前提${truth(r.gate.outcome)}</p>`:''}${r?conditions(r):'<p>请先录入并确认相关资料。</p>'}${r?.missing.length?`<p>还需补充或核对：${r.missing.map(c=>esc(LABELS[c]||c)).join('、')}</p>`:''}${r?.censored?.length?'<p>数值带有“大于”或“小于”时，不能算出精确MS分数。</p>':''}<p class="muted">没达到条件也不代表没有风险。不清楚的不会当成没有。</p>${button('state-add-data','补充资料','wide')}</section>`;
}

function changesPanel(snapshot,id,history,point,prev,r,before,codes,scoreDiff) {
 return `<section class="panel">` +
  `<h2>变化</h2>${id==='R3'?scoreTrend(snapshot.points):''}<p>${esc(prev?prev.date+' → '+point.date:'再有一天可用记录，才能比较变化')}</p>${prev?`<p>判定：${esc(result(before))} → ${esc(result(r))}</p>${id==='R3'?`<p>分数：${esc(before?.score??'—')} → ${esc(r?.score??'—')}${scoreDiff===null?' · 资料或前提不足时不计算分差':' · 分差 '+esc(scoreDiff)}</p>`:id==='R2'?`<p>满足项：${before.met_count} → ${r.met_count}；未知项：${before.unknown_count} → ${r.unknown_count}</p>`:`<p>附加满足项：${before.additional_true} → ${r.additional_true}；前提：${truth(before.gate.outcome)} → ${truth(r.gate.outcome)}</p>`}`:''}<div class="table-scroll">` +
  `<table class="state-changes">` +
  `<caption>本规则输入变化</caption>` +
  `<thead>` +
  `<tr>` +
  `<th>指标／条件</th>` +
  `<th>上次</th>` +
  `<th>本次</th>` +
  `<th>变化</th>` +
  `</tr>` +
  `</thead>` +
  `<tbody>${changeRows(codes,point,prev)}</tbody>` +
  `</table>` +
  `</div>` +
  `<details>` +
  `<summary>按日期查看变化</summary>` +
  `<p class="muted">资料不全时显示“—”。这些变化不等于风险高低。</p>${snapshot.points.map(p=>{const x=p.rules[id];return `<div class="state-history">` +
  `<button class="link" data-state-date="${esc(p.date)}">${esc(p.date)}</button>` +
  `<b>${esc(id==='R3'?(x.score??'—'):result(x))}</b>` +
  `<small>${esc(hint(x,id))}</small>` +
  `</div>`;}).join('')}</details>${!history?button('state-history','查看更多日期','wide'):snapshot.next?button('state-earlier','更早的记录','wide'):''}<p class="muted">数值升降不等于病情变好或变坏，请让医生结合症状看。</p>` +
  `</section>`;
}

function sourcesPanel(sources,rule,def,snapshot) {
 return `<section class="panel">` +
  `<h2>依据与来源</h2>` +
  `<details>` +
  `<summary>用了哪些资料</summary>${sources.length?sources.map(x=>`<p>` +
  `<button class="link state-source" data-id="${esc(x.eventId)}">${esc(LABELS[x.code]||x.code)} · ${esc(x.literal??(x.value?'是':'否'))} ${esc(x.originalUnit||'')}</button>` +
  `<br>` +
  `<small>${x.sourceLineIds.length?'已关联原文':'手工填写'}</small>` +
  `</p>`).join(''):'<p>还没有可用资料。</p>'}</details>` +
  `<details>` +
  `<summary>计算方法 · ${esc(rule.name)}</summary>` +
  `<p>${esc(rule.summary)}</p>` +
  `<pre>${esc(JSON.stringify(def,null,2))}</pre>` +
  `</details>` +
  `<details>` +
  `<summary>规则版本与原文</summary>` +
  `<p>${esc(rule.ref)} · 待专家核实</p>` +
  `<p>${esc(def.fidelity_zh||def.note_zh||'按原包登记，尚未完成专家核实。')}</p>` +
  `<a href="${rule.doi}" target="_blank" rel="noreferrer noopener">文献原文</a>` +
  `<pre>${esc(JSON.stringify(snapshot.binding,null,2))}</pre>` +
  `</details>` +
  `</section>`;
}
