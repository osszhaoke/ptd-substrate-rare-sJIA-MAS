import {observe} from '../shared/observe.js';
// One task and one explicit commit boundary. No queued work or write retry.
export class BackupTask {
 constructor(onChange=()=>{}){this.active=null;this.onChange=onChange;this.phase='idle';this.observerFailures=0;}
 get busy(){return this.active!==null;}
 async run(fn){
  if(this.busy)throw Error('BACKUP_BUSY');
  const controller=new AbortController();let last=0,lastPhase='',closed=false;
  const job={signal:controller.signal,controller,committing:false,
   onProgress:progress=>{if(closed||this.active!==job||job.committing)return;const now=performance.now();if(progress.phase!==lastPhase||now-last>=50||progress.done===progress.total){last=now;lastPhase=progress.phase;this.onChange({...progress,busy:true,cancellable:true});}},
   commit:async work=>{
    if(job.committing)throw Error('BACKUP_COMMIT_USED');
    if(closed||this.active!==job)throw Error('BACKUP_TASK_EXPIRED');
    job.signal.throwIfAborted();job.committing=true;this.phase='committing';
    this.onChange({phase:'committing',busy:true,cancellable:false});
    return work();
   }};
  this.active=job;this.phase='processing';
  try{this.onChange({phase:'read',busy:true,cancellable:true});const result=await fn(job);if(!job.committing)job.signal.throwIfAborted();return result;}
  finally{closed=true;if(this.active===job){this.active=null;this.phase='idle';this.finished({phase:job.signal.aborted?'cancelled':'idle',busy:false,cancellable:false});}}
 }
 // A post-operation display failure cannot replace a committed result or its original error.
 finished(progress){observe(this,()=>this.onChange(progress));}
 cancel(){if(!this.active)return true;if(this.active.committing)return false;this.active.controller.abort();return true;}
}
