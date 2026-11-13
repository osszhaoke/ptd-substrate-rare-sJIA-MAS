import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {bilingualFooterLedger} from '../../runtime/r29-candidate01/tests/fixtures/report_layouts.mjs';
import {reportRows as oldRows} from '../../runtime/r29-candidate01/web/compat/r27/web/domain/report/rows.js';
import {validateRestoredReportBinding} from '../../runtime/r29-candidate01/web/domain/report/restore_binding.js';
import {need,canonical} from '../../runtime/r29-candidate01/web/domain/model.js';
const measurements=[];
for(const n of [2000,20000]){
 const ledger=bilingualFooterLedger();while(ledger.lines.length<n){const i=ledger.lines.length;ledger.lines.push({id:'fictional_noise_'+i,order:i,text:'虚构备注无检验数据',page:1,confidence:.99,coordinates:null});}ledger.rawText=ledger.lines.map(r=>r.text).join('\n');
 const rows=oldRows(ledger);need(rows.length===28&&rows.some(r=>r.valueLiteral==='999'),'SCALE_HISTORY_FIXTURE');
 const started=performance.now(),policy=await validateRestoredReportBinding({formatVersion:3,reportRows:rows},{ledger},{need,canonical}),ms=performance.now()-started;
 measurements.push({fragments:n,rows:rows.length,policy,ms,limitMs:1000});console.log(JSON.stringify(measurements.at(-1)));need(policy==='cbc-report/r27-exact-source/1','HISTORY_POLICY');
}
await writeFile(new URL('history-scale02.json',import.meta.url),JSON.stringify({ok:measurements.every(m=>m.ms<1000),identity:'author fictional Node supplemental scale; not iPhone memory or universal performance',measurements},null,2)+'\n');console.log(JSON.stringify(measurements));
