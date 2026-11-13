(async()=>{
 const input=window.__PROBE_INPUT__;
 if(input.fontScale)document.documentElement.style.fontSize=input.fontScale+'%';
 let phase='startup';const wait=async f=>{await new Promise(r=>setTimeout(r,0));for(let i=0;i<400;i++){if(f())return;await new Promise(r=>setTimeout(r,15));}throw Error('MOBILE_WAIT '+phase);};
 const ok=(x,m)=>{if(!x)throw Error(m);};
 const $=s=>document.querySelector(s);
 await wait(()=>$('#start'));$('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();
 await wait(()=>document.querySelectorAll('[data-state-rule]').length===3);
 const pages=[];
 function checkPage(name){
  const rootSize=parseFloat(getComputedStyle(document.documentElement).fontSize),nav=[...document.querySelectorAll('nav button')].filter(e=>e.getClientRects().length),calendar=[...document.querySelectorAll('.day')];
  ok(document.documentElement.scrollWidth<=innerWidth+1,name+' horizontal overflow');
  ok(nav.length===4&&nav.every(x=>parseFloat(getComputedStyle(x.querySelector('span')).fontSize)>=14),'bottom labels too small');
  ok(nav.every(x=>x.getBoundingClientRect().width>=44&&x.getBoundingClientRect().height>=44),'bottom hit area');
  ok(rootSize>=16,'root type too small');
  const textNodes=[...document.querySelectorAll('#main *, header *, nav *, .lead, .footer')].filter(el=>el.children.length===0&&el.textContent.trim()&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('svg,.sr-only,[hidden]'));
  const tooSmall=textNodes.filter(el=>parseFloat(getComputedStyle(el).fontSize)<14);
  ok(!tooSmall.length,name+' text below 14px: '+tooSmall.map(el=>el.tagName+'.'+el.className).slice(0,5).join(','));
  if(calendar.length){ok(calendar.length===7&&calendar.every(x=>parseFloat(getComputedStyle(x.querySelector('strong')).fontSize)>=20),'calendar dates too small');ok(calendar.every(x=>x.getBoundingClientRect().width>=44),'calendar hit area');}
  pages.push({name,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,rootSize,navLabels:nav.map(x=>parseFloat(getComputedStyle(x.querySelector('span')).fontSize)),calendarDateSize:calendar.length?parseFloat(getComputedStyle(calendar[0].querySelector('strong')).fontSize):null});
 }
 checkPage('home');ok(!$('#main').textContent.includes('我的病程'),'removed heading visible');
 if(input.mode==='home'){window.webkit.messageHandlers.result.postMessage({ok:true,width:innerWidth,fontScale:input.fontScale||'100',pages,identity:'synthetic fresh browser profile'});return;}
 phase='state detail';$('[data-state-rule="R1"]').click();await wait(()=>$('#state-add-data'));checkPage('state detail');
 phase='calendar';$('#back-records').click();await wait(()=>$('.day'));$('.day').click();await wait(()=>$('.day.selected'));checkPage('calendar filtered');
 phase='capture';$('[data-nav="capture"]').click();await wait(()=>$('#resume-draft'));checkPage('capture source');$('#start-review').click();await wait(()=>!$('#review-step').hidden);checkPage('capture review');$('#note').value='fictional mobile';$('#note').dispatchEvent(new Event('input',{bubbles:true}));$('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);checkPage('capture confirmation');
 phase='drafts';await new Promise(r=>setTimeout(r,40));$('#resume-draft').click();await wait(()=>$('#back-capture'));checkPage('drafts');
 phase='consultation';await new Promise(r=>setTimeout(r,40));$('[data-nav="consultation"]').click();await wait(()=>$('#generate-consultation'));checkPage('consultation selection');
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js');const s=new RecordStore(),svc=new RecordService(s);let r=await svc.stage({clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:'REAL',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'fictional mobile selection',observations:[{code:'crp',displayName:'C反应蛋白',valueLiteral:'3.40',unit:'mg/L',context:'LAB',sourceLineIds:[]}]});r=await svc.confirm(r,true);await svc.save(r);await new Promise(r=>setTimeout(r,20));$('[data-nav="records"]').click();await wait(()=>$('.state-overview'));$('[data-nav="consultation"]').click();await wait(()=>$('.consult-select'));$('.consult-select').checked=true;$('.consult-select').dispatchEvent(new Event('change'));$('#generate-consultation').click();await wait(()=>!$('#consult-card-step').hidden);checkPage('consultation generated');$('#open-ai').click();await wait(()=>!$('#consult-ai-step').hidden);checkPage('consultation AI optional');$('#back-card').click();await wait(()=>!$('#consult-card-step').hidden);s.close();
 phase='settings';await new Promise(r=>setTimeout(r,40));$('[data-nav="settings"]').click();await wait(()=>$('#export'));checkPage('settings');
 window.webkit.messageHandlers.result.postMessage({ok:true,width:innerWidth,fontScale:input.fontScale||'100',pages,identity:'synthetic fresh browser profile'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
