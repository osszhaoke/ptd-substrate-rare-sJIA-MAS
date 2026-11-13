(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);},pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async f=>{for(let i=0;i<800;i++){if(f())return;await pause(10);}throw Error('WAIT '+f);};
 const cfg=window.__PROBE_INPUT__,{RecordStore}=await import('/storage/store.js'),m=await import('/domain/model.js'),backup=await import('/storage/backup.js'),{projectMetricSeries}=await import('/domain/state/series.js');
 const store=new RecordStore();window.confirm=()=>true;
 const projected=async s=>projectMetricSeries(await s.metricSnapshot({zone:'Asia/Shanghai',nature:'REAL'}),{zone:'Asia/Shanghai',nature:'REAL'});
 const assertProjection=async s=>{const r=await projected(s);ok(r.series.length===30,'METRICS_REPORT_ROWS_MISSING');ok(r.series.reduce((n,g)=>n+g.points.length,0)===60,'METRICS_POINTS_MISSING');const rbc=r.series.find(g=>g.code==='report:rbc');ok(rbc?.points.map(p=>p.value).join(',')==='2.01,3.02','METRICS_RBC_ALIAS_OR_VALUES');ok(rbc.change.delta==='1.01','METRICS_DELTA_WRONG');ok(r.series.some(g=>g.points.some(p=>p.status==='TEXT')),'METRICS_TEXT_HIDDEN');return r;};
 if(cfg.mode==='identity'||cfg.mode==='identity-read'){
  const check=async target=>{const projected=await projectMetricSeries(await target.metricSnapshot({zone:'Asia/Shanghai',nature:'REAL'}),{zone:'Asia/Shanghai',nature:'REAL'}),good=projected.series.find(g=>g.code==='report:rbc'),raw=projected.series.find(g=>g.identity==='REPORT_NAME');ok(projected.series.length===2&&good?.points.length===2&&good.change.delta==='1'&&good.latest?.endsWith(':row:0')&&good.points.at(-1).originalName==='红细胞','METRIC_IDENTITY_FALSE_MERGE');ok(raw?.points.length===1&&raw.points[0].originalName==='RBC RBC'&&!raw.change.available,'METRIC_IDENTITY_RAW_LOST');return {good,raw};};
  if(cfg.mode==='identity-read'){await check(store);ok((await store.reviews()).length===0,'METRIC_IDENTITY_REOPEN_AUTHORITY');store.close();window.webkit.messageHandlers.result.postMessage({ok:true,damagedNameSeparated:true,differentProcessRead:true});return;}
  await wait(()=>$('#start'));$('#timezone').value='Asia/Shanghai';$('#local-consent').checked=true;$('#start').click();await wait(()=>$('.state-overview'));
  const {RecordService}=await import('/domain/service.js'),{reportRows}=await import('/domain/report/rows.js'),{reportProjection}=await import('/domain/report/fields.js'),ledger=JSON.parse(cfg.identityLedger),service=new RecordService(store),prototype=reportRows(ledger).find(r=>r.unit==='10^12/L');
  const canvas=document.createElement('canvas');canvas.width=1300;canvas.height=700;canvas.getContext('2d').fillRect(0,0,1300,700);const file=new File([await new Promise(r=>canvas.toBlob(r,'image/png'))],'fictional-identity.png',{type:'image/png'});
  for(const [i,name]of ['RBC','红细胞','RBC RBC'].entries()){
   const r={...structuredClone(prototype),name,valueLiteral:['4.50','5.50','6.00'][i],checked:true},payload={formatVersion:3,clinicalDate:['2020-01-01','2020-01-05','2020-01-11'][i],observedAt:null,instanceTimezone:'Asia/Shanghai',documentKind:'lab',nature:'REAL',sourceKind:'OCR',trustTier:'USER_REVIEWED',note:'Fictional automated name-correction operator; not human or clinical acceptance.',reportRows:[r],manualObservations:[],observations:reportProjection([r]),clinicalFlags:{}};
   const source=await service.source(file,ledger);let review=await service.stage(payload,source);ok(!review.confirmation,'METRIC_IDENTITY_AUTO_CONFIRM');review=await service.confirm(review,true);await service.save(review);
  }
  const {raw}=await check(store);$('[data-nav="metrics"]').click();await wait(()=>document.querySelectorAll('[data-metric-key]').length===2);const card=[...document.querySelectorAll('[data-metric-key]')].find(el=>JSON.parse(el.dataset.metricKey)[0]==='raw:RBC RBC');ok(card?.textContent.includes('按报告原名对应'),'METRIC_IDENTITY_RAW_CARD');card.click();await wait(()=>$('#metric-back'));ok($('#main').textContent.includes('6.00')&&!$('#main').textContent.includes('增加 1.5'),'METRIC_IDENTITY_FALSE_DIFFERENCE');$('[data-metric-source]').click();await wait(()=>$('#delete-record'));ok($('.metric-source-selected')?.textContent.includes('RBC RBC'),'METRIC_IDENTITY_RAW_SOURCE');$('#back-records').click();await wait(()=>$('#metric-back'));ok($('#main h1').textContent==='RBC RBC','METRIC_IDENTITY_WRONG_RETURN');
  const encrypted=await backup.exportBackup(store,'fictional-identity-password'),target=new RecordStore('identity-restore-'+crypto.randomUUID());await backup.restoreBackup(target,await backup.inspectBackup(encrypted,'fictional-identity-password',target));await check(target);ok((await target.reviews()).length===0,'METRIC_IDENTITY_RESTORE_AUTHORITY');target.close();store.close();window.webkit.messageHandlers.result.postMessage({ok:true,damagedNameSeparated:true,validDelta:'1',rawSourceAndReturn:true,encryptedRestore:true,automatedFictionalOperator:true,paidCalls:0});return;
 }
 if(cfg.mode==='scale'){
  const scaleStore=new RecordStore('ptds-state-scale-v2'),{MetricsFlow}=await import('/app/metrics_flow.js');
  const total=await scaleStore.tx(['events'],'readonly',a=>{a.store('events').count().onsuccess=e=>a.result(e.target.result);});ok(total===Number(cfg.target),'METRICS_SCALE_FIXTURE_COUNT');
  const samples=[];for(let i=0;i<7;i++){const box=document.createElement('div'),flow=new MetricsFlow(scaleStore),start=performance.now();await flow.mount(box,{zone:'Asia/Shanghai',nature:'SYNTHETIC',current:()=>true,published:()=>{}});samples.push(performance.now()-start);ok(flow.snapshot.eventCount===50&&flow.snapshot.series.length===9&&box.querySelectorAll('[data-metric-key]').length===9,'METRICS_SCALE_UNBOUNDED');flow.dispose();}
  const repeats=samples.slice(1).sort((a,b)=>a-b),p95=repeats[Math.ceil(repeats.length*.95)-1];ok(samples[0]<=1000&&p95<=250,'METRICS_SCALE_LIMIT');scaleStore.close();store.close();window.webkit.messageHandlers.result.postMessage({ok:true,target:total,samplesMs:samples,firstMs:samples[0],repeatP95Ms:p95,recordsRead:50,groups:9,physicalMemory:'NOT_MEASURED'});return;
 }
 if(cfg.mode==='read'){
  const r=await assertProjection(store),marker=await store.get('meta','r33-metrics');ok(m.canonical(r)===marker.projection,'METRICS_NEW_PID_CHANGED');ok((await store.reviews()).length===0,'METRICS_REPLAYED_AUTHORITY');
  store.close();window.webkit.messageHandlers.result.postMessage({ok:true,newProcessRead:true,groups:r.series.length,points:60});return;
 }
 await wait(()=>$('#start'));$('#timezone').value='Asia/Shanghai';$('#local-consent').checked=true;$('#start').click();await wait(()=>$('.state-overview'));
 $('[data-nav="metrics"]').click();await wait(()=>$('#metric-filter'));ok($('#main').textContent.includes('本页没有'),'METRICS_EMPTY_NOT_SHOWN');
 for(let report=0;report<2;report++){
  $('[data-nav="capture"]').click();await wait(()=>$('#ocr'));
  const canvas=document.createElement('canvas');canvas.width=1300;canvas.height=700;canvas.getContext('2d').fillRect(0,0,1300,700);
  const file=new File([await new Promise(r=>canvas.toBlob(r,'image/png'))],'fictional-metrics.png',{type:'image/png'});
  Object.defineProperty($('#image'),'files',{value:[file],configurable:true});$('#image').dispatchEvent(new Event('change'));await wait(()=>$('#source-name').textContent===file.name);$('#trial-token').value=cfg.token;$('#upload-consent').checked=true;$('#ocr').click();await wait(()=>document.querySelectorAll('[data-report]').length===30&&!$('#ocr').disabled);
  const rbc=[...document.querySelectorAll('[data-report]')].find(el=>JSON.parse(el.dataset.report).name.includes('红细胞')&&JSON.parse(el.dataset.report).unit==='10^12/L');ok(rbc,'METRICS_EDITOR_RBC_MISSING');
  const value=rbc.querySelector('.metric-value');value.value=report?'3.02':'2.01';value.dispatchEvent(new Event('input',{bubbles:true}));
  $('#clinical-date').value=report?'2020-01-11':'2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));
  $('#prepare-review').click();await wait(()=>$('#notice').textContent.includes('逐项对照报告'));ok((await store.page()).items.length===report,'METRICS_AUTO_SAVE');
  for(const box of document.querySelectorAll('.report-checked')){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}
  $('#prepare-review').click();await wait(()=>!$('#confirmed').disabled);ok(!$('#confirmed').checked&&$('#save').disabled,'METRICS_AUTO_CONFIRM');$('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));
 }
 const r=await assertProjection(store);
 $('[data-nav="metrics"]').click();await wait(()=>document.querySelectorAll('[data-metric-key]').length===24);
 const keys=new Set([...document.querySelectorAll('[data-metric-key]')].map(e=>e.dataset.metricKey));$('#metric-next-cards').click();await wait(()=>document.querySelectorAll('[data-metric-key]').length===6);document.querySelectorAll('[data-metric-key]').forEach(e=>keys.add(e.dataset.metricKey));ok(keys.size===30,'METRICS_CARD_PAGING_DROPS');
 $('#metric-search').value='红细胞';$('#metric-filter').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 const card=[...document.querySelectorAll('[data-metric-key]')].find(el=>JSON.parse(el.dataset.metricKey)[0]==='report:rbc');ok(card,'METRICS_RBC_CARD_MISSING');card.click();await wait(()=>$('#metric-back'));
 ok($('#main').textContent.includes('3.02')&&$('#main').textContent.includes('1.01'),'METRICS_DETAIL_VALUES');
 const link=[...document.querySelectorAll('[data-metric-source]')][0];link.click();await wait(()=>$('#delete-record'));
 ok($('.metric-source-selected')?.textContent.includes('3.02'),'METRICS_SOURCE_ROW_WRONG');ok($('#back-records').textContent==='返回指标变化','METRICS_SOURCE_RETURN');$('#back-records').click();await wait(()=>$('#metric-back'));ok($('#main h1').textContent==='红细胞','METRICS_SOURCE_RETURN_CONTEXT');
 $('#metric-back').click();await wait(()=>$('#metric-filter'));const dateInput=$('#metric-date');dateInput.value='2020-01-01';dateInput.dispatchEvent(new Event('change'));await wait(()=>$('#metric-date')&&$('#metric-date')!==dateInput&&$('#metric-date').value==='2020-01-01');ok($('#main').textContent.includes('2.01')&&!$('#main').textContent.includes('3.02'),'METRICS_DATE_FILTER');
 const encrypted=await backup.exportBackup(store,'fictional-r33-password'),target=new RecordStore('r33-roundtrip-'+crypto.randomUUID());await backup.restoreBackup(target,await backup.inspectBackup(encrypted,'fictional-r33-password',target));const restored=await assertProjection(target);ok(m.canonical(r)===m.canonical({...restored,revision:r.revision}),'METRICS_BACKUP_PROJECTION_CHANGED');ok((await target.reviews()).length===0,'METRICS_RESTORE_AUTHORITY');target.close();
 // Query must be read-only and observe one exact revision; source Blob store is never requested.
 const originalTx=store.tx.bind(store),transactions=[];store.tx=(names,mode,...rest)=>{transactions.push({names,mode});return originalTx(names,mode,...rest);};await projected(store);ok(transactions.every(t=>t.mode==='readonly'&&t.names.join(',')==='meta,events'),'METRICS_READ_SIDE_EFFECT');
 // Bound read page, including a same-day cut, cannot invent ordering outside the page.
 const partial=await store.metricSnapshot({zone:'Asia/Shanghai',nature:'REAL',limit:1});ok(partial.events.length===1&&partial.next,'METRICS_QUERY_PAGING');
 await store.meta({id:'r33-metrics',projection:m.canonical(r)});store.close();
 window.webkit.messageHandlers.result.postMessage({ok:true,groups:30,points:60,explicitAutomatedFictionalConfirmation:true,allCardsAndSourceReturn:true,encryptedRoundtrip:true,noNewPaidOCR:true,readOnlySnapshot:true});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
