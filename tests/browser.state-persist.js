(async()=>{
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js'),{StateController}=await import('/app/state_controller.js'),{hash}=await import('/domain/model.js');
 const input=window.__PROBE_INPUT__,s=new RecordStore('ptds-state-process-test'),svc=new RecordService(s);await s.open();
 if(input.mode==='write'){
  const blob=await(await fetch('/fixture.png')).blob(),source=await svc.source(new File([blob],'fictional-state.png',{type:'image/png'}));
  const metric=(code,valueLiteral,unit)=>({code,displayName:code,valueLiteral,unit,context:'LAB',comparator:null,sourceLineIds:[]});
  let r=await svc.stage({formatVersion:2,clinicalDate:'2020-01-01',instanceTimezone:'Asia/Shanghai',observedAt:null,documentKind:'lab',sourceKind:'MANUAL',nature:'SYNTHETIC',trustTier:'USER_REVIEWED',note:'synthetic state persistence',observations:[metric('ferritin','1000','ng/mL'),metric('plt','100','10^9/L'),metric('fib','6','g/L'),metric('ldh','500','U/L')],clinicalFlags:{FEVER:true,SJIA_KNOWN_OR_SUSPECTED:true,CNS_INVOLVEMENT:false,HEMORRHAGE:false,ARTHRITIS:false}},source);r=await svc.confirm(r,true);const receipt=await svc.save(r);
  window.webkit.messageHandlers.result.postMessage({ok:true,mode:input.mode,receipt,sourceHash:source.hash});
 }else{
  const snap=await new StateController(s).load({nature:'SYNTHETIC',zone:'Asia/Shanghai'}),events=await s.page(),d=await s.detail(events.items[0]?.id);
  if(snap.points[0]?.rules.R3.score!=='-2.1'||d.receipt.id!==input.requestId||await hash(await d.source.blob.arrayBuffer())!==input.sourceHash||d.event.schema!=='ptds-browser/2')throw Error('STATE_PROCESS_READBACK_MISMATCH');
  window.webkit.messageHandlers.result.postMessage({ok:true,mode:input.mode,requestId:d.receipt.id,eventId:d.event.id,score:snap.points[0].rules.R3.score,sourceHash:d.source.hash,clinicalFlags:d.event.payload.clinicalFlags,noConfirmationOrOCRReplay:true});
 }
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
