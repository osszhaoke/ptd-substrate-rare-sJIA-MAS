(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);},pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async f=>{for(let i=0;i<600;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 const {metricUnit:awaitUnit}=await import('/domain/report/fields.js');
 const cfg={...window.__PROBE_INPUT__};if(cfg.fontScale)document.documentElement.style.fontSize=(16*Number(cfg.fontScale)/100)+'px';for(const k of ['expected','ledger','imageCells'])if(cfg[k])cfg[k]=JSON.parse(cfg[k]);
 const {RecordStore}=await import('/storage/store.js'),store=new RecordStore();window.confirm=()=>true;
 if(cfg.mode==='read'){
  const marker=await store.get('meta','ocr-review-event'),d=marker&&await store.detail(marker.eventId),o=d?.event.payload.observations[0];
  ok(o?.ocrOrigin&&o.valueLiteral==='9.50'&&o.ocrOrigin.valueLiteral===cfg.original,'PROCESS_CORRECTION_LOST');
  ok(o.comparator==='>'&&o.ocrOrigin.comparator===null,'PROCESS_COMPARATOR_LOST');
  await wait(()=>$('.open-event'));$('.open-event').click();await wait(()=>$('#delete-record'));
  ok($('.ocr-origin-note').textContent.includes('你修改后保存')&&$('.ocr-origin-note').textContent.includes(cfg.original),'DETAIL_CORRECTION_LOST');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,eventId:marker.eventId,exactOriginalAndCorrection:true});return;
 }
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
 $('[data-nav="capture"]').click();await wait(()=>$('#ocr'));
 const live=new Set(),revoked=new Set(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
 URL.createObjectURL=blob=>{const u=create(blob);live.add(u);return u;};URL.revokeObjectURL=u=>{live.delete(u);revoked.add(u);revoke(u);};
 const native=window.fetch;let release,calls=0;
 window.fetch=(url,options)=>{
  if(url==='/api/ocr'){calls++;if(cfg.ledger)return new Promise(r=>release=r);}
  return native(url,options);
 };
 let blob;
 if(cfg.imageBase64)blob=new Blob([Uint8Array.from(atob(cfg.imageBase64),c=>c.charCodeAt(0))],{type:'image/jpeg'});
 else if(cfg.imageCells){
  const canvas=document.createElement('canvas');canvas.width=1300;canvas.height=240;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1300,240);ctx.fillStyle='black';ctx.font='16px sans-serif';ctx.textBaseline='top';
  for(const l of cfg.imageCells)ctx.fillText(l.text,l.coordinates[0].x,l.coordinates[0].y);
  blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 }else blob=await(await fetch('/fixture.png')).blob();
 const file=new File([blob],'review-source.'+(cfg.imageBase64?'jpg':'png'),{type:blob.type});
 const choose=async name=>{const f=new File([blob],name,{type:blob.type});Object.defineProperty($('#image'),'files',{value:[f],configurable:true});$('#image').dispatchEvent(new Event('change'));await wait(()=>$('#source-name').textContent===name);};
 await choose(file.name);$('#trial-token').value=cfg.token;$('#upload-consent').checked=true;$('#ocr').click();
 if(cfg.ledger){await wait(()=>typeof release==='function');release(new Response(JSON.stringify({ledger:cfg.ledger}),{status:200}));}
 await wait(()=>document.querySelectorAll('.metric-row').length===5&&!$('#ocr').disabled);
 const rows=[...document.querySelectorAll('.metric-row')];ok(rows.every(r=>r.dataset.ocrOrigin),'ORIGIN_SNAPSHOT_MISSING');
 ok(JSON.stringify(rows.map(r=>[r.querySelector('.metric-code').value,r.querySelector('.metric-value').value,awaitUnit(r.querySelector('.metric-code').value,r.querySelector('.metric-unit').value)]))===JSON.stringify(cfg.expected),'CANDIDATES_CHANGED');
 const row=rows[0],original=JSON.parse(row.dataset.ocrOrigin),refs=JSON.parse(row.dataset.lines);row.querySelector('[data-ocr-source]').click();
 await wait(()=>$('.ocr-review-preview img').naturalWidth>0&&$('.ocr-evidence-status').textContent.includes(cfg.mode==='fallback'?'没有可靠的位置':'框内'));
 const source=(await import('/features/ocr_evidence.js')),polys=[...document.querySelectorAll('.ocr-review-preview polygon')];
 ok(polys.length===(cfg.mode==='fallback'?0:refs.length),'SOURCE_POLYGONS_MISSING');
 const image=$('.ocr-review-preview img'),expectedPolygons=source.evidencePolygons({ledger:cfg.ledger||{provider:'tencent-general-accurate',mapping:'coordinates=Polygon'}},cfg.ledger?cfg.ledger.lines.filter(l=>refs.includes(l.id)):JSON.parse($('#ledger details pre').textContent).filter(l=>refs.includes(l.id)),image.naturalWidth,image.naturalHeight);
 ok(JSON.stringify(polys.map(p=>p.getAttribute('points')))===JSON.stringify(expectedPolygons),'SOURCE_POLYGONS_CHANGED');
 ok($('.ocr-evidence-lines').textContent.includes(original.valueLiteral),'SOURCE_LITERAL_HIDDEN');
 ok($('.ocr-review-preview').previousElementSibling===row,'PREVIEW_NOT_BY_SELECTED_ROW');
 const imageURL=image.src;ok(live.size===1&&live.has(imageURL),'PREVIEW_OWNER_COUNT');
 $('.ocr-image-zoom').click();ok($('.ocr-image-frame').style.width===image.naturalWidth+'px','ZOOM_NOT_APPLIED');
 ok(document.documentElement.scrollWidth<=innerWidth+2,'ZOOM_PAGE_OVERFLOW');$('.ocr-image-zoom').click();
 dispatchEvent(new Event('pagehide'));ok(live.size===0,'PAGEHIDE_URL_LEAK');row.querySelector('[data-ocr-source]').click();await wait(()=>$('.ocr-review-preview img').naturalWidth>0);ok(live.size===1,'RESUMED_PREVIEW_UNAVAILABLE');
 if(cfg.mode==='preview'){
  const visible=[...document.querySelectorAll('.ocr-review-preview *, .metric-row *')].filter(e=>e.children.length===0&&e.getClientRects().length&&e.textContent.trim());
  ok(visible.every(e=>parseFloat(getComputedStyle(e).fontSize)>=14),'OCR_TEXT_TOO_SMALL');
  ok(document.documentElement.scrollWidth<=innerWidth+2,'PREVIEW_PAGE_OVERFLOW');
  $('.ocr-review-preview').scrollIntoView({block:'start'});
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,sourceHighlights:true,width:innerWidth,fontScale:cfg.fontScale||'100',noFormalSave:true,paidProviderCalls:0});return;
 }
 const input=row.querySelector('.metric-value');input.value='9.50';input.dispatchEvent(new Event('input',{bubbles:true}));
 const cmp=row.querySelector('.metric-comparator');cmp.value='>';cmp.dispatchEvent(new Event('change',{bubbles:true}));
 ok(row.querySelector('.ocr-row-status').textContent.includes('你已修改'),'CORRECTION_FEEDBACK_MISSING');
 ok(JSON.parse(row.dataset.ocrOrigin).valueLiteral===original.valueLiteral,'ORIGINAL_OVERWRITTEN');
 ok((await store.page()).items.length===0,'PREVIEW_AUTO_SAVE');
 if(cfg.mode==='private-replay'){
  $('[data-nav="records"]').click();await wait(()=>$('.state-overview'));ok(live.size===0,'PREVIEW_URL_LEAK');ok(calls===1,'AUTOMATIC_RETRY');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,observations:5,sourceLines:cfg.ledger.lines.length,originalHighlights:true,correctionVisible:true,noFormalSave:true,providerCalls:0,localReplays:calls,previewReleased:true});return;
 }
 if(cfg.mode==='fallback'){
  ok($('.ocr-evidence-lines').textContent.includes(original.valueLiteral),'FALLBACK_TEXT_LOST');
  row.querySelector('.remove-metric').click();ok(live.size===0&&$('.ocr-review-preview').hidden,'REMOVED_ROW_PREVIEW_RETAINED');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,missingCoordinatesShowRaw:true,removedRowReleasesPreview:true});return;
 }
 if(cfg.mode==='replace'){
  $('#back-source').click();await choose('replacement.png');ok(live.size===0&&revoked.has(imageURL),'REPLACEMENT_URL_LEAK');
  ok([...document.querySelectorAll('.metric-row')].every(r=>!r.dataset.ocrOrigin&&r.dataset.lines==='[]'),'FOREIGN_SOURCE_LINK_RETAINED');
  $('[data-nav="records"]').click();await wait(()=>$('.state-overview'));ok(live.size===0,'PREVIEW_URL_LEAK');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,replacementDetached:true,previewReleased:true});return;
 }
 $('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));for(const check of document.querySelectorAll('.report-checked')){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}$('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);
 ok($('.ocr-origin-note').textContent.includes(original.valueLiteral),'CONFIRMATION_ORIGIN_HIDDEN');ok(!$('#confirmed').checked&&$('#save').disabled,'CONFIRMATION_PREAPPROVED');
 $('#resume-draft').click();await wait(()=>$('.draft'));ok(live.size===0,'DRAFT_NAVIGATION_URL_LEAK');$('.draft').click();await wait(()=>$('#edit-review'));
 $('#edit-review').click();await wait(()=>!$('#review-step').hidden);ok(JSON.parse($('.metric-row').dataset.ocrOrigin).valueLiteral===original.valueLiteral,'DRAFT_SNAPSHOT_LOST');
 $('.metric-row [data-ocr-source]').click();await wait(()=>$('.ocr-review-preview img').naturalWidth>0);ok(live.size===1,'DRAFT_PREVIEW_UNAVAILABLE');
 for(const check of document.querySelectorAll('.report-checked')){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}$('#prepare-review').click();await wait(()=>!$('#confirmed').disabled);$('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
 ok(live.size===0,'PREVIEW_URL_LEAK');ok($('.ocr-origin-note').textContent.includes('你修改后保存'),'DETAIL_CORRECTION_LOST');
 const page=await store.page(),eventId=page.items[0].id,d=await store.detail(eventId),o=d.event.payload.observations[0];
 ok(page.items.length===1&&o.valueLiteral==='9.50'&&o.comparator==='>','CORRECTION_NOT_SAVED');ok(JSON.stringify(o.ocrOrigin)===JSON.stringify(original),'SAVED_ORIGIN_CHANGED');
 ok(JSON.stringify(o.sourceLineIds)===JSON.stringify(refs),'SAVED_SOURCE_CHANGED');ok(calls===1,'AUTOMATIC_RETRY');
 const backup=await import('/storage/backup.js'),encrypted=await backup.exportBackup(store,'synthetic-review-password');
 const target=new RecordStore('ocr-restore-'+crypto.randomUUID());await target.open();
 const inspection=await backup.inspectBackup(encrypted,'synthetic-review-password',target);await backup.restoreBackup(target,inspection);
 const restored=await target.detail(eventId);ok(JSON.stringify(restored.event.payload.observations[0].ocrOrigin)===JSON.stringify(original),'BACKUP_ORIGIN_LOST');
 ok(restored.event.payload.observations[0].valueLiteral==='9.50'&&(await target.reviews()).length===0,'BACKUP_CORRECTION_OR_PERMISSION');target.close();
 await store.meta({id:'ocr-review-event',eventId});store.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,eventId,original:original.valueLiteral,observations:5,sourcePolygons:polys.length,explicitSyntheticConfirmation:true,previewReleased:true,backupRoundTrip:true,requests:calls});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
