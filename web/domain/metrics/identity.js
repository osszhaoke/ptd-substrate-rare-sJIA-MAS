import {DICTIONARY} from '../report/fields.js';
import {knownUnit} from '../state/catalog.js';
import {REPORT_METRICS, DISPLAY_BILINGUAL} from './catalog.js';
import {OCR_ALIASES} from '../state/ocr_aliases.js';

export const METRIC_IDENTITY_VERSION = 'report-metric/2';
// Only exact count-unit spelling equivalences; no concentration conversion or FEU/DDU merging.
export function unitIdentity(unit) {
  if (/^(?:[xX×*])?10(?:\^|~)?9\/[Ll]$/.test(unit)) return '10^9/L';
  if (/^(?:[xX×*])?10(?:\^|~)?12\/[Ll]$/.test(unit)) return '10^12/L';
  return unit;
}
const spelling = name => name.normalize('NFKC').replace(/\s|[★＊*]/g, '').toUpperCase();
// Remove an unambiguous printed serial prefix; never remove digits from e.g. 25羟维生素D.
export const rawName = name => name.trim().replace(/^\d{1,3}\s+(?=[^\d])/,'').replace(/^[★＊*\s]+/,'').trim();
// Both the existing canonical dictionary and the display-only catalog must use the same strict boundary.
const labelSet=(code,names)=>new Set([...names,...(DISPLAY_BILINGUAL[code]||[])].map(spelling));
const prepared=[
  ...Object.entries(DICTIONARY).map(([code,[displayName]])=>({code,displayName,identity:'CANONICAL',labels:labelSet(code,[displayName,...(OCR_ALIASES[code]||[])])})),
  ...REPORT_METRICS.map(([id,displayName,names,units])=>({code:'report:'+id,displayName,units,identity:'ALIAS',labels:labelSet('report:'+id,names)}))
];
// Keep the report's Chinese name visible beside common abbreviations on status cards.
const DISPLAY_LABELS=Object.freeze({ast:'AST（谷草转氨酶）','report:alt':'ALT（谷丙转氨酶）'});
const matches=(name,labels)=>labels.has(spelling(name));
export function metricIdentity(row) {
  const name=rawName(row.name), unit=unitIdentity(row.unit);
  const found=prepared.filter(m=>(m.units?m.units.includes(unit):knownUnit(m.code,unit))&&matches(name,m.labels));
  if(found.length===1){const {code,displayName,identity}=found[0];return {code,displayName:DISPLAY_LABELS[code]||displayName,unit,identity};}
  // Every saved row remains visible, including qualitative and damaged OCR names.
  // Exact raw labels are not promoted to medical codes or fuzzy alias matches.
  return {code:'raw:'+name.normalize('NFKC'),displayName:name||row.name,unit,identity:'REPORT_NAME'};
}
export function metricRows(event) {
  const p=event.payload;
  if (event.schema==='ptds-browser/3' && Array.isArray(p.reportRows)) {
    return [...p.reportRows.map((row,index)=>({...row, ...metricIdentity(row), originalName:row.name,
      originalUnit:row.unit, ref:event.id+':row:'+index, rowIndex:index, kind:'report'})), ...(p.manualObservations||[]).map((o,index)=>({
      ...o,originalName:o.displayName,originalUnit:o.unit,ref:event.id+':manual:'+index,observationIndex:index,kind:'manual',identity:'CANONICAL'
    }))];
  }
  return p.observations.map((o,index)=>({...o,originalName:o.displayName||o.code,originalUnit:o.unit,
    ref:event.id+':'+index,observationIndex:index,kind:'observation',identity:'CANONICAL'}));
}
