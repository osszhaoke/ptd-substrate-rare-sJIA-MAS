// Restore-only compatibility: an untagged backup must match one complete,
// exact interpretation. Never used by stage/save or row-by-row fallback.
import {reportRows} from './rows.js';
import {validateReportBinding} from './contract.js';
export async function validateRestoredReportBinding(payload,source,helpers){
 try{validateReportBinding(payload,source,reportRows(source.ledger),helpers);return 'current';}
 catch(error){if(error.message!=='REPORT_ORIGIN_MISMATCH')throw error;}
 const historical=await import('../../compat/r27/web/domain/report/rows.js');
 validateReportBinding(payload,source,historical.reportRows(source.ledger),helpers);
 return 'cbc-report/r27-exact-source/1';
}
