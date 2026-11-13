import {FLAG_LABELS as FLAGS} from './health_labels.js';
import {esc} from '../app/ui.js';
export function clinicalFlags(flags={}) {
 const filled=Object.values(flags).filter(v=>v!==null).length;
 return `<details class="clinical-flags"><summary>症状和医生说过的情况 · ${filled}项已填写</summary>` +
  `<p class="muted">只填你知道的；不清楚就选“不清楚”。图片识别不会替你填写。</p>` +
  Object.entries(FLAGS).map(([key,label])=>flagSelect(key,label,flags[key])).join('') +
  `</details>`;
}

function flagSelect(key,label,value) {
 return `<label class="field">${esc(label)}<select data-clinical-flag="${key}">` +
  `<option value="unknown" ${value==null?'selected':''}>不清楚</option>` +
  `<option value="true" ${value===true?'selected':''}>是</option>` +
  `<option value="false" ${value===false?'selected':''}>否</option></select></label>`;
}

export function readFlags() {
 return Object.fromEntries(
  [...document.querySelectorAll('[data-clinical-flag]')].map(el=>[
   el.dataset.clinicalFlag,el.value==='unknown'?null:el.value==='true'
  ])
 );
}
