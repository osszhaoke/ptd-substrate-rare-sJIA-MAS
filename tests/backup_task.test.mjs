import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BackupTask} from '../web/app/backup_task.js';
test('cancel before commit prevents all persistence',async()=>{
 const owner=new BackupTask();let release,writes=0;const waiting=new Promise(r=>release=r);
 const result=owner.run(async job=>{await waiting;return job.commit(async()=>writes++);});owner.cancel();release();
 await assert.rejects(result,e=>e.name==='AbortError');assert.equal(writes,0);assert.equal(owner.busy,false);
});
test('commit boundary disables cancellation and executes exactly once',async()=>{
 const owner=new BackupTask();let release,writes=0;const waiting=new Promise(r=>release=r);
 const result=owner.run(async job=>job.commit(async()=>{writes++;await waiting;return 'committed';}));
 assert.equal(owner.phase,'committing');assert.equal(owner.cancel(),false);release();assert.equal(await result,'committed');assert.equal(writes,1);
});
test('tasks never queue or overlap; quota failure unlocks without success',async()=>{
 const owner=new BackupTask();let release;const waiting=new Promise(r=>release=r);const result=owner.run(async()=>{await waiting;throw Error('quota');});
 await assert.rejects(owner.run(async()=>{}),/BACKUP_BUSY/);release();await assert.rejects(result,/quota/);assert.equal(owner.busy,false);
});
test('start observer failure releases ownership and permits a later task',async()=>{
 let fail=true;const owner=new BackupTask(p=>{if(fail&&p.busy)throw Error('render failed');});
 await assert.rejects(owner.run(async()=>assert.fail('job must not start')),/render failed/);
 assert.equal(owner.busy,false,'failed start stranded the task');assert.equal(owner.phase,'idle');
 fail=false;assert.equal(await owner.run(async()=>42),42);
});
test('the same job cannot commit twice or be reused after it finishes',async()=>{
 const owner=new BackupTask();let retained,writes=0;
 await owner.run(async job=>{retained=job;await job.commit(()=>++writes);await assert.rejects(job.commit(()=>++writes),/BACKUP_COMMIT_USED/);});
 await assert.rejects(retained.commit(()=>++writes),/BACKUP_COMMIT_USED/);assert.equal(writes,1);
 let uncommitted;await owner.run(async job=>{uncommitted=job;});
 await assert.rejects(uncommitted.commit(()=>++writes),/BACKUP_TASK_EXPIRED/);assert.equal(writes,1);
});

test('finish observer cannot turn an actual completed commit into failure',async()=>{
 const owner=new BackupTask(p=>{if(!p.busy)throw Error('fictional finish observer');});let writes=0;
 assert.equal(await owner.run(job=>job.commit(()=>{writes++;return 'persisted';})),'persisted');
 assert.equal(writes,1);assert.equal(owner.busy,false);assert.equal(owner.phase,'idle');assert.equal(owner.observerFailures,1);
});
test('finish observer cannot replace the original persistence failure',async()=>{
 const original=new DOMException('fictional quota','QuotaExceededError');
 const owner=new BackupTask(p=>{if(!p.busy)throw Error('fictional finish observer');});
 await assert.rejects(owner.run(job=>job.commit(()=>{throw original;})),error=>error===original);
 assert.equal(owner.busy,false);
});

test('an asynchronous finish observer rejection is counted without changing commit outcome',async()=>{
 const owner=new BackupTask(async p=>{if(!p.busy)throw Error('fictional asynchronous finish observer');});
 assert.equal(await owner.run(job=>job.commit(()=>42)),42);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(owner.observerFailures,1);assert.equal(owner.busy,false);
});
