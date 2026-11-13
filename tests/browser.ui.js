(async()=>{
 const $=s=>document.querySelector(s),wait=async f=>{await new Promise(r=>setTimeout(r,0));for(let i=0;i<300;i++){if(f())return;await new Promise(r=>setTimeout(r,20));}throw new Error('UI_WAIT_TIMEOUT '+String(f));};
 const check=(x,m)=>{if(!x)throw new Error(m);};
 await wait(()=>$('#start'));
 $('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>document.querySelectorAll('[data-state-rule]').length===3);
 document.querySelector('[data-nav="capture"]').click();await wait(()=>$('#start-review'));$('#start-review').click();await wait(()=>!$('#review-step').hidden);$('#note').value='虚构病程 <img src=x onerror="window.__XSS=1">';$('#note').dispatchEvent(new Event('input',{bubbles:true}));
 $('#clinical-date').value='2020-01-01';$('#add-metric').click();await wait(()=>$('.metric-value'));$('.metric-value').value='003.40';$('.metric-value').dispatchEvent(new Event('input',{bubbles:true}));
 check($('#save').disabled,'unconfirmed enabled');$('#prepare-review').click();await wait(()=>!$('#confirmed').disabled);
 $('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));check(!$('#save').disabled,'explicit confirmation did not enable');
 $('#edit-review').click();await wait(()=>!$('#review-step').hidden);$('#note').value+=' changed';$('#note').dispatchEvent(new Event('input',{bubbles:true}));check($('#save').disabled&&!$('#confirmed').checked,'edit failed invalidation');
 $('#prepare-review').click();await wait(()=>!$('#confirmed').disabled);$('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
 check($('#main').textContent.includes('003.40'),'literal changed');check(!window.__XSS,'XSS executed');check(!$('#main img'),'unsafe markup created');
 const {RecordStore}=await import('/storage/store.js');const s=new RecordStore();const page=await s.page();check(page.items.length===1,'UI failed save');check(page.items[0].payload.nature==='REAL','new entry not REAL');
 window.webkit.messageHandlers.result.postMessage({ok:true,eventId:page.items[0].id,requestId:page.items[0].requestId,uiConfirmation:'AUTOMATED_CLICK_SUBSTITUTE_NOT_HUMAN_ACCEPTANCE',xssEscaped:true,results:['L01 local manual UI no Mac API','L02 edit invalidation in UI','W03 escaping']});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
