// Fictional values and geometry, independently constructed; no patient image/text.
export function parallelLedger(){
 const cells=[];const add=(text,x,y,w=70,h=20)=>cells.push({text,x,y,w,h});
 for(const base of [0,650])for(const [text,x,w] of [['英文',40,45],['中文名称',110,90],['结果',330,50],['单位',425,50],['参考范围',535,90]])add(text,base+x,4+x/110,w);
 const rows=[
  [0,40,'1 WBC','*白细胞','8.20','x10^9/L'],
  [0,75,'2 NEUT%','中性粒细胞百分比','61.0','%'],
  [0,110,'3 NEUT#中性粒细胞绝对值',null,'5.00','x10^9/L'],
  [0,145,'4 HGB','*血红蛋白','119','g/L'],
  [650,40,'21 PLT','*血小板','287','x10^9/L'],
  [650,75,'22 CRP','C反应蛋白','4.2','mg/L'],
  [650,110,'23 UNKNOWN','其他项目','37','%']
 ];
 for(const [base,y,en,cn,value,unit]of rows){add(en,base,y,cn?90:280,24);if(cn)add(cn,base+110,y+1,110,24);add(value,base+330,y+5,50);add(unit,base+425,y+6,92);add('0',base+535,y+6,20);add('-999',base+560,y+6,60);}
 cells.sort((a,b)=>a.y-b.y||a.x-b.x);
 const lines=cells.map((c,i)=>({id:'synthetic_table_'+String(i).padStart(8,'0'),order:i,text:c.text,page:1,confidence:.99,coordinates:[{x:c.x,y:c.y},{x:c.x+c.w,y:c.y},{x:c.x+c.w,y:c.y+c.h},{x:c.x,y:c.y+c.h}]}));
 return {version:'ocr-ledger/1',provider:'fictional',region:'local',rawText:lines.map(x=>x.text).join('\n'),lines};
}
export const expected=[['wbc','8.20','10^9/L'],['plt','287','10^9/L'],['crp','4.2','mg/L'],['anc','5.00','10^9/L'],['hb','119','g/L']];
