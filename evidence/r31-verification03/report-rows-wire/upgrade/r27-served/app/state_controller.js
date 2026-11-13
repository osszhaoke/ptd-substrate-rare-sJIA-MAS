import {METRIC_CODES,FLAGS} from '../domain/state/catalog.js';
import {projectSnapshot} from '../domain/state/project.js';
// One bounded state projection cache; Store owns the channel and transactions. No timer/polling.
export class StateController {
 constructor(store){this.store=store;this.cache=null;this.generation=0;}
 invalidate(){this.generation++;this.cache=null;}
 async load({nature,zone,before=null,days=2}){
  for(let attempt=0;attempt<3;attempt++){
   const generation=this.generation,key=JSON.stringify([nature,zone,before,days]);
   const rev=(await this.store.get('meta','data-revision'))?.value||'initial';
   if(this.cache?.key===key&&this.cache.value.revision===rev)return this.cache.value;
   const snap=await this.store.stateSnapshot({nature,zone,before,days,codes:Object.keys(METRIC_CODES),flags:Object.keys(FLAGS)});
   const value=projectSnapshot(snap,{nature,zone});
   const after=(await this.store.get('meta','data-revision'))?.value||'initial';
   if(generation===this.generation&&after===snap.revision){this.cache={key,value};return value;}
  }
  throw Error('STATE_CHANGED_TRY_AGAIN');
 }
}
