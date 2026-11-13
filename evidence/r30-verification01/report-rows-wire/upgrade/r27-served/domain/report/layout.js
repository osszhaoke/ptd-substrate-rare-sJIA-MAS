// A read-only coordinate frame for table parsing. Evidence keeps original polygons.
export function reportBoxes(ledger) {
 const raw = ledger.provider === 'tencent-general-accurate' ? ledger.providerRaw?.Response?.Angle : null;
 const angle = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw < 360 ? raw : 0;
 const radians = angle * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
 return ledger.lines.flatMap(line => {
  if (!line.coordinates || line.coordinates.length < 3) return [];
  const points = line.coordinates.map(p => ({x:p.x*cos+p.y*sin, y:-p.x*sin+p.y*cos}));
  const left = Math.min(...points.map(p=>p.x)), right = Math.max(...points.map(p=>p.x));
  const top = Math.min(...points.map(p=>p.y)), bottom = Math.max(...points.map(p=>p.y));
  const dx=points[1].x-points[0].x,edge=dx?(points[1].y-points[0].y)/dx:null;
  const slope=edge!==null&&Math.abs(edge)<=.3?edge:null;
  return right > left && bottom > top ? [{line,left,right,top,bottom,cy:(top+bottom)/2,slope}] : [];
 });
}
