(async()=>{
 const {recognize}=await import('/adapters/ocr.js'),{RecordStore}=await import('/storage/store.js');
 const blob=await(await fetch('/fixture.png')).blob(),file=new File([blob],'synthetic.png',{type:'image/png'});
 for(let i=0;!document.querySelector('#start')&&i<500;i++)await new Promise(r=>setTimeout(r,20));
 if(!document.querySelector('#start'))throw new Error('STARTUP_NOT_SETTLED');const original=window.fetch;
 let calls=0;const results=[];const reject=async(fn,code)=>{try{await fn();throw new Error('UNEXPECTED_ACCEPT');}catch(e){if(!e.message.includes(code)&&e.name!==code)throw e;}};
 try{
  window.fetch=async()=>{calls++;return new Response(JSON.stringify({error:'RATE_LIMIT'}),{status:429,headers:{'Content-Type':'application/json'}});};
  await reject(()=>recognize(file,'synthetic-token',{enabled:true},false),'UPLOAD_CONSENT_REQUIRED');if(calls)throw new Error('UPLOAD_BEFORE_CONSENT');
  await reject(()=>recognize(file,'synthetic-token',{enabled:false},true),'OCR_NOT_CONFIGURED');if(calls)throw new Error('UPLOAD_WHEN_DISABLED');results.push('O01 consent and configured gate, zero fetches');
  await reject(()=>recognize(file,'synthetic-token',{enabled:true},true),'RATE_LIMIT');if(calls!==1)throw new Error('429_RETRIED');results.push('O03 429 exactly one attempt');
  calls=0;window.fetch=async()=>{calls++;throw new TypeError('synthetic lost response');};await reject(()=>recognize(file,'synthetic-token',{enabled:true},true),'synthetic lost response');if(calls!==1)throw new Error('LOST_RESPONSE_RETRIED');results.push('O03 lost response exactly one attempt');
  calls=0;window.fetch=async(_url,options)=>{calls++;return new Promise((resolve,reject)=>{if(options.signal.aborted)return reject(new DOMException('cancelled','AbortError'));options.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});};const c=new AbortController();const request=recognize(file,'synthetic-token',{enabled:true},true,c.signal);setTimeout(()=>c.abort(),25);await reject(()=>request,'AbortError');if(calls!==1)throw new Error('CANCEL_RETRIED');results.push('O03 cancellation exactly one attempt');
  const s=new RecordStore();if((await s.page()).items.length)throw new Error('OCR_AUTO_SAVED');
  window.webkit.messageHandlers.result.postMessage({ok:true,results,provider:'SIMULATED_CLIENT_RESPONSES_ONLY',healthEvents:0});
 }finally{window.fetch=original;}
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
