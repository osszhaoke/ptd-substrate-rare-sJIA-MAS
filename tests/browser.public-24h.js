(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async f=>{for(let i=0;i<600;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('WAIT '+f);};
 window.confirm=()=>true;
 const {RecordStore}=await import('/storage/store.js'),store=new RecordStore();
 if(window.__PROBE_INPUT__.mode==='read'){
  const marker=await store.get('meta','r10-ocr-event');ok(marker,'missing committed marker');
  const d=await store.detail(marker.eventId);ok(d?.receipt&&d.event.payload.observations.length===6,'new process lost event');
  ok(d.source.ledger.lines.length===30,'source fragments lost');ok(d.event.payload.observations.every(o=>o.sourceLineIds.length===3),'source IDs lost');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,mode:'new-process-read',eventId:marker.eventId,observations:6,lines:30});return;
 }
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
 $('[data-nav="capture"]').click();await wait(()=>$('#ocr'));
 const blob=await(await fetch('/fixture.png')).blob(),file=new File([blob],'fictional-split-report.png',{type:'image/png'});
 Object.defineProperty($('#image'),'files',{value:[file],configurable:true});$('#image').dispatchEvent(new Event('change'));
 await wait(()=>$('#source-name').textContent==='fictional-split-report.png');
 ok($('#trial-token').type==='hidden','public code input visible');ok(!document.body.textContent.includes('识别试用码'),'public trial code label visible');$('#upload-consent').checked=true;$('#ocr').click();
 await wait(()=>document.querySelectorAll('.metric-row').length===6);
 ok(!$('#review-step').hidden,'OCR did not move to review');
 const values=[...document.querySelectorAll('.metric-value')].map(e=>e.value);
 ok(JSON.stringify(values)===JSON.stringify(['1520','98','6.2','18','65','2.30']),'incorrect candidate values');
 ok((await store.page()).items.length===0,'automatic save before user review');
 $('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));
 for(const check of document.querySelectorAll('.report-checked')){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}$('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);
 ok($('#save').disabled&&!$('#confirmed').checked,'confirmation pre-approved');
 ok((await store.page()).items.length===0,'staging saved event');
 $('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
 const page=await store.page();ok(page.items.length===1,'save count');const eventId=page.items[0].id,d=await store.detail(eventId);
 ok(d.source.ledger.lines.length===30,'ledger truncated');ok(d.event.payload.observations.every(o=>o.sourceLineIds.length===3),'joined source provenance missing');
 ok(d.source.ledger.rawText.includes('x10^9/L'),'raw unit overwritten');
 await store.meta({id:'r10-ocr-event',eventId});store.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,mode:'automated-UI-write',eventId,observations:6,lines:30,values,noAutomaticSave:true,identity:'author automated synthetic interaction; not human acceptance'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
