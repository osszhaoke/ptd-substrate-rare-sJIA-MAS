(async()=>{
 const events=[],start=performance.now();window.addEventListener('error',e=>events.push({kind:'error',message:e.message,filename:e.filename}));window.addEventListener('unhandledrejection',e=>events.push({kind:'rejection',message:String(e.reason)}));
 let imported='PENDING';import('/app/main.js').then(()=>imported='RESOLVED',e=>{imported='REJECTED';events.push({kind:'main-import',message:String(e)});});
 for(let n=0;n<300&&!document.querySelector('#start');n++)await new Promise(r=>setTimeout(r,100));
 const entries=performance.getEntriesByType('resource').map(e=>({name:e.name,initiator:e.initiatorType,duration:e.duration,start:e.startTime,transfer:e.transferSize,encoded:e.encodedBodySize,status:e.responseStatus||null}));
 window.webkit.messageHandlers.result.postMessage({ok:true,diagnosticOnly:true,elapsedMs:performance.now()-start,mainImport:imported,setupVisible:!!document.querySelector('#start'),networkText:document.querySelector('#network')?.textContent,mainText:document.querySelector('#main')?.textContent.slice(0,600),events,resources:entries});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:String(e)}));