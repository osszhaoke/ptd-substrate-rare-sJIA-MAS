(async()=>{
 const cfg=window.__PROBE_INPUT__,pause=ms=>new Promise(r=>setTimeout(r,ms)),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async fn=>{for(let i=0;i<600;i++){if(fn())return;await pause(10);}throw Error('WAIT '+fn);};
 const visible=el=>el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';
 const explained=()=>[...document.querySelectorAll('section.panel')].some(el=>visible(el)&&el.textContent.includes('暂时没打开')&&el.textContent.includes('已有记录不会清空'));
 if(cfg.mode==='failure'){
  await pause(Number(cfg.waitMs||300));ok(explained(),'STARTUP_FAILURE_NOT_EXPLAINED');ok(!document.querySelector('#start'),'APPLICATION_RAN_AFTER_PRELOAD_FAILURE');
  window.webkit.messageHandlers.result.postMessage({ok:true,readFailureExplained:true,noAutomaticReload:true});return;
 }
 if(cfg.mode==='bootstrap-recovery'&&!sessionStorage.getItem('startup-test-manual-reopen')){
  await pause(350);ok(explained(),'STARTUP_FAILURE_NOT_EXPLAINED');
  const fallback=document.querySelector('#startup-fallback'),link=fallback?.querySelector('a');
  ok(visible(fallback)&&visible(link)&&link.textContent==='重新打开','STATIC_MANUAL_REOPEN_MISSING');
  ok(link.getAttribute('href')==='/'&&link.origin===location.origin&&!link.hasAttribute('onclick'),'REOPEN_IS_NOT_SAME_ORIGIN_GET');
  ok(!document.querySelector('#start'),'APPLICATION_RAN_AFTER_PRELOAD_FAILURE');
  await pause(350);ok(explained(),'STATIC_FEEDBACK_DISAPPEARED');
  sessionStorage.setItem('startup-test-manual-reopen','yes');link.click();return;
 }
 await wait(()=>document.querySelector('#start'));ok(document.querySelector('script[src="/app/startup.js"]'),'STARTUP_ENTRY_NOT_ADOPTED');ok([...document.querySelectorAll('link[rel="stylesheet"]')].every(l=>l.sheet&&l.sheet.cssRules.length>0),'STARTUP_STYLE_NOT_READY');
 ok(!document.querySelector('#startup-fallback'),'STARTUP_FALLBACK_LEFT_VISIBLE');ok(![...document.querySelectorAll('section.panel')].some(el=>el.textContent.includes('暂时没打开')),'STARTUP_ERROR_LEFT_VISIBLE');
 const {STARTUP_LEVELS}=await import('/app/startup_plan.js');ok(STARTUP_LEVELS.at(-1)[0]==='/app/main.js','DEPENDENCIES_NOT_FIRST');
 ok(document.querySelectorAll('link[rel="modulepreload"]').length===0,'PRELOAD_LINKS_LEAKED');
 ok(!document.querySelector('#local-consent').checked,'CONSENT_WAS_REPLAYED');
 window.webkit.messageHandlers.result.postMessage({ok:true,normalEntryReady:true,manualRecovery:cfg.mode==='bootstrap-recovery',modules:STARTUP_LEVELS.flat().length,noRecordWrites:true});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message}));
