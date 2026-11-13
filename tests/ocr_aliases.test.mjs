import test from 'node:test';import assert from 'node:assert/strict';
import {candidates} from '../web/domain/model.js';import {parallelLedger,expected} from './fixtures/ocr_parallel.mjs';
const lines=texts=>({version:'ocr-ledger/1',rawText:texts.join('\n'),lines:texts.map((text,i)=>({text,id:'fictional_alias_'+String(i).padStart(8,'0'),order:i,page:null,coordinates:null,confidence:null}))});
test('curated published aliases identify existing metrics without changing literals or units',()=>{
 const l=lines(['血清铁蛋白 +001.20 ng/mL','FER 30 ng/mL','GOT 15 U/L','Fg 2.1 g/L','三酰甘油 1.50 mmol/L','中性粒细胞数目 3.20 x10^9/L','sIL-2R 120 U/mL']);
 assert.deepEqual(candidates(l).map(o=>[o.code,o.valueLiteral,o.unit]),[['ferritin','+001.20','ng/mL'],['ferritin','30','ng/mL'],['ast','15','U/L'],['fib','2.1','g/L'],['tg','1.50','mmol/L'],['anc','3.20','10^9/L'],['scd25','120','U/mL']]);
});
test('whole label boundaries reject embedded/ambiguous names, percentages and guessed units',()=>{
 for(const text of ['转铁蛋白 20 ng/mL','高敏CRP 3 mg/L','NOTSF 30 ng/mL','GOT2 2 U/L','中性粒细胞百分比 60 %','NEUT% 60 %','NEUT 60 %','FIB 2.1 gIL','PCT 1 ng/mL','T 39 °C','SF 31 ng/mL'])assert.deepEqual(candidates(lines([text])),[],text);
});
test('bilingual alias pair must agree and unknown neighbors cannot donate their result',()=>{
 const l=parallelLedger();l.lines.find(x=>x.text==='1 WBC').text='1 白细胞数目';assert.deepEqual(candidates(l).map(o=>[o.code,o.valueLiteral,o.unit]),expected);
 l.lines.find(x=>x.text==='*白细胞').text='*血小板计数';assert.ok(!candidates(l).some(o=>o.code==='wbc'));
});
