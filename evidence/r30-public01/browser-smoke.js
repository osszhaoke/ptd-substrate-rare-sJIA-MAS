// Fresh isolated profile. Settings only; no clinical data entry or OCR POST.
(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async f=>{for(let i=0;i<1000;i++){if(f())return;await new Promise(r=>setTimeout(r,20));}throw Error('WAIT '+f);};
 let forbiddenRequests=0;const originalFetch=window.fetch;
 window.fetch=(input,options={})=>{const method=(options.method||input?.method||'GET').toUpperCase();if(method!=='GET'){forbiddenRequests++;throw Error('SMOKE_FORBIDS_NON_GET');}return originalFetch(input,options);};
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();
 await wait(()=>document.querySelectorAll('.state-card').length===3);
 $('#home-open-qr').click();ok($('#home-qr-dialog').open,'QR_NOT_OPEN');$('#home-close-qr').click();ok(!$('#home-qr-dialog').open,'QR_NOT_CLOSED');
 ok(document.querySelector('.handbook-card').href==='https://www.kdocs.cn/l/cgZMyp7rdz4g','HANDBOOK_URL');
 $('[data-nav="capture"]').click();await wait(()=>$('#upload-consent'));
 ok($('#trial-token').type==='hidden','PUBLIC_TRIAL_CODE_VISIBLE');ok(!$('#upload-consent').checked,'UPLOAD_PREAPPROVED');ok($('#review-step').hidden,'REVIEW_PREOPENED');
 $('[data-nav="consultation"]').click();await wait(()=>$('#main h1')?.textContent.includes('问诊'));
 $('[data-nav="settings"]').click();await wait(()=>$('#local-usage-title'));
 ok(document.body.textContent.includes('.ptds'),'BACKUP_FORMAT_MISSING');
 $('[data-nav="records"]').click();await wait(()=>document.querySelectorAll('.state-card').length===3);
 const response=await fetch('/api/ocr/config'),config=await response.json();ok(response.ok&&config.enabled&&config.publicTrial,'OCR_CONFIG_NOT_ENABLED');
 ok(config.expiresAt==='2026-11-12T15:59:00+00:00','EXPIRY_NOT_APPROVED_TARGET');ok(forbiddenRequests===0,'NON_GET_ATTEMPT');
 window.webkit.messageHandlers.result.postMessage({ok:true,secureContext:isSecureContext,homeCards:3,homeQrOpenClose:true,mainTabs:4,ocrConfigured:true,uploadConsentInitiallyUnchecked:true,expiresAt:config.expiresAt,nonGetRequests:forbiddenRequests,clinicalRecordsCreated:0,identity:'author current public-origin Mac WebKit smoke in fresh fictional profile; settings only; not phone/real OCR acceptance'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
