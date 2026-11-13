import {reportDetails} from '../features/report_rows.js';
import {originNote} from '../features/ocr_evidence.js';
import {OcrReview} from './ocr_review.js';
import {esc} from './ui.js';
import {FLAG_LABELS} from '../features/health_labels.js';
import {StepFlow} from './step_flow.js';
// Owns visibility only. Review data, confirmation and saves stay with main/Service.
export class EditorFlow extends StepFlow {
 constructor(root,getSource=()=>null){
  super(root,['source-step','review-step','confirmation'],'data-editor-step');this.hasSource=false;
  for(const [id,target]of [['ocr-status','#source-name'],['ocr-review-status','#review-step > p']]){
   const p=document.createElement('p');p.id=id;p.className='muted';p.hidden=true;p.setAttribute('role','status');root.querySelector(target).after(p);
  }
  this.evidence=new OcrReview(root,getSource);this.show(1);
 }
 selected(){this.evidence.refresh();this.hasSource=true;for(const id of ['ocr-status','ocr-review-status'])this.root.querySelector('#'+id).hidden=true;this.root.querySelector('#start-review').textContent='下一步：核信息（不上传）';}
 ocrWaiting(waiting){
  const status=this.root.querySelector('#ocr-status');status.hidden=!waiting;
  status.textContent=waiting?'正在识别并整理指标，请稍候。完成后会自动进入核对，不会自动保存。':'';
  this.root.querySelector('#start-review').textContent=waiting?'取消等待，改为手填':this.hasSource?'下一步：核信息（不上传）':'直接手填';
 }
 ocrResult(count,coverage=null){
  const message=count?`已整理 ${count} 项，请逐项核对后勾选。日期和采样时间请自己核对。${coverage?.pendingRows?'其中 '+coverage.pendingRows+' 项需要对照原图补填结果。':''}${coverage?.unpairedFragments?'另有 '+coverage.unpairedFragments+' 段文字（含表头等）保留在原文，可展开查看。':''}${coverage?.capped?'本次最多整理100项，其余请查看原文。':''}`:'图片文字已识别，但没整理出可用指标。请查看原文后手填，不用重复上传。';
  for(const id of ['ocr-status','ocr-review-status']){const p=this.root.querySelector('#'+id);p.textContent=message;p.hidden=false;}
  if(count)this.show(2);
  else{this.show(1);this.root.querySelector('#ledger').closest('details').open=true;this.root.querySelector('#start-review').textContent='查看原文后手填';}
  return message;
 }
 dispose(){this.evidence.dispose();}
 changed(){this.evidence.refresh();this.root.querySelector('#ocr-review-status').hidden=true;if(this.step===3)this.show(2);}
 ready(payload){
  this.root.querySelector('#review-summary').innerHTML=`<p>${esc(payload.clinicalDate)}</p>${reportDetails(payload)}${(payload.reportRows?payload.manualObservations:payload.observations).map(o=>`<p>${esc(o.displayName)} ${esc(o.comparator||'')}${esc(o.valueLiteral)} ${esc(o.unit)}${originNote(o)}</p>`).join('')}${Object.entries(payload.clinicalFlags||{}).filter(([,v])=>typeof v==='boolean').map(([k,v])=>`<p>${esc(FLAG_LABELS[k]||k)}：${v?'是':'否'}</p>`).join('')}${payload.note?`<p class="keep-lines">${esc(payload.note)}</p>`:''}<p class="muted">请再看一遍数值、单位和已填的身体情况。</p>`;
  this.show(3);
 }
}
