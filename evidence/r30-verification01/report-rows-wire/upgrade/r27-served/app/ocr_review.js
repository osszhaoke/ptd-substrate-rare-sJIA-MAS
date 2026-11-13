import {readReportRow,reportWasCorrected} from '../features/report_rows.js';
import {evidenceIndex,evidencePolygons,originLabel} from '../features/ocr_evidence.js';
import {wasCorrected} from '../domain/ocr_review.js';
// One editor owns one object URL and delegated listener. No network, timers, or shared store.
export class OcrReview {
 constructor(root,getSource){
  this.root=root;this.getSource=getSource;this.events=new AbortController();this.disposed=false;
  this.panel=document.createElement('details');this.panel.className='ocr-review-preview';this.panel.hidden=true;
  this.panel.innerHTML='<summary>对照原图</summary><p class="muted ocr-evidence-status" role="status"></p><div class="ocr-image-scroll"><div class="ocr-image-frame"><img alt="本次录入的原图"><svg aria-hidden="true"></svg></div></div><button type="button" class="ocr-image-zoom">放大原图</button><pre class="ocr-evidence-lines"></pre>';
  root.querySelector('#review-step > p').after(this.panel);
  this.image=this.panel.querySelector('img');this.frame=this.panel.querySelector('.ocr-image-frame');this.svg=this.panel.querySelector('svg');
  root.addEventListener('click',e=>{const b=e.target.closest('[data-ocr-source]');if(b)this.open(b.closest('.metric-row,.report-row'));},{signal:this.events.signal});
  this.panel.querySelector('.ocr-image-zoom').onclick=()=>{
   this.zoom=!this.zoom;this.frame.style.width=this.zoom?`${this.image.naturalWidth}px`:'100%';
   this.panel.querySelector('.ocr-image-zoom').textContent=this.zoom?'缩回原图':'放大原图';
  };
  this.refresh();
 }
 releaseImage(){
  this.image.onload=null;this.image.onerror=null;this.image.removeAttribute('src');
  if(this.url)URL.revokeObjectURL(this.url);this.url=null;this.svg.replaceChildren();this.frame.style.width='100%';this.zoom=false;
  this.panel.querySelector('.ocr-image-zoom').textContent='放大原图';
 }
 refresh(){
  if(this.disposed)return;
  const source=this.getSource();if(source!==this.source){this.releaseImage();this.source=source;this.lookup=evidenceIndex(source);this.panel.hidden=true;this.panel.open=false;}
  if(this.selectedRow&&!this.selectedRow.isConnected)this.suspend();
  for(const row of this.root.querySelectorAll('.metric-row,.report-row')){
   let control=row.querySelector('[data-ocr-source]'),status=row.querySelector('.ocr-row-status');const ids=JSON.parse(row.dataset.lines);
   if(!ids.length){control?.remove();status?.remove();continue;}
   if(!control){control=document.createElement('button');control.type='button';control.dataset.ocrSource='';control.textContent='对照这项原图';row.append(control);}
   if(!status){status=document.createElement('small');status.className='ocr-row-status';status.setAttribute('role','status');row.append(status);}
   const origin=row.dataset.ocrOrigin?JSON.parse(row.dataset.ocrOrigin):null;
   const current={code:row.querySelector('.metric-code')?.value||null,valueLiteral:row.querySelector('.metric-value').value,unit:row.querySelector('.metric-unit').value,comparator:row.querySelector('.metric-comparator').value||null,ocrOrigin:origin};
   const report=row.dataset.report?readReportRow(row):null;
   status.textContent=report?(reportWasCorrected(report)?'你已修改，请重新对照原图。识别时为：':'识别时为：')+report.origin.name+' '+report.origin.valueLiteral+' '+report.origin.unit:origin?(wasCorrected(current)?'你已修改，请重新对照原图。识别时为：':'识别时为：')+originLabel(origin):'已关联原文；早期记录未保留修改前快照。';
  }
 }
 open(row){
  if(this.disposed)return;this.refresh();const s=this.source,lines=this.lookup(JSON.parse(row.dataset.lines));
  this.selectedRow=row;row.after(this.panel);this.panel.hidden=false;this.panel.open=true;this.panel.scrollIntoView({block:'start'});this.svg.replaceChildren();
  this.panel.querySelector('.ocr-evidence-lines').textContent=lines?lines.map(l=>`第${l.order+1}行${l.page?' · 第'+l.page+'页':''}：${l.text}`).join('\n'):'原文关联不完整，无法定位这项。请对照完整原图。';
  this.status=this.panel.querySelector('.ocr-evidence-status');this.status.textContent='正在打开本机原图，不会再次上传。';
  if(!s?.blob){this.status.textContent='本机原图不可用。';return;}
  this.lines=lines;
  if(this.url){this.draw();return;}
  const url=URL.createObjectURL(s.blob);this.url=url;
  this.image.onload=()=>{if(!this.disposed&&this.source===s&&this.url===url)this.draw();};
  this.image.onerror=()=>{if(!this.disposed&&this.url===url){this.releaseImage();this.status.textContent='原图暂时打不开，可再点一次或返回选资料下载原图核对。';}};
  this.image.src=url;
 }
 draw(){
  const w=this.image.naturalWidth,h=this.image.naturalHeight;if(!w||!h)return;
  const polygons=evidencePolygons(this.source,this.lines,w,h);this.svg.replaceChildren();this.svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  for(const points of polygons){const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');p.setAttribute('points',points);this.svg.append(p);}
  this.status.textContent=polygons.length?'框内是这项的识别来源，请核对名称、数值和单位。':'这项没有可靠的位置，已显示原图和关联原文，请自行对照。';
 }
 suspend(){this.releaseImage();this.panel.hidden=true;this.panel.open=false;this.selectedRow=null;}
 dispose(){if(this.disposed)return;this.disposed=true;this.events.abort();this.releaseImage();this.panel.remove();this.source=null;this.lines=null;this.selectedRow=null;this.getSource=()=>null;this.lookup=()=>null;this.panel.querySelector('.ocr-evidence-lines').textContent='';}
}
