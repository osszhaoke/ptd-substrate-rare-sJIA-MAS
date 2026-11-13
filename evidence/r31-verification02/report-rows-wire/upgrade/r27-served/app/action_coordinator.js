import {observe} from '../shared/observe.js';
// Owns one active operation and one replaceable navigation. Writes never queue/retry.
export class ActionCoordinator {
 constructor(onError=()=>{}){this.active=null;this.pending=null;this.onError=onError;this.observerFailures=0;}
 get busy(){return this.active!==null;}
 write(fn){
  if(this.active){observe(this,()=>this.onError(new Error('操作处理中，请稍后再试。')));return Promise.resolve(false);}
  return this.start(fn,'write');
 }
 navigate(fn){
  if(!this.active)return this.start(fn,'navigation');
  if(this.pending)this.pending.resolve(false);
  return new Promise(resolve=>{this.pending={fn,resolve};});
 }
 // A rendered navigation owns no further async work. Release before new page actions.
 published(){if(this.active?.kind==='navigation')this.finish(this.active);}
 finish(token){
  if(this.active!==token)return;
  this.active=null;const pending=this.pending;this.pending=null;
  if(pending)this.start(pending.fn,'navigation').then(pending.resolve);
 }
 async start(fn,kind){
  const token={kind};this.active=token;
  try{await fn();return true;}catch(error){observe(this,()=>this.onError(error));return false;}
  finally{this.finish(token);}
 }
}
