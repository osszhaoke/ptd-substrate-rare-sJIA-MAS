// Read-only projection of an already committed snapshot. No Store, clock, or UI owner.
import {DICTIONARY, NUMERIC} from '../report/fields.js';
import {knownUnit} from './catalog.js';
import {dec} from './decimal.js';
import {metricRows, METRIC_IDENTITY_VERSION} from '../metrics/identity.js';
import {QUALITATIVE, reportUnitNeedsReview, dimensionless} from '../report/table_fields.js';

const SCHEMAS = new Set(['ptds-browser/1', 'ptds-browser/2', 'ptds-browser/3']);
const COMPARATORS = new Set([null, '<', '<=', '>', '>=']);
const MAX_EVENTS = 20000; // Existing model record cap; no silent truncation.
const MAX_OBSERVATIONS = 100; // Existing per-record model cap.
function need(value, code) { if (!value) throw Error(code); }
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1 &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function dateInZone(instant, formatter) {
  const parts = formatter.formatToParts(new Date(instant));
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function validInstant(value, date, formatter) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    validDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 &&
    Number(value.slice(14, 16)) < 60 && Number(value.slice(17, 19)) < 60 &&
    Number.isFinite(Date.parse(value)) && dateInZone(value, formatter) === date;
}
function change(current, previous) {
  if (!current || !previous) return {available: false, reason: 'MISSING_POINT'};
  if (current.status !== 'EXACT' || previous.status !== 'EXACT') {
    return {available: false, reason: 'NON_EXACT_POINT'};
  }
  const before = dec(previous.value), after = dec(current.value), delta = after.sub(before);
  return {
    available: true, before: previous.value, after: current.value,
    delta: delta.toString(),
    percent: before.cmp('0') === 0 ? null : delta.mul('100').ratio(before.cmp('0') < 0 ? before.mul('-1') : before),
    reason: before.cmp('0') === 0 ? 'ZERO_PREVIOUS' : null
  };
}

/** dates is the complete list of inspected clinical dates in this page, not a daily grid.
 * A date without this metric breaks the line. No missing days or order are invented.
 * Units stay separate, even where a later reviewed conversion could be possible.
 */
export function projectMetricSeries(snapshot, {nature, zone, codes = null}) {
  need(['REAL', 'SYNTHETIC'].includes(nature), 'SERIES_NATURE_REQUIRED');
  need(typeof zone === 'string' && zone.length > 0, 'SERIES_ZONE_REQUIRED');
  let formatter;
  try { formatter = new Intl.DateTimeFormat('en-US', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}); }
  catch { throw Error('SERIES_ZONE_INVALID'); }
  need(snapshot && typeof snapshot.revision === 'string' && snapshot.revision.length > 0, 'SERIES_REVISION_REQUIRED');
  need(Array.isArray(snapshot.events) && snapshot.events.length <= MAX_EVENTS, 'SERIES_EVENT_LIMIT');
  need(Array.isArray(snapshot.dates) && snapshot.dates.length <= MAX_EVENTS &&
    snapshot.dates.every(validDate) && new Set(snapshot.dates).size === snapshot.dates.length, 'SERIES_DATES_INVALID');
  need(codes === null || Array.isArray(codes) && codes.every(c => typeof c === 'string') &&
    new Set(codes).size === codes.length, 'SERIES_CODES_INVALID');
  const requested = codes === null ? null : new Set(codes), dates = [...snapshot.dates].sort(), dateSet = new Set(dates);
  const groups = new Map(), ids = new Set();
  const excluded = {nature: 0, timezone: 0, unsupportedCode: 0};
  for (const event of snapshot.events) {
    need(event && typeof event.id === 'string' && event.id.length > 0 && !ids.has(event.id), 'SERIES_EVENT_ID_INVALID');
    ids.add(event.id);
    need(SCHEMAS.has(event.schema), 'SERIES_SCHEMA_UNSUPPORTED');
    const p = event.payload;
    need(p && ['REAL', 'SYNTHETIC'].includes(p.nature), 'SERIES_EVENT_NATURE_INVALID');
    need(typeof p.instanceTimezone === 'string' && p.instanceTimezone.length > 0, 'SERIES_EVENT_ZONE_REQUIRED');
    if (p.nature !== nature) { excluded.nature++; continue; }
    if (p.instanceTimezone !== zone) { excluded.timezone++; continue; }
    need(validDate(p.clinicalDate) && dateSet.has(p.clinicalDate), 'SERIES_EVENT_DATE_INVALID');
    need(Array.isArray(p.observations) && p.observations.length <= MAX_OBSERVATIONS, 'SERIES_OBSERVATION_LIMIT');
    const observations=metricRows(event);
    need(observations.length<=MAX_OBSERVATIONS, 'SERIES_OBSERVATION_LIMIT');
    const legacy = event.schema === 'ptds-browser/1';
    const instant = legacy ? null : p.observedAt ?? null;
    need(instant === null || validInstant(instant, p.clinicalDate, formatter), 'SERIES_INSTANT_INVALID');
    observations.forEach((o, observationIndex) => {
      need(o && typeof o.code === 'string', 'SERIES_OBSERVATION_INVALID');
      if (o.kind !== 'report' && !Object.hasOwn(DICTIONARY, o.code)) { excluded.unsupportedCode++; return; }
      if (requested && !requested.has(o.code)) return;
      need(typeof o.unit === 'string' && o.unit.length <= 100 &&
        typeof o.valueLiteral === 'string' && o.valueLiteral.length <= 100 &&
        Array.isArray(o.sourceLineIds) && o.sourceLineIds.length <= 100 &&
        o.sourceLineIds.every(id => typeof id === 'string'), 'SERIES_OBSERVATION_INVALID');
      const comparator = legacy ? null : o.comparator ?? null;
      const numeric = NUMERIC.test(o.valueLiteral);
      const unitKnown = o.kind === 'report' ? !reportUnitNeedsReview(o) && (!!o.unit || dimensionless(o.originalName) || QUALITATIVE.test(o.valueLiteral.trim())) : knownUnit(o.code, o.unit);
      const valid = numeric && unitKnown && COMPARATORS.has(comparator);
      const textResult=o.kind==='report' && !!o.valueLiteral.trim() && !numeric && comparator===null && unitKnown;
      const key = JSON.stringify([o.code, o.unit]);
      if (!groups.has(key)) groups.set(key, {
        key, code: o.code, displayName: DICTIONARY[o.code]?.[0] || o.displayName, unit: o.unit, identity:o.identity, points: []
      });
      groups.get(key).points.push({
        ref: o.ref, eventId: event.id, observationIndex: o.observationIndex ?? null, rowIndex:o.rowIndex ?? null,
        originalName:o.originalName, kind:o.kind, referenceRange:o.referenceRange ?? '', abnormalFlag:o.abnormalFlag ?? '',
        sourceId: event.sourceBinding?.id ?? null, sourceLineIds: [...o.sourceLineIds],
        date: p.clinicalDate, observedAt: instant,
        valueLiteral: o.valueLiteral, originalUnit: o.originalUnit, comparator,
        value: valid ? dec(o.valueLiteral).toString() : null,
        status: textResult ? 'TEXT' : !valid ? 'INVALID' : comparator ? 'BOUND' : 'EXACT',
        reason: textResult ? null : !numeric ? 'VALUE_INVALID' : !unitKnown ? 'UNIT_UNSUPPORTED' :
          !COMPARATORS.has(comparator) ? 'COMPARATOR_INVALID' : null
      });
    });
  }
  const series = [...groups.values()].sort((a, b) =>
    a.code < b.code ? -1 : a.code > b.code ? 1 : a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0);
  for (const group of series) {
    const byDate = new Map();
    for (const point of group.points) {
      if (!byDate.has(point.date)) byDate.set(point.date, []);
      byDate.get(point.date).push(point);
    }
    for (const rows of byDate.values()) {
      const ambiguousDate = rows.length > 1 && rows.some(p => !p.observedAt);
      const counts = new Map();
      for (const p of rows) if (p.observedAt) {
        const t = Date.parse(p.observedAt); counts.set(t, (counts.get(t) || 0) + 1);
      }
      for (const p of rows) if (ambiguousDate || p.observedAt && counts.get(Date.parse(p.observedAt)) > 1) {
        p.status = 'CONFLICT'; p.reason = ambiguousDate ? 'DATE_ORDER_UNKNOWN' : 'DUPLICATE_INSTANT';
      }
      for (const p of rows) if (snapshot.partialDates?.includes(p.date)) {
        p.status='CONFLICT';p.reason='PAGE_DATE_PARTIAL';
      }
      rows.sort((a, b) => (Date.parse(a.observedAt) || 0) - (Date.parse(b.observedAt) || 0) ||
        (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
    }
    group.points = dates.flatMap(date => byDate.get(date) || []);
    group.gaps = dates.filter(date => !byDate.has(date));
    group.segments = [];
    let segment = [];
    const flush = () => { if (segment.length) group.segments.push(segment); segment = []; };
    for (const date of dates) {
      const rows = byDate.get(date);
      if (!rows) { flush(); continue; }
      for (const point of rows) {
        if (point.status === 'EXACT') segment.push(point.ref);
        else flush();
      }
    }
    flush();
    const last = group.points.at(-1), previous = group.points.at(-2);
    // Never silently fall back to an older precise result when the latest is ambiguous.
    group.latest = last && !['INVALID', 'CONFLICT'].includes(last.status) ? last.ref : null;
    group.change = change(last, previous);
    if (last && previous && group.gaps.some(date => date > previous.date && date < last.date)) {
      group.change = {available: false, reason: 'MISSING_POINT'};
    }
  }
  return {identityVersion:METRIC_IDENTITY_VERSION, revision: snapshot.revision, nature, zone, dates, next: snapshot.next ?? null, excluded, series};
}
