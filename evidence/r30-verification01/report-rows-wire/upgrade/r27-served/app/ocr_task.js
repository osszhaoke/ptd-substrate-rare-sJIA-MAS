// Owns one client wait. Aborting does not promise cancellation at the provider.
export class OcrTask {
 constructor(){this.active=null;}
 get busy(){return this.active!==null;}
 start(current){
  this.cancel();const controller=new AbortController();
  const job={signal:controller.signal,controller,valid:()=>this.active===job&&!controller.signal.aborted&&current()};
  this.active=job;return job;
 }
 cancel(){const job=this.active;this.active=null;job?.controller.abort();}
 finish(job){if(this.active===job)this.active=null;}
}
