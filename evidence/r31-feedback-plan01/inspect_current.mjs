// Pure synthetic probes only; no browser, network, persistence or paid OCR.
import fs from 'node:fs';
import {metricCode} from '../../web/domain/report/fields.js';
import {validateReport} from '../../web/domain/report/contract.js';
import {need,text,id,canonical,uid} from '../../web/domain/model.js';
const mappings=['27 CRP C反应蛋白','WBC *白细胞','16 MCV *平均红细胞体积','MCV','平均红细胞体积'].map(name=>({name,currentMedicalCode:metricCode(name)}));
const row={name:'MCV',valueLiteral:'1.25',unit:'fL',comparator:null,referenceRange:'-9.99',abnormalFlag:'',sourceLineIds:[uid()]};
const p={documentKind:'lab',sourceKind:'OCR',reportRows:[{...row,origin:structuredClone(row),checked:true}],manualObservations:[],observations:[]};
let accepted=false;try{validateReport(p,{need,text,id,canonical});accepted=true;}catch(e){throw e;}
const result={identity:'author synthetic pure-function inspection; not real report/provider/store execution',mappings,referenceLiteralOnlyValidatorAcceptsAmbiguousMinusNumber:accepted,semanticBoundary:'This proves literal schema accepts it, not that the actual source had a missing lower bound or that a formal event was saved.',networkCalls:0,databaseWrites:0,clinicalInputUsed:false};
fs.writeFileSync(new URL('./current-probes.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
