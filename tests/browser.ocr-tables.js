(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);},pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async f=>{for(let i=0;i<600;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 const {metricUnit:awaitUnit}=await import('/domain/report/fields.js');
 const cfg={...window.__PROBE_INPUT__};for(const k of ['expected','ledger','cancelLedger'])if(cfg[k])cfg[k]=JSON.parse(cfg[k]);cfg.lineCount=Number(cfg.lineCount);const {RecordStore}=await import('/storage/store.js'),store=new RecordStore();
 window.confirm=()=>true;
 if(cfg.mode==='read'){
  const marker=await store.get('meta','ocr-table-event'),d=marker&&await store.detail(marker.eventId);
  ok(d?.receipt&&d.event.payload.observations.length===5,'PROCESS_READBACK_LOST');ok(d.source.ledger.lines.length===cfg.lineCount,'SOURCE_LOST');
  ok(JSON.stringify(d.event.payload.observations.map(x=>[x.code,x.valueLiteral,x.unit]))===JSON.stringify(cfg.expected),'READBACK_VALUES_CHANGED');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,eventId:marker.eventId,observations:5});return;
 }
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
 $('[data-nav="capture"]').click();await wait(()=>$('#ocr'));
 const blob=cfg.imageBase64?new Blob([Uint8Array.from(atob(cfg.imageBase64),c=>c.charCodeAt(0))],{type:'image/jpeg'}):await(await fetch('/fixture.png')).blob();
 const file=new File([blob],'ocr-table-review.'+(cfg.imageBase64?'jpg':'png'),{type:blob.type});
 Object.defineProperty($('#image'),'files',{value:[file],configurable:true});$('#image').dispatchEvent(new Event('change'));
 await wait(()=>$('#source-name').textContent===file.name);ok($('#start-review').textContent==='下一步：核信息（不上传）','SELECTED_LABEL_STALE');
 const native=window.fetch;let release,calls=0;
 window.fetch=(url,options)=>{if(url==='/api/ocr'){calls++;if(cfg.mode==='cancel'||cfg.ledger)return new Promise(r=>release=r);}return native(url,options);};
 $('#start-review').click();await wait(()=>!$('#review-step').hidden);ok(calls===0,'NEXT_REVIEW_UPLOADED');
 $('#back-source').click();await wait(()=>!$('#source-step').hidden);
 $('#trial-token').value=cfg.token;$('#upload-consent').checked=true;
 $('#ocr').click();if(cfg.ledger||cfg.mode==='cancel')await wait(()=>typeof release==='function');else await wait(()=>$('#ocr').disabled);ok($('#ocr-status').textContent.includes('正在识别'),'WAITING_FEEDBACK_MISSING');
 if(cfg.ledger)release(new Response(JSON.stringify({ledger:cfg.ledger}),{status:200}));
 if(cfg.mode==='cancel'){
  await wait(()=>typeof release==='function');$('#start-review').click();await wait(()=>!$('#review-step').hidden);
  $('#add-metric').click();await wait(()=>$('.metric-value'));$('.metric-value').value='12.3';$('.metric-value').dispatchEvent(new Event('input',{bubbles:true}));
  release(new Response(JSON.stringify({ledger:cfg.cancelLedger}),{status:200}));await pause(100);
  ok($('.metric-value').value==='12.3'&&document.querySelectorAll('.metric-row').length===1,'LATE_OCR_REPLACED_MANUAL');ok(!$('#ocr').disabled,'CANCEL_STILL_BUSY');
  ok(calls===1,'AUTOMATIC_RETRY');ok((await store.page()).items.length===0,'CANCEL_AUTO_SAVE');
  store.close();window.fetch=native;window.webkit.messageHandlers.result.postMessage({ok:true,calls,manualPreserved:true});return;
 }
 if(cfg.mode==='zero'){
  await wait(()=>!$('#ocr').disabled&&$('#ledger').textContent.includes('无法识别的项目'));
  ok($('#ocr-status').textContent.includes('没整理出'),'ZERO_SUCCESS_FEEDBACK');
  ok(!$('#source-step').hidden&&$('#review-step').hidden,'ZERO_BLANK_REVIEW');ok($('#ledger').closest('details').open,'ZERO_ORIGINAL_HIDDEN');
  ok($('#ledger').textContent.includes('无法识别的项目'),'ZERO_TEXT_LOST');ok((await store.page()).items.length===0,'ZERO_AUTO_SAVE');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,emptyResultHonest:true,sourceRetained:true});return;
 }
 await wait(()=>document.querySelectorAll('.metric-row').length===5&&!$('#ocr').disabled);
 ok(!$('#review-step').hidden,'OCR_REVIEW_HIDDEN');ok($('#ocr-review-status').textContent.includes('已整理 '+document.querySelectorAll('[data-report]').length+' 项'),'COUNT_FEEDBACK_MISSING');
 const values=[...document.querySelectorAll('.metric-row')].map(el=>[el.querySelector('.metric-code').value,el.querySelector('.metric-value').value,(awaitUnit(el.querySelector('.metric-code').value,el.querySelector('.metric-unit').value))]);
 ok(JSON.stringify(values)===JSON.stringify(cfg.expected),'TABLE_CANDIDATES_INCORRECT');
 ok([...document.querySelectorAll('.metric-row')].every(el=>JSON.parse(el.dataset.lines).length>=3),'EVIDENCE_LINK_LOST');
 ok((await store.page()).items.length===0,'OCR_AUTO_SAVE');
 if(cfg.mode==='private-replay'){
  ok($('#ledger').textContent.includes('共 '+cfg.lineCount+' 行'),'PRIVATE_TEXT_LOST');store.close();window.fetch=native;
  window.webkit.messageHandlers.result.postMessage({ok:true,observations:5,sourceLines:cfg.lineCount,noFormalSave:true,providerCalls:0});return;
 }
 $('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));for(const check of document.querySelectorAll('.report-checked')){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}$('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);
 ok($('#save').disabled&&!$('#confirmed').checked,'CONFIRMATION_PREAPPROVED');ok((await store.page()).items.length===0,'STAGE_AUTO_SAVE');
 $('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
 const page=await store.page();ok(page.items.length===1,'SAVE_COUNT');const eventId=page.items[0].id,d=await store.detail(eventId);
 ok(d.source.ledger.lines.length===cfg.lineCount,'SAVED_SOURCE_TRUNCATED');ok(d.event.payload.observations.every(o=>o.sourceLineIds.length>=3),'SAVED_PROVENANCE_LOST');
 await store.meta({id:'ocr-table-event',eventId});store.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,eventId,observations:5,sourceLines:cfg.lineCount,noAutomaticSave:true,explicitSyntheticConfirmation:true});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
