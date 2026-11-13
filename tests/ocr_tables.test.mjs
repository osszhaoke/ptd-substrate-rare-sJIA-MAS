import test from 'node:test';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {candidates} from '../web/domain/model.js';import {parallelLedger,expected} from './fixtures/ocr_parallel.mjs';
const triples=l=>candidates(l).map(x=>[x.code,x.valueLiteral,x.unit]);
test('two bilingual headed tables: five supported fields, literal values and original evidence',()=>{
 const l=parallelLedger(),before=JSON.stringify(l);assert.deepEqual(triples(l),expected);
 for(const x of candidates(l)){assert.ok(x.sourceLineIds.length>=3);assert.equal(x.unitInferred,false);for(const id of x.sourceLineIds)assert.ok(l.lines.some(y=>y.id===id));}
 assert.equal(JSON.stringify(l),before);assert.ok(!candidates(l).some(x=>x.valueLiteral==='61.0'));
});
test('unknown units, missing result/geometry, mismatching bilingual names and duplicate result cells are rejected',()=>{
 const change=(find,fn)=>{const l=parallelLedger();fn(l.lines.find(x=>x.text===find),l);return l;};
 for(const l of [change('8.20',x=>x.text='未检'),change('8.20',x=>x.coordinates=null),change('*白细胞',x=>x.text='*血小板'),change('8.20',(x,l)=>{const y=structuredClone(x);y.id='synthetic_duplicate';l.lines.push(y);l.lines.forEach((z,i)=>z.order=i);}),change('x10^9/L',x=>x.text='unknown')])assert.ok(!candidates(l).some(x=>x.code==='wbc'));
});
test('reference numbers cannot fill missing result or unit, and page boundaries never join',()=>{
 for(const missing of ['8.20','x10^9/L']){const l=parallelLedger();l.lines.find(x=>x.text===missing).text='';assert.ok(!candidates(l).some(x=>x.code==='wbc'));}
 const l=parallelLedger();l.lines.find(x=>x.text==='8.20').page=2;assert.ok(!candidates(l).some(x=>x.code==='wbc'));
});
test('no geometry does not invent parallel table column order',()=>{const l=parallelLedger();l.lines.forEach(x=>x.coordinates=null);assert.equal(candidates(l).length,0);});
test('tenfold table fragments remain bounded at 100 candidates within 1000ms',()=>{
 for(const n of [2000,20000]){const l=parallelLedger(),orig=structuredClone(l.lines);l.lines=Array.from({length:Math.floor(n/orig.length)},(_,i)=>orig.map(x=>({...x,id:x.id+'_'+i,page:i+1}))).flat().map((x,i)=>({...x,order:i}));l.rawText=l.lines.map(x=>x.text).join('\n');const start=performance.now();const out=candidates(l);assert.equal(out.length,100);assert.ok(performance.now()-start<1000);}
});
test('missing left header cannot borrow columns or values from the neighboring table',()=>{
 for(const header of ['结果','单位','参考范围','英文','中文名称']){
  const l=parallelLedger();l.lines.find(x=>x.text===header).text='';l.lines.find(x=>x.text==='x10^9/L').text='';
  l.lines=l.lines.filter(x=>!['8.20','0','-999','21 PLT','*血小板'].includes(x.text)).map((x,i)=>({...x,order:i}));l.rawText=l.lines.map(x=>x.text).join('\n');
  assert.ok(!candidates(l).some(x=>x.code==='wbc'),'NEIGHBOR_TABLE_VALUE_SUBSTITUTED '+header);
 }
});
