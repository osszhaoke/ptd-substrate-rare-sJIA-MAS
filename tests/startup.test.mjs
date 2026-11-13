import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {preloadLevels,restoreStylesheets} from '../web/app/startup_task.js';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('dependency levels complete before parents with at most four reads, never application execution',async()=>{
 let active=0,max=0;const done=new Set(),levels=[['a','b','c','d','e','f'],['parent'],['main']];
 await preloadLevels(levels,async url=>{active++;max=Math.max(max,active);if(url==='parent')assert.equal(done.size,6);if(url==='main')assert.ok(done.has('parent'));await tick();done.add(url);active--;});
 assert.equal(done.size,8);assert.equal(max,4);
});
test('first read failure cancels peers, never queues parent or retries the failed URL',async()=>{
 const calls=[];await assert.rejects(()=>preloadLevels([['bad','a','b','c','not-started'],['main']],async(url,signal)=>{
  calls.push(url);if(url==='bad')throw Error('read-failed');await new Promise((resolve,reject)=>{if(signal.aborted)reject(Error('cancelled'));else signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});});
 }),/read-failed/);assert.equal(calls.filter(x=>x==='bad').length,1);assert.ok(!calls.includes('not-started')&&!calls.includes('main'));
});
test('page departure stops preload scheduling before application import',async()=>{
 const owner=new AbortController(),calls=[];const job=preloadLevels([['a','b','c','d','later'],['main']],(url,signal)=>{calls.push(url);return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}));},owner.signal);
 owner.abort();await assert.rejects(()=>job,/cancelled/);assert.equal(calls.length,4);assert.ok(!calls.includes('later'));
});
function workerFixture(fail=false){
 const handlers={},stored=new Map();let active=0,max=0,deleted=false,calls=0;
 const caches={open:async()=>({put:async(url,response)=>stored.set(url,response)}),delete:async()=>{deleted=true;stored.clear();return true;}};
 const fetch=async(url,{signal})=>{calls++;active++;max=Math.max(max,active);await tick();active--;if(signal.aborted)throw new DOMException('cancelled','AbortError');return {ok:!fail||calls!==1,url};};
 const context={AbortController,caches,fetch,URL,Error,self:{addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.runInNewContext(readFileSync(new URL('../web/sw.js',import.meta.url),'utf8'),context);
 let promise;handlers.install({waitUntil:p=>promise=p});return {get promise(){return promise;},get stored(){return stored;},get deleted(){return deleted;},get max(){return max;},get calls(){return calls;}};
}
test('actual generated service worker installs the full shell with four bounded reads',async()=>{
 const f=workerFixture();await f.promise;assert.equal(f.max,4);assert.ok(f.stored.has('/')&&f.stored.has('/app/startup.js'));assert.equal(f.deleted,false);
});
test('failed service worker install aborts other work and removes the incomplete new cache',async()=>{
 // Force one failure with a per-request index rather than a shared completion count.
 const handlers={},stored=new Map();let sequence=0,deleted=false;
 const context={AbortController,URL,Error,caches:{open:async()=>({put:async(u,r)=>stored.set(u,r)}),delete:async()=>{deleted=true;stored.clear();}},fetch:async(u,{signal})=>{const n=sequence++;await tick();if(signal.aborted)throw Error('aborted');return {ok:n!==0};},self:{addEventListener:(n,fn)=>handlers[n]=fn}};
 vm.runInNewContext(readFileSync(new URL('../web/sw.js',import.meta.url),'utf8'),context);let promise;handlers.install({waitUntil:p=>promise=p});await assert.rejects(()=>promise,/SHELL_READ_FAILED/);assert.ok(deleted);assert.equal(stored.size,0);assert.ok(sequence<=4);
});

test('startup reloads only missing styles and verifies the actual replacement sheets',async()=>{
 const working={sheet:{cssRules:[{}]}},missing={sheet:{cssRules:[]}},calls=[];
 const fixed={sheet:{cssRules:[{}]}};const actual=await restoreStylesheets([working,missing],async link=>{calls.push(link);return fixed;});
 assert.deepEqual(calls,[missing]);assert.deepEqual(actual,[working,fixed]);assert.equal(missing.sheet.cssRules.length,0);
 await assert.rejects(()=>restoreStylesheets([missing],async()=>({sheet:{cssRules:[]}})),/STARTUP_STYLE_MISSING/);
});
