(async()=>{
 const cfg=window.__PROBE_INPUT__,pause=ms=>new Promise(r=>setTimeout(r,ms)),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async fn=>{for(let i=0;i<600;i++){if(fn())return;await pause(10);}throw Error('WAIT '+fn);};
 if(cfg.mode==='failure'){
  await pause(300);const explained=[...document.querySelectorAll('section.panel')].some(el=>el.textContent.includes('暂时没打开')&&el.textContent.includes('已有记录不会清空'));
  ok(explained,'STARTUP_FAILURE_NOT_EXPLAINED');ok(!document.querySelector('#start'),'APPLICATION_RAN_AFTER_PRELOAD_FAILURE');
  window.webkit.messageHandlers.result.postMessage({ok:true,readFailureExplained:true,noAutomaticReload:true});return;
 }
 await wait(()=>document.querySelector('#start'));ok(document.querySelector('script[src="/app/startup.js"]'),'STARTUP_ENTRY_NOT_ADOPTED');
 ok(![...document.querySelectorAll('section.panel')].some(el=>el.textContent.includes('暂时没打开')),'STARTUP_ERROR_LEFT_VISIBLE');
 const {STARTUP_LEVELS}=await import('/app/startup_plan.js');ok(STARTUP_LEVELS.at(-1)[0]==='/app/main.js','DEPENDENCIES_NOT_FIRST');
 ok(document.querySelectorAll('link[rel="modulepreload"]').length===0,'PRELOAD_LINKS_LEAKED');
 window.webkit.messageHandlers.result.postMessage({ok:true,normalEntryReady:true,modules:STARTUP_LEVELS.flat().length,noRecordWrites:true});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message}));
