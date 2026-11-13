// Entirely fictional geometry and results; never copied from a patient response.
export function layoutLedger({angle=0,swapped=false,joined=false,slope=0,pages=1,pending=false}={}){
 const lines=[],r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 const add=(text,x,y,w,page)=>{const h=18;y+=slope*x;const points=[[x,y],[x+w,y+slope*w],[x+w,y+slope*w+h],[x,y+h]];
  lines.push({id:'layout_fictional_'+String(lines.length).padStart(8,'0'),order:lines.length,text,page,confidence:.99,coordinates:points.map(([x,y])=>({x:1600+x*c-y*s,y:1600+x*s+y*c}))});};
 for(let page=1;page<=pages;page++)for(const base of [0,700]){
  for(const [t,x,w]of [['项目',0,100],['测定结果',230,80],['单位',swapped?480:350,70],['生物参考区间',swapped?350:480,swapped?100:160]])add(t,base+x,0,w,page);
  add('虚构甲项目',base,45,130,page);add('7.25',base+230,45,65,page);
  if(joined&&!swapped)add('mg/L 2-9',base+350,45,260,page);else{add('mg/L',base+(swapped?480:350),45,60,page);add('2-9',base+(swapped?350:480),45,100,page);}
  add('白球比',base,90,130,page);add('1.70',base+230,90,65,page);add('1-2',base+(swapped?350:480),90,100,page);
  if(pending)add('虚构乙项目123',base,135,310,page);else{add('虚构乙项目',base,135,130,page);add('11.2',base+230,135,65,page);}
  add('U/L',base+(swapped?480:350),135,60,page);add('4-15',base+(swapped?350:480),135,100,page);
  add('检验者：虚构人员',base,190,200,page);add('虚构页脚项目',base,235,130,page);add('999',base+230,235,65,page);add('U/L',base+(swapped?480:350),235,60,page);add('4-15',base+(swapped?350:480),235,100,page);
 }
 return {version:'ocr-ledger/1',provider:'tencent-general-accurate',providerRaw:{Response:{Angle:angle}},rawText:lines.map(l=>l.text).join('\n'),lines};
}

export function thirdBatchLedger({stacked=false,qualitative=false,splitHeader=false,headerMetadata=false}={}){
 const first=layoutLedger();first.providerRaw.Response.Angle=0;
 if(qualitative){
  for(const l of first.lines){if(l.text==='7.25')l.text='阴性';if(l.text==='mg/L')l.text='';if(l.text==='2-9')l.text='阴性';if(l.text==='白球比')l.text='★比重';if(l.text==='1.70')l.text='1.015';if(l.text==='1-2')l.text='1.003-1.030';if(l.text==='虚构乙项目')l.text='1 ★虚构甲(1:10)';if(l.text==='11.2')l.text='↑11.2';}
 }
 if(splitHeader){
  for(const l of first.lines.filter(l=>l.text==='项目')){const old=structuredClone(l);l.text='项';l.coordinates[1].x=l.coordinates[0].x+22;l.coordinates[2].x=l.coordinates[1].x;old.text='目';old.coordinates=old.coordinates.map(p=>({...p,x:p.x+25}));old.id='split_'+old.id;first.lines.push(old);}
 }
 if(headerMetadata)first.lines.unshift({id:'header_time_fictional_0001',order:0,text:'采样时间：2020-01-01',page:1,confidence:.99,coordinates:[{x:1600,y:1500},{x:1700,y:1500},{x:1700,y:1520},{x:1600,y:1520}]});
 if(stacked){const second=layoutLedger();for(const l of second.lines)first.lines.push({...l,id:'second_'+l.id,coordinates:l.coordinates.map(p=>({...p,y:p.y+400}))});}
 first.lines.forEach((l,i)=>l.order=i);first.rawText=first.lines.map(l=>l.text).join('\n');return first;
}
export function neutralFlagLedger(){
 const l=thirdBatchLedger({qualitative:true});
 for(const base of [0,700])for(const [text,y]of [['提示',0],['-',45],['-',90],['-',135]])l.lines.push({id:'neutral_'+base+'_'+y,order:l.lines.length,text,page:1,confidence:.99,coordinates:[{x:1600+base+320,y:1600+y},{x:1600+base+339,y:1600+y},{x:1600+base+339,y:1618+y},{x:1600+base+320,y:1618+y}]});
 l.lines.forEach((r,i)=>r.order=i);l.rawText=l.lines.map(l=>l.text).join('\n');return l;
}

export function asymmetricFooterLedger({mirror=false,angle=0,slope=0}={}){
 const l=layoutLedger({slope});
 for(const line of l.lines)if(line.text.startsWith('检验者')&&((line.coordinates[0].x>=2300)===mirror))line.coordinates=line.coordinates.map(p=>({...p,y:p.y-85}));
 const radians=angle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
 for(const line of l.lines)line.coordinates=line.coordinates.map(p=>({x:1600+(p.x-1600)*c-(p.y-1600)*s,y:1600+(p.x-1600)*s+(p.y-1600)*c}));
 l.providerRaw.Response.Angle=angle;return l;
}

import {cbcLedger,plainLedger} from './cbc_report.mjs';
export function incompleteUnitLedger(kind='legacy'){
 let l;
 if(kind==='legacy'){l=cbcLedger();l.lines.find(x=>x.text==='10^12/L').text='mg/';}
 else if(kind==='generic'){l=layoutLedger();for(const line of l.lines)if(line.text==='mg/L')line.text='mg/';}
 else if(kind==='flat')l=plainLedger(['项目','结果','单位','参考范围','RBC','4.50','mg/','3-6']);
 else if(kind==='inline')l=plainLedger(['RBC 4.50 mg/']);
 else if(kind==='cells'){
  l=plainLedger(['RBC','4.50','mg/']);l.lines.forEach((line,i)=>line.coordinates=[{x:10+i*200,y:100},{x:110+i*200,y:100},{x:110+i*200,y:120},{x:10+i*200,y:120}]);
 }else throw Error('UNKNOWN_FICTIONAL_LAYOUT');
 l.rawText=l.lines.map(x=>x.text).join('\n');return l;
}

export function bilingualFooterLedger(){
 const l=cbcLedger();
 const add=(text,x,y,w)=>l.lines.push({id:'footer_bilingual_'+l.lines.length,order:l.lines.length,text,page:1,confidence:.99,coordinates:[{x,y},{x:x+w,y},{x:x+w,y:y+20},{x,y:y+20}]});
 add('检验者：虚构人员',10,530,200);
 for(const [text,x,w]of [['CRP',10,75],['C反应蛋白',100,220],['999',330,70],['mg/L',425,95],['0-10',535,95]])add(text,x,565,w);
 l.rawText=l.lines.map(x=>x.text).join('\n');return l;
}
