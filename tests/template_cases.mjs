// Fixed fictional cases captured before the R07 pure template refactor.
import {evaluate} from '../web/domain/state/evaluate.js';
import {H1_DICTIONARY} from '../web/rules/definitions.js';

export function templateCases() {
  const cases = [];
  const add = (module, fn, ...args) => cases.push({module, fn, args});
  const observation = {code:'crp', displayName:'C反应蛋白 <&>', comparator:'>', valueLiteral:'3.40', unit:'mg/L', context:'LAB', sourceLineIds:[]};
  const payload = {clinicalDate:'2020-02-29', instanceTimezone:'Asia/Shanghai', nature:'REAL', sourceKind:'MANUAL', observations:[observation], clinicalFlags:{FEVER:true, ARTHRITIS:false, SPLENOMEGALY:null}, note:'虚构 <script> & "\n第二行'};
  const event = {id:'fictional_event_01', payload};
  const source = {id:'fictional_source_01', name:'虚构 <&>.png', hash:'a'.repeat(64), ledger:null};
  const ledgerSource = {...source, ledger:{rawText:'虚构 <&>\n重复原行', lines:[{id:'fictional_line_01',text:'CRP >3.40 mg/L'},{id:'fictional_line_02',text:'CRP >3.40 mg/L'}], provider:'虚构提供者', region:'虚构区域'}};
  for (const original of [null,source,ledgerSource]) {
    for (const enabled of [false,true]) {
      add('editor','editor',{zone:'Asia/Shanghai',payload,source:original,config:{enabled,disclosure:'虚构 <&>',maxImageBytes:2097152}});
    }
    add('editor','ledgerView',original);
    add('records','detailPage',event,{id:'fictional_receipt_01',at:'2020-02-29T10:00:00Z',digest:'b'.repeat(64)},original);
  }
  add('editor','editor',{zone:'Asia/Shanghai',payload:{...payload,observations:[],nature:'SYNTHETIC',observedAt:'2020-02-29T08:00:00+08:00'},source:null,config:{enabled:true}});
  for (const row of [{...observation}, {...observation,sourceLineIds:['fictional_line_01'],unitInferred:true}, {...observation,comparator:null}]) add('editor','row',row);
  for (const page of [{items:[],next:null},{items:[event],next:'fictional_cursor'},{items:[{...event,payload:{...payload,observations:[]}}],next:null}]) add('records','recordsPage',page,'2020-02-29','<section>虚构状态</section>');
  for (const day of ['2020-03-01','2021-01-01','2020-02-29']) add('records','calendarDays',day,'Asia/Shanghai');
  for (const usage of [0,1,1048576,3879731]) for (const backup of [null,{at:'2020-02-29T10:00:00Z'}]) add('settings','settingsPage','Asia/Shanghai',{usage},backup);
  const raw = {FEVER:true,SJIA_KNOWN_OR_SUSPECTED:true,LAB_NOT_OTHERWISE_EXPLAINED:true,FERRITIN:'1000',PLT:'100',AST:'80',TG:'300',FIB:'100',LDH:'500',HB:'80',ANC:'0.5',SCD25:'3000',CNS_INVOLVEMENT:false,HEMORRHAGE:false,ARTHRITIS:false,SPLENOMEGALY:true,HEMOPHAGOCYTOSIS:false,NK_LOW:false};
  const values = Object.fromEntries(Object.entries(raw).map(([code,value]) => [code,{value,unit:H1_DICTIONARY.codes[code]?.unit_canonical??null,comparator:null,refs:['fictional_ref']} ]));
  const point = (date,values) => ({date,values,rules:Object.fromEntries(['R1','R2','R3'].map(id=>[id,evaluate(id,values)])),sources:{fictional_ref:{eventId:event.id,code:'FERRITIN',literal:'1000',originalUnit:'ng/mL',sourceLineIds:[]}}});
  const variants = [[],[point('2020-02-29',{})],[point('2020-02-29',values),point('2020-02-28',{...values,FERRITIN:{...values.FERRITIN,value:'900'}})],[point('2020-02-29',{...values,FERRITIN:{...values.FERRITIN,conflict:true,value:null}}),point('2020-02-28',values),point('2020-02-27',{})]];
  for (const points of variants) {
    const snapshot={points,binding:{fictional:true},excludedTimezone:1,next:'2020-01-01'};
    add('states','stateCards',snapshot,true);
    add('states','stateCards',snapshot,false);
    for (const id of ['R1','R2','R3']) {
      add('states','stateDetail',snapshot,id,{});
      add('states','stateDetail',snapshot,id,{history:true,date:points.at(-1)?.date??null});
    }
  }
  add('clinical_flags','clinicalFlags',{});
  add('clinical_flags','clinicalFlags',{FEVER:true,ARTHRITIS:false,SPLENOMEGALY:null});
  return cases;
}
