import {projectMetricSeries} from '../domain/state/series.js';
import {metricsPage,metricDetail} from '../features/metrics.js';
import {metricRows} from '../domain/metrics/identity.js';

// One owner per view; no timers, retained cross-view cache, writes, or global lock.
export class MetricsFlow {
  constructor(store){this.store=store;this.generation=0;this.snapshot=null;this.state={};}
  context(){return {...this.state};}
  dispose(){this.generation++;this.snapshot=null;this.current=()=>false;}
  async mount(main,{zone,nature='REAL',context={},current,onSource,published,reload,add}){
    const generation=++this.generation,isCurrent=()=>generation===this.generation&&current();this.main=main;this.current=isCurrent;this.onSource=onSource;this.published=published;this.reload=reload;this.add=add;
    this.state={before:null,date:null,search:'',offset:0,key:null,valueOffset:0,...context};
    main.innerHTML='<h1>状态</h1><p>正在读取本机记录…</p>';
    for(let attempt=0;attempt<3;attempt++){
      let raw;try{raw=await this.store.metricSnapshot({zone,nature,before:this.state.before,date:this.state.date});}catch(error){if(!isCurrent())return;throw error;}
      if(!isCurrent())return;
      const snapshot=projectMetricSeries(raw,{zone,nature});
      let revision;try{revision=(await this.store.get('meta','data-revision'))?.value||'initial';}catch(error){if(!isCurrent())return;throw error;}
      if(!isCurrent())return;
      if(snapshot.revision!==revision)continue;
      this.snapshot={...snapshot,before:this.state.before,filterDate:this.state.date,eventCount:raw.events.length,excludedTimezone:raw.excludedTimezone,documents:raw.events.filter(e=>!metricRows(e).length).map(e=>({id:e.id,date:e.payload.clinicalDate,note:e.payload.note||'无可整理的指标'}))};
      this.render();return;
    }
    if(isCurrent())main.innerHTML='<h1>状态</h1><p>资料刚有更新，请重新点“状态”查看。</p>';
  }
  render(){
    if(!this.current()||!this.snapshot)return;
    const {main,state,snapshot}=this,group=snapshot.series.find(g=>g.key===state.key);
    if(state.key&&!group)state.key=null;
    main.innerHTML=group?metricDetail(group,{offset:state.valueOffset}):metricsPage(snapshot,state);
    const on=(id,fn)=>{const el=main.querySelector('#'+id);if(el)el.onclick=fn;};
    main.querySelectorAll('[data-metric-key]').forEach(el=>el.onclick=()=>{state.key=el.dataset.metricKey;state.valueOffset=0;this.render();scrollTo(0,0);});
    main.querySelectorAll('[data-metric-source]').forEach(el=>el.onclick=()=>{const p=group.points.find(p=>p.ref===el.dataset.metricSource);this.onSource(p.eventId,this.context(),p);});
    main.querySelectorAll('[data-metric-document]').forEach(el=>el.onclick=()=>this.onSource(el.dataset.metricDocument,this.context(),{rowIndex:null}));
    on('metric-back',()=>{state.key=null;this.render();});
    on('metric-next-cards',()=>{state.offset+=24;this.render();});on('metric-previous-cards',()=>{state.offset=Math.max(0,state.offset-24);this.render();});
    on('metric-older-values',()=>{state.valueOffset+=50;this.render();});on('metric-newer-values',()=>{state.valueOffset=Math.max(0,state.valueOffset-50);this.render();});
    const reload=next=>this.reload({...state,...next,offset:0,key:null,valueOffset:0});
    on('metric-older',()=>reload({before:snapshot.next}));on('metric-latest',()=>reload({before:null}));
    on('metric-all-dates',()=>reload({before:null,date:null}));
    const date=main.querySelector('#metric-date');if(date)date.onchange=()=>reload({before:null,date:date.value||null});
    const form=main.querySelector('#metric-filter');if(form)form.onsubmit=e=>{e.preventDefault();state.search=main.querySelector('#metric-search').value;state.offset=0;this.render();};
    on('metric-add',()=>this.add());this.published();
  }
}
