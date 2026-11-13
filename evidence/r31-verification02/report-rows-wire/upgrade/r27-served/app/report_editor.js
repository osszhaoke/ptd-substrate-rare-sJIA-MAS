import {reportRows,reportCoverage} from '../domain/report/rows.js';
import {renderReportRows} from '../features/report_rows.js';
export function showReport(root,ledger,renderMetric){
 const rows=reportRows(ledger);root.querySelector('#observations').innerHTML=renderReportRows(rows,renderMetric);return reportCoverage(ledger,rows);
}
export function resetRowCheck(event){
 const el=event.target.closest('[data-report]');if(el&&!event.target.matches('.report-checked'))el.querySelector('.report-checked').checked=false;
}
export function detachReportRows(root){
 for(const el of root.querySelectorAll('[data-report]')){
  if(el.classList.contains('report-row'))el.remove();else{delete el.dataset.report;el.querySelectorAll('.report-reference,.report-flag,.report-checked').forEach(e=>e.closest('label').remove());}
 }
}
