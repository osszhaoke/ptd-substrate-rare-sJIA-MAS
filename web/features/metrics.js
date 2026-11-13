import {readReference} from '../domain/report/reference.js';
import {esc,button} from '../app/ui.js';
const status={EXACT:'',BOUND:'带比较符，只显示界限',TEXT:'文字结果，不计算数值差',INVALID:'信息待核对，不连线',CONFLICT:'同日次序不明或同刻重复，不连线'};
const pointText=p=>`${p.comparator||''}${p.valueLiteral} ${p.originalUnit}`.trim();
const summaryText=(g,p)=>g.latest===null&&p.status==='CONFLICT'?'有多条待核对结果':pointText(p);
const time=p=>p.observedAt||p.date+' · 仅日期';
export function metricChart(group) {
  const points=group.points.filter(p=>p.status==='EXACT');
  if(!points.length)return '<p class="metrics-disclosure">没有可画线的精确数值。每次结果见下方记录。</p>';
  // Bounded rendering; no downsampling that could hide extrema. Raw history remains paged below.
  const visible=points.slice(-200), refs=new Set(visible.map(p=>p.ref));
  const epoch=p=>p.observedAt?Date.parse(p.observedAt):Date.parse(p.date+'T00:00:00Z');
  const xs=visible.map(epoch),vs=visible.map(p=>Number(p.value)),lo=Math.min(...vs),hi=Math.max(...vs),start=Math.min(...xs),end=Math.max(...xs);
  const x=p=>end===start?180:12+(epoch(p)-start)/(end-start)*336;
  const y=p=>hi===lo?60:106-(Number(p.value)-lo)/(hi-lo)*92;
  const paths=group.segments.map(segment=>segment.filter(ref=>refs.has(ref)).map(ref=>visible.find(p=>p.ref===ref))).filter(a=>a.length);
  return `${points.length>200?'<p class="metrics-disclosure">图中为最近200个精确数值，完整记录可翻页查看。</p>':''}<svg class="metric-spark" viewBox="0 0 360 120" preserveAspectRatio="none" role="img" aria-label="${esc(group.displayName)}实际记录变化；缺项和冲突处断线">${paths.map(segment=>'<path d="'+segment.map((p,i)=>(i?'L':'M')+x(p).toFixed(2)+' '+y(p).toFixed(2)).join(' ')+'"/>').join('')}${visible.map(p=>`<circle cx="${x(p).toFixed(2)}" cy="${y(p).toFixed(2)}" r="3"><title>${esc(p.date+' '+pointText(p))}</title></circle>`).join('')}</svg><div class="metric-axis"><span>${esc(visible[0].date)}</span><span>${esc(visible.at(-1).date)}</span></div>`;
}
function identityNote(g){return g.identity==='REPORT_NAME'?'按报告原名对应，名称有误请对照原图核实。':'同一项目、同一单位的记录。';}
export function metricsPage(snapshot,{search='',offset=0}={}){
  const query=search.trim().toLocaleLowerCase(),all=snapshot.series.filter(g=>!query||[g.displayName,g.unit,...g.points.map(p=>p.originalName)].join(' ').toLocaleLowerCase().includes(query));
  const visible=all.slice(offset,offset+24);
  return `<h1>状态</h1><p class="muted">点开指标卡，查看每次变化和原记录。</p><form id="metric-filter" class="metrics-controls"><label class="field">查找项目<input id="metric-search" value="${esc(search)}" maxlength="100" placeholder="输入项目名称"></label><button type="submit">查找</button></form><div class="metrics-controls"><label class="field">按报告日期查看<input id="metric-date" type="date" value="${esc(snapshot.filterDate||'')}"></label>${button('metric-all-dates','全部日期')}</div><p class="metrics-disclosure">本页${snapshot.eventCount}份已保存记录，${all.length}组项目。${snapshot.next?'还有更早记录，可在下方翻页。':''}不同单位分开显示；文字结果保留原文。</p>${snapshot.excludedTimezone?'<p class="muted">另有时区不同的记录，请到“预警”的病程中查看。</p>':''}<div class="metrics-list">${visible.map(g=>{const latest=g.points.find(p=>p.ref===g.latest)||g.points.at(-1);return `<button class="state-card metric-card" data-metric-key="${esc(g.key)}"><b>${esc(g.displayName)}</b><span class="metric-value"><strong>${esc(summaryText(g,latest))}</strong></span><small>${esc(latest.date)} · 共${g.points.length}次</small>${metricChart(g)}<small>${esc(status[latest.status])}</small><small>${esc(identityNote(g))}</small><span>查看变化与来源 →</span></button>`;}).join('')}</div>${!all.length?'<p class="empty">本页没有符合条件的项目。可更换搜索、查看更早记录，或去“录入”保存一份资料。</p>':''}<div class="metrics-controls">${offset?button('metric-previous-cards','上一组项目'):''}${offset+24<all.length?button('metric-next-cards','下一组项目'):''}</div><section>${(snapshot.documents||[]).length?'<h2>其他已存资料</h2>':''}${(snapshot.documents||[]).map(d=>`<article class="metric-record"><b>${esc(d.date)}</b><p>${esc(d.note.slice(0,160))}</p><button data-metric-document="${esc(d.id)}">查看原记录</button></article>`).join('')}</section><div class="metrics-controls">${snapshot.before?button('metric-latest','回到最近记录'):''}${snapshot.next?button('metric-older','更早记录'):''}${button('metric-add','去录入')}</div>`;
}
export function metricDetail(group,{offset=0}={}){
  const latest=group.points.find(p=>p.ref===group.latest)||group.points.at(-1),history=[...group.points].reverse().slice(offset,offset+50);
  const change=group.change.available?`比前一次${group.change.delta.startsWith('-')?'减少':'增加'} ${esc(group.change.delta.replace(/^-/,'')+' '+group.unit)}${group.change.percent!==null?'（'+esc(group.change.percent)+'%）':''}`:'仅可比的精确数值计算差值。';
  return `<h1>${esc(group.displayName)}</h1>${button('metric-back','返回状态','wide')}<section class="panel"><p class="metric-value"><strong>${esc(summaryText(group,latest))}</strong></p><p>${esc(time(latest))}</p><p>${esc(status[latest.status])}</p><p class="metrics-disclosure">${esc(identityNote(group))}</p>${metricChart(group)}<p>${change}</p><p class="metrics-disclosure">变化只是记录对照，不代表病情或风险判断。参考范围按每份报告分别显示。</p></section><section class="panel"><h2>每次记录</h2>${history.map(p=>`<article class="metric-record"><b>${esc(p.date+' · '+pointText(p))}</b><p>${esc(p.originalName)}</p><small>${esc(time(p))}${p.referenceRange?' · 本单参考：'+esc(p.referenceRange):''}</small><small data-reference-quality="${esc(readReference(p.referenceRange).kind)}">${esc(readReference(p.referenceRange).hint)}</small><p>${esc(status[p.status])}</p><button data-metric-source="${esc(p.ref)}">查看原记录与来源</button></article>`).join('')}<div class="metrics-controls">${offset?button('metric-newer-values','较新结果'):''}${offset+50<group.points.length?button('metric-older-values','较早结果'):''}</div></section>`;
}
