import {esc} from '../app/ui.js';

export function stepLabels(flow,labels,description) {
 const attribute=flow==='editor'?'data-editor-step':'data-consult-step';
 return `<ol class="step-labels" aria-label="${esc(description)}">`+
  labels.map((label,index)=>`<li ${attribute}="${index+1}">${index+1} ${esc(label)}</li>`).join('')+
  '</ol>';
}
