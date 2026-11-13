(async()=>{
 const start=performance.now(),pause=ms=>new Promise(r=>setTimeout(r,ms));
 for(let n=0;n<600&&!document.querySelector('#start');n++){
  if([...document.querySelectorAll('section.panel')].some(e=>e.textContent.includes('暂时没打开')))throw Error('PUBLIC_STARTUP_READ_FAILURE');
  await pause(100);
 }
 if(!document.querySelector('#start'))throw Error('PUBLIC_STARTUP_TIMEOUT');
 if(document.querySelector('#local-consent').checked)throw Error('CONSENT_PREAPPROVED');
 if(!document.querySelector('script[src="/app/startup.js"]'))throw Error('WRONG_ENTRY');
 if(getComputedStyle(document.querySelector('nav')).position!=='fixed')throw Error('PUBLIC_STYLE_MISSING');
 const resources=performance.getEntriesByType('resource').filter(e=>/\.(js|css)(\?|$)/.test(e.name)).map(e=>({name:new URL(e.name).pathname,duration:e.duration,transfer:e.transferSize}));
 window.webkit.messageHandlers.result.postMessage({ok:true,identity:'author isolated Mac WebKit fresh profile; no phone/human/clinical acceptance',firstPageReady:true,readyMs:performance.now()-start,navStyleReady:true,consentUnchecked:true,formalRecordsWritten:0,paidProviderCalls:0,resources});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message}));