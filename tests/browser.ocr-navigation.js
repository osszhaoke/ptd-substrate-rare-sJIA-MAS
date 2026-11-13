(async()=>{
 window.confirm=()=>true;
 const $=s=>document.querySelector(s),ok=(x,m)=>{if(!x)throw Error(m);},pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async f=>{for(let i=0;i<500;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));
 const blob=await(await fetch('/fixture.png')).blob(),native=window.fetch;const calls=[];
 window.fetch=(url,options)=>url==='/api/ocr'?new Promise(resolve=>calls.push({resolve,signal:options.signal,at:performance.now(),aborted:null}) ):native(url,options);
 const enter=async()=>{$('[data-nav="capture"]').click();await wait(()=>$('#image'));ok($('#trial-token')?.closest('label').textContent.includes('识别试用码')&&$('#source-step').textContent.includes('由提供者给出'),'enabled OCR trial code unclear');const dt=new DataTransfer();dt.items.add(new File([blob],'fictional.png',{type:'image/png'}));$('#image').files=dt.files;$('#image').dispatchEvent(new Event('change'));await wait(()=>$('#source-name').textContent==='fictional.png');$('#upload-consent').checked=true;$('#trial-token').value='fictional';};
 await enter();$('#ocr').click();await wait(()=>calls.length===1);calls[0].signal.addEventListener('abort',()=>calls[0].aborted=performance.now(),{once:true});
 const nav=performance.now();$('[data-nav="settings"]').click();await wait(()=>$('#export'));ok(calls[0].signal.aborted,'navigation did not cancel OCR');ok(calls[0].aborted-nav<=100,'OCR_NAV_ABORT_SLOW');
 const response=()=>new Response(JSON.stringify({ledger:{version:'ocr-ledger/1',provider:'fictional',region:'local',rawText:'CRP 3.4 mg/L',lines:[{id:'line_0001',order:0,text:'CRP 3.4 mg/L',page:1,confidence:null,coordinates:null}]}}),{status:200});
 calls[0].resolve(response());await pause(50);ok($('#export')&&!$('.metric-row'),'late OCR changed destination');
 await enter();$('#ocr').click();await wait(()=>calls.length===2);$('#cancel-ocr').click();ok(calls[1].signal.aborted&&!$('#ocr').disabled,'cancel left editor locked');
 $('#ocr').click();await wait(()=>calls.length===3);calls[1].resolve(response());await pause(30);ok($('#ocr').disabled,'old completion enabled new task');
 // Delay the post-response source hash, leave, then release it: old result must not publish.
 const {RecordService}=await import('/domain/service.js');const source=RecordService.prototype.source;let release,hashing=false;RecordService.prototype.source=async function(...args){hashing=true;await new Promise(r=>release=r);return source.apply(this,args);};
 calls[2].resolve(response());await wait(()=>hashing);$('[data-nav="records"]').click();await wait(()=>$('.state-overview'));release();await pause(60);ok($('.state-overview')&&!$('.metric-row'),'late source hash published OCR');RecordService.prototype.source=source;
 const {RecordStore}=await import('/storage/store.js');const s=new RecordStore();ok((await s.page()).items.length===0,'OCR auto-saved');s.close();window.fetch=native;
 window.webkit.messageHandlers.result.postMessage({ok:true,abortLatencyMs:calls[0].aborted-nav,clientCalls:calls.length,actualProviderCalls:0,results:['never-settling request does not block navigation','immediate client cancel','late response discarded','old completion cannot release new task','post-response hashing route guard','no automatic save/retry']});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
