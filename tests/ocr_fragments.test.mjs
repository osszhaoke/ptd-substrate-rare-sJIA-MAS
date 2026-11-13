import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {candidates} from '../web/domain/model.js';

const header=['项目','结果','单位','参考范围'];
const rows=[['铁蛋白','1520','ng/mL','30-400'],['血小板计数','98','x10^9/L','125-350'],['白细胞计数','6.2','x10^9/L','3.5-9.5'],['C反应蛋白','18','mg/L','0-10'],['谷草转氨酶','65','U/L','15-40'],['甘油三酯','2.30','mmol/L','<1.7']];
const ledger=(texts,coords=false)=>({version:'ocr-ledger/1',rawText:texts.join('\n'),lines:texts.map((text,i)=>({id:'fragment_line_'+String(i).padStart(8,'0'),order:i,text,page:null,confidence:null,coordinates:coords?[{x:(i%4)*200,y:Math.floor(i/4)*40},{x:(i%4)*200+160,y:Math.floor(i/4)*40},{x:(i%4)*200+160,y:Math.floor(i/4)*40+20},{x:(i%4)*200,y:Math.floor(i/4)*40+20}]:null}))});

test('user-reported 30-line synthetic OCR replay yields six exact reviewable candidates and preserves all source fragments',()=>{
 const l=ledger(['PTDS自检·合成化验单(非真实数据)','采样时间:2026-10-04 08:00',...header,...rows.flat()]);
 const before=JSON.stringify(l),out=candidates(l);
 assert.equal(out.length,6);
 assert.deepEqual(out.map(x=>[x.code,x.valueLiteral,x.unit]),[['ferritin','1520','ng/mL'],['plt','98','10^9/L'],['wbc','6.2','10^9/L'],['crp','18','mg/L'],['ast','65','U/L'],['tg','2.30','mmol/L']]);
 assert.deepEqual(out[0].sourceLineIds,l.lines.slice(6,9).map(x=>x.id));
 assert.equal(out.every(x=>x.sourceLineIds.length===3&&!x.unitInferred),true);
 assert.equal(JSON.stringify(l),before);
});

test('spatial rows use same page/vertical alignment and x order, irrespective of provider array order',()=>{
 const l=ledger(rows.flat(),true);l.lines=[...l.lines].sort((a,b)=>a.order%4-b.order%4||a.order-b.order).map((x,order)=>({...x,order}));
 const out=candidates(l);
 assert.equal(out.length,6);
 assert.deepEqual(out.map(x=>x.valueLiteral),rows.map(x=>x[1]));
 for(const candidate of out)assert.equal(candidate.sourceLineIds.length,3);
});

test('unknown/missing units, missing names, wrong column order and lack of table context remain manual',()=>{
 for(const texts of [rows[0].slice(0,3),[...header,'铁蛋白','1520','badUnit','30-400'],[...header,'铁蛋白','1520','30-400'],['项目','单位','结果','参考范围','铁蛋白','ng/mL','1520','30-400'],[...header,'未知项目','1520','ng/mL','30-400']])assert.equal(candidates(ledger(texts)).length,0,JSON.stringify(texts));
});

test('reference values never substitute for results; an invalid row cannot shift later row alignment',()=>{
 assert.equal(candidates(ledger([...header,'铁蛋白','未检','ng/mL','1520',...rows[3]])).length,0);
 const out=candidates(ledger([...header,'铁蛋白','<+003.400','ng/mL','30-400']));
 assert.equal(out[0].valueLiteral,'+003.400');assert.equal(out[0].comparator,'<');
 assert.equal(out[0].sourceLineIds.includes('fragment_line_00000007'),false);
});

test('ambiguous spatial values, overlapping cells, different pages, and partially missing geometry are not joined',()=>{
 const variants=[];
 let l=ledger(rows[0],true);l.lines[2].page=2;variants.push(l);
 l=ledger(rows[0],true);l.lines[1].coordinates=null;variants.push(l);
 l=ledger(rows[0],true);l.lines[1].coordinates=l.lines[0].coordinates;variants.push(l);
 l=ledger(['铁蛋白','1520','1000','ng/mL'],true);variants.push(l);
 for(const x of variants)assert.equal(candidates(x).length,0);
});

test('single-line duplicates and mixed text keep prior behavior; joined fields do not duplicate single-line rows',()=>{
 const l=ledger(['CRP 003.40 mg/L','CRP 003.40 mg/L',...header,...rows[0]]);
 assert.deepEqual(candidates(l).map(x=>x.valueLiteral),['003.40','003.40','1520']);
 const singles=ledger(['铁蛋白 1520 ng/mL','CRP 003.40 mg/L']);
 assert.equal(candidates(singles).length,2);
});

test('tenfold 2000-to-20000 fragment scale remains capped at 100 candidates and under 1000ms',()=>{
 for(const n of [2000,20000]){
  const texts=Array.from({length:n/4},()=>rows[0]).flat();const l=ledger(texts,true);
  const started=performance.now(),out=candidates(l),ms=performance.now()-started;
  assert.equal(out.length,100);assert.ok(ms<1000,`fragments=${n},ms=${ms}`);
 }
});
