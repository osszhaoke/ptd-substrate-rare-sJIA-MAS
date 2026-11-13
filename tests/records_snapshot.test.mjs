import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsSnapshot} from '../web/app/records_snapshot.js';

function setup(pages=['r1'],states=['r1'],latest=['r1']){
 let pageReads=0,stateReads=0,versionReads=0;
 const next=(values,index)=>values[Math.min(index,values.length-1)];
 const options={store:{page:async()=>({items:[],revision:next(pages,pageReads++)}),get:async()=>({value:next(latest,versionReads++)})},
  stateController:{load:async()=>({revision:next(states,stateReads++),points:[]})},statePrefs:{enabled:true,nature:'REAL'},zone:'Asia/Shanghai',filter:'',cursor:null,current:()=>true};
 return {options,reads:()=>({pageReads,stateReads,versionReads})};
}
test('a matching revision publishes once, with unchanged page query and no writes',async()=>{
 const {options,reads}=setup();let query;const page=options.store.page;options.store.page=q=>{query=q;return page();};
 const result=await recordsSnapshot(options);
 assert.equal(result.page.revision,result.snap.revision);assert.deepEqual(query,{date:null,before:null});
 assert.deepEqual(reads(),{pageReads:1,stateReads:1,versionReads:1});
});
test('mixed list and card revisions are reread before publication',async()=>{
 const {options,reads}=setup(['old','new'],['new'],['new']);
 const result=await recordsSnapshot(options);assert.equal(result.page.revision,'new');assert.equal(result.snap.revision,'new');
 assert.deepEqual(reads(),{pageReads:2,stateReads:2,versionReads:2});
});
test('two matching old projections cannot publish after an intervening commit',async()=>{
 const {options,reads}=setup(['old','new'],['old','new'],['new']);
 assert.equal((await recordsSnapshot(options)).page.revision,'new');assert.equal(reads().pageReads,2);
});
test('continuous changes reject after exactly three read-only attempts',async()=>{
 const {options,reads}=setup(['a','b','c'],['a','b','c'],['b','c','d']);
 await assert.rejects(recordsSnapshot(options),/RECORDS_CHANGED_TRY_AGAIN/);
 assert.deepEqual(reads(),{pageReads:3,stateReads:3,versionReads:3});
});
test('obsolete pages stop before version read and after late version completion',async()=>{
 const first=setup();first.options.current=()=>false;assert.equal(await recordsSnapshot(first.options),null);assert.equal(first.reads().versionReads,0);
 const second=setup();let current=true;second.options.current=()=>current;second.options.store.get=async()=>{current=false;return {value:'r1'};};
 assert.equal(await recordsSnapshot(second.options),null);
});
test('disabled cards and an empty unversioned database preserve existing behavior',async()=>{
 const {options}=setup(['initial']);options.statePrefs.enabled=false;options.store.get=async()=>undefined;
 options.stateController.load=()=>assert.fail('disabled cards must not read state');
 const result=await recordsSnapshot(options);assert.equal(result.page.revision,'initial');assert.deepEqual(result.snap.points,[]);
});
