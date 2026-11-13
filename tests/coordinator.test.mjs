import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ActionCoordinator} from '../web/app/action_coordinator.js';
const gate=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
test('one replaceable navigation; rejected writes do not replay',async()=>{
 const errors=[],c=new ActionCoordinator(e=>errors.push(e.message)),g=gate(),calls=[];
 const w=c.write(async()=>{calls.push('save');await g.promise;});
 const first=c.navigate(()=>calls.push('old')),last=c.navigate(()=>calls.push('latest'));
 assert.equal(await c.write(()=>calls.push('duplicate')),false);
 assert.equal(await first,false);g.release();await w;await last;
 assert.deepEqual(calls,['save','latest']);assert.equal(errors.length,1);assert.equal(c.busy,false);
});
test('rendered navigation releases immediately without old completion clearing new write',async()=>{
 const c=new ActionCoordinator(),g=gate(),w=gate();let saved=0;
 const nav=c.navigate(async()=>{c.published();await g.promise;});
 const write=c.write(async()=>{saved++;await w.promise;});g.release();await nav;
 assert.equal(c.busy,true);w.release();await write;assert.equal(saved,1);assert.equal(c.busy,false);
});
test('navigation failure drains latest and reports original error',async()=>{
 const errors=[],c=new ActionCoordinator(e=>errors.push(e.message)),g=gate();let reached=false;
 const nav=c.navigate(async()=>{await g.promise;throw Error('original');});
 const queued=c.navigate(()=>{reached=true;});g.release();await nav;await queued;
 assert.equal(reached,true);assert.deepEqual(errors,['original']);
});

test('error display failure cannot replace a failed action result',async()=>{
 const c=new ActionCoordinator(()=>{throw Error('fictional error display');});
 assert.equal(await c.write(()=>{throw Error('original operation failure');}),false);assert.equal(c.busy,false);
 assert.equal(await c.write(()=>{}),true);
});
test('error display failure cannot throw or replay a rejected duplicate write',async()=>{
 const g=gate(),c=new ActionCoordinator(()=>{throw Error('fictional busy display');});let writes=0;
 const running=c.write(async()=>{writes++;await g.promise;});
 try{assert.equal(await c.write(()=>writes++),false);}finally{g.release();await running;}
 assert.equal(writes,1);assert.equal(c.busy,false);
});
