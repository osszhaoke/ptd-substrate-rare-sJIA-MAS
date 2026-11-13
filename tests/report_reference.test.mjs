import test from 'node:test';import assert from 'node:assert/strict';
import {readReference,referenceLabel} from '../web/domain/report/reference.js';
import {reportDetails,renderReportRows} from '../web/features/report_rows.js';
import {reportRows} from '../web/domain/report/rows.js';import {cbcLedger} from './fixtures/cbc_report.mjs';
test('reference literals remain unchanged; complete ordered intervals and explicit limits classified without medical judgement',()=>{
 for(const [raw,lower,upper]of [[' 3.80 - 5.10 ','3.80','5.10'],['-5--1','-5','-1'],['−5～−1','-5','-1'],['0至0','0','0'],['1 到 2','1','2'],['+1—+2','+1','+2']]){const r=readReference(raw);assert.equal(r.kind,'range');assert.equal(r.raw,raw);assert.equal(r.lower,lower);assert.equal(r.upper,upper);}
 for(const raw of ['<5','<= 5','≥ -1','>0','≤3.00']){assert.equal(readReference(raw).kind,'limit');assert.equal(readReference(raw).raw,raw);}
});
test('missing, single numeric, reversed and incomplete bounds never become verified intervals or invented values',()=>{
 for(const raw of ['', '  ',null])assert.equal(readReference(raw).kind,'missing');
 for(const raw of ['-5.00','-150','5','+2.00']){assert.equal(readReference(raw).kind,'ambiguous');assert.match(referenceLabel(raw),/待核对/);assert.equal(readReference(raw).lower,undefined);}
 for(const raw of ['5-1','1-','1至','~5','<','1 - 2 - 3','9'.repeat(101)+'-9'])assert.equal(readReference(raw).kind,'incomplete',raw);
 for(const raw of ['阴性','未检出','年龄相关，详见原单','1e3-2e3'])assert.equal(readReference(raw).kind,'text');
});
test('saved checked rows still show absent or ambiguous references; display never mutates stored wire or origin',()=>{
 const rows=reportRows(cbcLedger());for(const [referenceRange,kind]of [['-5.00','ambiguous'],['','missing'],['1-','incomplete'],['阴性','text']]){
  const row={...rows[1],referenceRange,checked:true},payload={reportRows:[row]},before=JSON.stringify(payload),html=reportDetails(payload);
  assert.ok(html.includes('data-reference-quality="'+kind+'"'),'REFERENCE_DETAIL_QUALITY_MISSING');assert.ok(html.includes('待核实的参考信息仍会提示'));
  assert.equal(JSON.stringify(payload),before);assert.ok(renderReportRows([row],()=>{throw Error('unexpected mapped row');}).includes('data-reference-quality="'+kind+'"'));
 }
});
test('quality projection is bounded over maximum report rows and 200-character references',()=>{
 const before=performance.now();for(let repeat=0;repeat<10;repeat++)for(let i=0;i<100;i++){const raw='9'.repeat(150)+'-'+ '1'.repeat(49);assert.equal(raw.length,200);assert.equal(readReference(raw).kind,'incomplete');}
 assert.ok(performance.now()-before<250,'REFERENCE_PROJECTION_10X_SLOW');
});
