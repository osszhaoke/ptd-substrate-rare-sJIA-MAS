// One-off diagnosis using fictional inputs and the unchanged production parser.
// No network, browser profile, database, provider response or patient image access.
import {candidates,DICTIONARY} from '../../web/domain/model.js';
import {parallelLedger} from '../../tests/fixtures/ocr_parallel.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

function ledger(texts){return {version:'ocr-ledger/1',rawText:texts.join('\n'),lines:texts.map((text,i)=>({id:'fictional_line_'+String(i).padStart(8,'0'),order:i,text,page:null,confidence:.99,coordinates:null}))};}
const header=['项目','结果','单位','参考范围'];
const wbc=['白细胞','8.20','10^9/L','3-10'];
const rbc=['红细胞','4.50','10^12/L','3-6'];
const crp=['C反应蛋白','4.2','mg/L','0-10'];
const cases=[];
function check(name,l,expected){const before=JSON.stringify(l);const out=candidates(l).map(o=>o.code);assert.deepEqual(out,expected,name);assert.equal(JSON.stringify(l),before,name+' evidence unchanged');cases.push({name,inputFragments:l.lines.length,candidateCodes:out,expectedCodes:expected,pass:true});}
check('six_supported_metrics_not_limited_to_five',ledger(['铁蛋白 500 ng/mL','血小板 210 10^9/L','白细胞 8.20 10^9/L','CRP 4.2 mg/L','血沉 12 mm/h','AST 30 U/L']),['ferritin','plt','wbc','crp','esr','ast']);
check('unknown_cbc_names_rejected_even_in_complete_lines',ledger(['红细胞 4.50 10^12/L','红细胞压积 40 %','平均红细胞体积 85 fL','淋巴细胞百分比 30 %']),[]);
check('headed_no_position_known_only',ledger([...header,...wbc,...crp]),['wbc','crp']);
check('headed_no_position_unknown_first_stops_later_known',ledger([...header,...rbc,...wbc,...crp]),[]);
check('headed_no_position_unknown_middle_stops_later_known',ledger([...header,...wbc,...rbc,...crp]),['wbc']);
check('explicit_canonical_unit',ledger(['白细胞 8.20 10^9/L']),['wbc']);
check('unit_case_variant_rejected',ledger(['白细胞 8.20 10^9/l']),[]);
check('missing_unit_rejected',ledger(['白细胞 8.20']),[]);
check('numeric_arrow_suffix_rejected',ledger(['白细胞 8.20↑ 10^9/L']),[]);
const low=ledger(['白细胞 8.20 10^9/L']);low.lines[0].confidence=.01;
check('low_provider_confidence_not_a_candidate_filter',low,['wbc']);
const spatial=parallelLedger();const five=['wbc','plt','crp','anc','hb'];
check('fictional_parallel_table_with_unknown_rows',spatial,five);
const arrow=structuredClone(spatial);arrow.lines.find(l=>l.text==='8.20').text+='↑';arrow.rawText=arrow.lines.map(l=>l.text).join('\n');
check('spatial_result_arrow_suffix_drops_known_row',arrow,['plt','crp','anc','hb']);
const changedHeader=structuredClone(spatial);for(const l of changedHeader.lines)if(l.text==='中文名称')l.text='检验名称';changedHeader.rawText=changedHeader.lines.map(l=>l.text).join('\n');
check('different_bilingual_name_header_loses_table_projection',changedHeader,[]);
const paths=['web/domain/model.js','web/domain/state/candidates.js','web/domain/state/ocr_tables.js','web/domain/state/ocr_fragments.js','web/domain/state/ocr_aliases.js','web/domain/state/catalog.js','web/features/editor.js','web/app/editor_flow.js','web/app/main.js','web/domain/service.js','gateway/tencent.py','tests/fixtures/ocr_parallel.mjs'];
const sourceHashes=Object.fromEntries(paths.map(path=>[path,createHash('sha256').update(readFileSync(new URL('../../'+path,import.meta.url))).digest('hex')]));
console.log(JSON.stringify({scope:'author one-off synthetic parser diagnosis; not full regression, real OCR or independent acceptance',networkCalls:0,patientInputsRead:0,formalRecordsSaved:0,dictionaryCodes:Object.keys(DICTIONARY),dictionaryCount:Object.keys(DICTIONARY).length,passed:cases.length,cases,sourceHashes},null,2));
