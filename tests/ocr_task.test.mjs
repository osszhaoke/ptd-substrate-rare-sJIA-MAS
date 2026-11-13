import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OcrTask} from '../web/app/ocr_task.js';
test('cancel detaches an unresponsive network task immediately',()=>{
 const owner=new OcrTask(),job=owner.start(()=>true);owner.cancel();
 assert.equal(job.signal.aborted,true);assert.equal(job.valid(),false);assert.equal(owner.busy,false);
});
test('late completion cannot clear a newer task or publish on a new source',()=>{
 let source=1;const owner=new OcrTask(),old=owner.start(()=>source===1);source=2;
 const next=owner.start(()=>source===2);owner.finish(old);assert.equal(owner.busy,true);assert.equal(old.valid(),false);assert.equal(next.valid(),true);
 owner.finish(next);assert.equal(owner.busy,false);
});
