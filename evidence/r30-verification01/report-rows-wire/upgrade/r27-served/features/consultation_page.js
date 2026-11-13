import {esc,button} from '../app/ui.js';
import {stepLabels} from './step_labels.js';

export function consultationPage(page,selected,hasPrevious){
 const choices=page.items.map(e=>`<article class="consult-selection">
  <label><input type="checkbox" class="consult-select" value="${esc(e.id)}" ${selected.has(e.id)?'checked':''}><span>${esc(e.payload.clinicalDate)}</span></label>
  <p>${esc(e.payload.observations.slice(0,4).map(o=>o.displayName+' '+(o.comparator||'')+o.valueLiteral+' '+o.unit).join('；')||e.payload.note.slice(0,120))}</p>
 </article>`).join('');
 return `<h1>问诊卡</h1>
 ${stepLabels('consult',['选状态','给话术','问 AI'],'问诊步骤')}
 <section id="consult-selection-step" class="panel">
  <h2>选状态</h2>
  <p class="muted">就诊前，选出想和医生讨论的病程，可跨页选，最多50条。只在本机选择，不会发送。</p>
  <p id="selection-count">已选 ${selected.size} 条</p>
  <div id="consultation-records" tabindex="0" role="group" aria-label="可选的近期病程">${choices||'<p class="empty">还没有病程，先去“录入”记一条。</p>'}</div>
  <div class="consult-actions">${hasPrevious?button('consult-prev','上一页'):''}${page.next?button('consult-next','更早的病程'):''}${button('clear-selection','取消所有选择')}</div>
  <p class="muted">本机按所选病程整理，不用 AI。只带检查数值和身体情况，不带姓名、具体日期、备注或图片。</p>
  ${button('generate-consultation','下一步：给话术','primary wide')}
  ${button('open-consultation','查看已存话术','wide')}
 </section>
 <p id="consultation-status" role="status"></p>
 <div id="consult-generated" hidden>
 <p id="draft-save-status" role="status"></p>
 <div class="consult-actions">${button('draft-retry','重试保存')}${button('draft-reload','载入最新草稿')}</div>
  <p id="draft-stale" role="status" hidden>病程或选择已变。已保留补充文字，这份卡尚未更新；重新生成前可先下载。</p>
 <section id="consult-card-step" class="panel" hidden>
  <h2>给话术</h2>
  <p class="muted">这份问诊卡可补充后直接给医生看，没有 AI 也能用。自动存在此浏览器，未放进病程备份，请另外下载。</p>
  <label class="field">问诊内容（可以修改）<textarea id="consultation-text" class="dossier" maxlength="1000000"></textarea></label>
  ${button('copy-consultation','复制问诊卡','wide')}
  ${button('export-draft','下载问诊卡','wide')}
  <p class="muted">分享前请再检查，补充文字可能含个人信息。检查结果的组合仍可能让人认出你。</p>
  ${button('back-selection','返回选状态','wide')}
  ${button('open-ai','下一步：问 AI（可选）','primary wide')}
 </section>
 <section id="consult-ai-step" class="panel" hidden>
   <h2>问 AI（可选）</h2>
   <p class="muted">想先准备问医生的问题时，可把下面预制提示词和问诊卡复制到你自己的 AI 工具。这一步不调用 AI，也不自动发送。</p>
   <p class="muted">粘贴发送后，对方才会收到内容；请先检查个人信息，不传原图。AI 回答仅帮你准备问题，就医和用药请问医生。</p>
   <textarea id="ai-prompt" aria-label="预制AI问诊提示词，含当前问诊卡" readonly></textarea>
   ${button('copy-prompt','复制提示词和问诊内容','wide')}
   ${button('back-card','返回给话术','wide')}
 </section>
  <p id="copy-status" role="status"></p>
 </div>`;
}
