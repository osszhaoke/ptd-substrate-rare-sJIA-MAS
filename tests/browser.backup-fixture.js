let phase='start';
(async()=>{
 const {RecordStore}=await import('/storage/store.js'),{RecordService}=await import('/domain/service.js');
 const s=new RecordStore('ptds-state-scale-v2'),svc=new RecordService(s),target=Number(window.__PROBE_INPUT__.target);await s.open();const count=(await s.snapshot()).events.length;
 const metric=(code,valueLiteral,unit)=>({code,displayName:code,valueLiteral,unit,context:'LAB',comparator:null,sourceLineIds:[]});
 const start=performance.now();async function add(n){phase='save-'+n;const observedAt=new Date(Date.UTC(2020,0,1,0,0,Math.floor(n/2))).toISOString();let r=await svc.stage({formatVersion:2,clinicalDate:'2020-01-01',observedAt,instanceTimezone:'Asia/Shanghai',documentKind:'manual',nature:n%2?'REAL':'SYNTHETIC',sourceKind:'MANUAL',trustTier:'USER_REVIEWED',note:'synthetic scale '+n,observations:[metric('ferritin','1000','ng/mL'),metric('plt','100','10^9/L'),metric('fib','6','g/L'),metric('ldh','500','U/L'),metric('ast','80','U/L'),metric('tg','3.0','mmol/L'),metric('hb','89','g/L'),metric('anc','0.9','10^9/L'),metric('scd25','2400','U/mL')],clinicalFlags:{FEVER:true,SJIA_KNOWN_OR_SUSPECTED:true,LAB_NOT_OTHERWISE_EXPLAINED:true,SPLENOMEGALY:false,HEMOPHAGOCYTOSIS:false,NK_LOW:false,CNS_INVOLVEMENT:false,HEMORRHAGE:false,ARTHRITIS:false}});r=await svc.confirm(r,true);await svc.save(r);}
 for(let n=count;n<target;n+=10)await Promise.all(Array.from({length:Math.min(10,target-n)},(_,i)=>add(n+i)));
 const actual=await s.tx(['events'],'readonly',a=>{a.store('events').count().onsuccess=e=>a.result(e.target.result);});
 if(actual!==target)throw Error('FORMAL_FIXTURE_COUNT');s.close();window.webkit.messageHandlers.result.postMessage({ok:true,target,records:actual,insertMs:performance.now()-start,identity:'fixture preparation only, no state performance claim; stage-confirm-save'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,phase,stack:e.stack}));
