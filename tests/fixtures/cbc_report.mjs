// Frozen 27-row fictional coverage fixture; no patient report values or geometry.
export const CBC_ROWS=[
 ['WBC','白细胞','8.20↑','10^9/l','3.5-9.5'],['RBC','红细胞','4.50','10^12/L','3.8-5.1'],
 ['HGB','血红蛋白','120','g/L','115-150'],['HCT','红细胞压积','39','%','35-45'],
 ['MCV','平均红细胞体积','86','fL','82-100'],['MCH','平均红细胞血红蛋白量','28','pg','27-34'],
 ['MCHC','平均红细胞血红蛋白浓度','330','g/L','316-354'],['RDW-CV','红细胞分布宽度变异系数','13','%','11-16'],
 ['RDW-SD','红细胞分布宽度标准差','42','fL','35-56'],['PLT','血小板','210','10^9/L','125-350'],
 ['MPV','平均血小板体积','9.0','fL','7-13'],['PDW','血小板分布宽度','12','fL','9-17'],
 ['PCT','血小板压积','0.20','%','0.1-0.3'],['P-LCR','大血小板比率','25','%','13-43'],
 ['NEUT%','中性粒细胞百分比','60','%','40-75'],['LYMPH%','淋巴细胞百分比','30','%','20-50'],
 ['MONO%','单核细胞百分比','7','%','3-10'],['EO%','嗜酸性粒细胞百分比','2','%','0-6'],
 ['BASO%','嗜碱性粒细胞百分比','1','%','0-1'],['NEUT#','中性粒细胞绝对值','4.92','10^9/L','1.8-6.3'],
 ['LYMPH#','淋巴细胞绝对值','2.46','10^9/L','1.1-3.2'],['MONO#','单核细胞绝对值','0.57','10^9/L','0.1-0.6'],
 ['EO#','嗜酸性粒细胞绝对值','0.16','10^9/L','0-0.52'],['BASO#','嗜碱性粒细胞绝对值','0.08','10^9/L','0-0.06'],
 ['NRBC%','有核红细胞百分比','0','%','0-0'],['NRBC#','有核红细胞绝对值','0','10^9/L','0-0'],
 ['CRP','C反应蛋白','4.2','mg/L','0-10']
];
export function cbcLedger({pages=1,header='中文名称'}={}){
 const lines=[];const add=(text,x,y,w,page)=>{const i=lines.length;lines.push({id:'cbc_fictional_'+String(i).padStart(8,'0'),order:i,text,page,confidence:.99,coordinates:[{x,y},{x:x+w,y},{x:x+w,y:y+20},{x,y:y+20}]});};
 for(let page=1;page<=pages;page++){
  for(const base of [0,650])for(const [text,x,w]of [['英文',10,75],[header,100,180],['结果',330,70],['单位',425,95],['参考范围',535,95]])add(text,base+x,0,w,page);
  CBC_ROWS.forEach(([en,cn,value,unit,ref],i)=>{const base=i<14?0:650,y=35+(i%14)*35;for(const [text,x,w]of [[en,10,75],[cn,100,220],[value,330,70],[unit,425,95],[ref,535,95]])add(text,base+x,y,w,page);});
 }
 return {version:'ocr-ledger/1',provider:'fictional',rawText:lines.map(l=>l.text).join('\n'),lines};
}
export function plainLedger(texts){return{version:'ocr-ledger/1',rawText:texts.join('\n'),lines:texts.map((text,i)=>({id:'cbc_plain_'+String(i).padStart(8,'0'),order:i,text,page:null,confidence:.99,coordinates:null}))};}
