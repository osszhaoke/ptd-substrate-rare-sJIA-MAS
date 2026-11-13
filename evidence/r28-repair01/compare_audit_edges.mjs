// Same entirely fictional independent counterexamples on the exact old/new source trees.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layoutLedger} from '../../tests/fixtures/report_layouts.mjs';
import {cbcLedger} from '../../tests/fixtures/cbc_report.mjs';
const baseline=new URL('../../runtime/r28-web-swap01/domain/report/rows.js',import.meta.url);
const {reportRows:oldRows,reportCoverage:oldCoverage}=await import(fs.existsSync(baseline)?baseline:new URL('../../web/domain/report/rows.js',import.meta.url));
import {reportRows as newRows,reportCoverage as newCoverage} from '../../runtime/r28-candidate01/web/domain/report/rows.js';
const left=layoutLedger();for(const l of left.lines)if(l.coordinates[0].x<2200&&l.text.startsWith('检验者'))l.coordinates=l.coordinates.map(p=>({...p,y:p.y-85}));
const unit=cbcLedger();unit.lines.find(l=>l.text==='10^12/L').text='mg/';unit.rawText=unit.lines.map(l=>l.text).join('\n');
const snapshot=JSON.stringify({left,unit});
const oldFooter=oldRows(left),fixedFooter=newRows(left),oldUnit=oldRows(unit),fixedUnit=newRows(unit);
const rightNames=rows=>rows.filter(r=>r.sourceLineIds.some(id=>left.lines.find(l=>l.id===id)?.coordinates[0].x>=2300)).map(r=>r.name);
assert.equal(oldFooter.length,4);assert.equal(fixedFooter.length,5);assert.equal(rightNames(fixedFooter).length,3);
assert.equal(oldCoverage(unit,oldUnit).pendingRows,0);assert.equal(newCoverage(unit,fixedUnit).pendingRows,1);
assert.deepEqual(fixedUnit.find(r=>r.name.startsWith('RBC ')),oldUnit.find(r=>r.name.startsWith('RBC ')));
assert.equal(snapshot,JSON.stringify({left,unit}));
const result={ok:true,identity:'author synthetic exact independent-edge reproduction; not independent re-review',old:{footerRows:oldFooter.length,rightNames:rightNames(oldFooter),incompletePending:0},fixed:{footerRows:fixedFooter.length,rightNames:rightNames(fixedFooter),incompletePending:1},sameLiteralOrigin:true,ledgerUnchanged:true,noProviderCalls:true};
fs.writeFileSync(new URL('./audit-edges-comparison.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
