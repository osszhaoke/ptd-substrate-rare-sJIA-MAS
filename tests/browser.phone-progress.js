(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);};
 const wait=async f=>{for(let i=0;i<8000;i++){if(f())return;await new Promise(r=>setTimeout(r,15));}throw Error('PHONE_PROGRESS_WAIT '+String(f));};
 await wait(()=>$('#records1000')&&typeof $('#records1000').onclick==='function'&&!$('#records1000').disabled);
 let mutations=0;const observer=new MutationObserver(items=>{mutations+=items.length;});observer.observe($('#progress'),{childList:true});
 $('#device').value='Mac WebKit progress measurement, NOT iPhone';$('#consent').checked=true;window.confirm=()=>true;
 const start=performance.now();$('#records1000').click();await wait(()=>/"status"\s*:\s*"(?:PASS_THIS_RUN|FAILED|CANCELLED_INCOMPLETE)"/.test($('#result').textContent));
 observer.disconnect();const elapsed=performance.now()-start,limit=Math.ceil(elapsed/50)+20;
 ok(mutations<=limit,'progress updated DOM '+mutations+' times, limit '+limit);
 $('#cleanup').click();await wait(()=>$('#progress').textContent.includes('已删除'));
 window.webkit.messageHandlers.result.postMessage({ok:true,mutations,limit,elapsedMs:elapsed,identity:'Mac WebKit fictional UI progress bound only'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
