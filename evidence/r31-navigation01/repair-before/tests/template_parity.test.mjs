import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {templateCases} from './template_cases.mjs';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/r06-template-output.json',import.meta.url),'utf8'));
const modules=Object.fromEntries(await Promise.all(['editor','records','settings','states','clinical_flags'].map(async name=>[name,await import('../web/features/'+name+'.js')])));
const approved=[
 ['2 核对</li>','2 核信息</li>'],['3 保存</li>','3 存数据</li>'],
 ['可拍照、选图片，也可以直接手填。','为自己记病程时，可拍照、选图或手填。选图先留在本机，只有点“上传并识别”才会上传。'],
 ['下一步：核对内容','下一步：核信息'],
 ['<h2>核对或填写内容</h2>','<h2>核信息</h2><p class="muted">请对照报告，为自己核准日期、数值和单位，方便下次就诊。这里只在本机填写，不会发给医生或 AI。</p>'],
 ['下一步：确认保存','下一步：存数据'],
 ['<h2>确认后保存</h2>','<h2>存数据</h2><p class="muted">由你确认后存入本机病程，方便看变化或就诊时出示。不会自动发送；清理网站数据会丢失，请到“本机”导出备份。</p>']
];
const removedUpdate='\n <section class="panel"><h2>应用更新</h2><button id="check-update" class="wide" type="button">检查更新</button><p id="update-status"></p></section>';
const extraFormat='<p class="muted">文件为 .ptds 加密备份，需在本页输入密码恢复，不能直接当表格打开。</p>'+ 
 '<details id="backup-format"><summary>文件名和内容字段</summary>'+
 '<p class="muted">文件名：PTDS-encrypted-backup-日期.ptds。</p>'+
 '<p class="muted">记录字段：记录日期、采样时间（如填）、检查项目、数值、单位、身体情况、病程与备注。</p>'+
 '<p class="muted">原件信息：原文件名、原图、识别原文和来源关联（如有）。</p>'+
 '<p class="muted">保存信息：记录时区、保存时间、备份时间和完整性核对信息。</p></details>';
test('R06 fixed output changes only approved R08 editor text and R09 settings simplification',()=>{
  const cases=templateCases();
  assert.equal(cases.length,baseline.outputs.length);
  cases.forEach(({module,fn,args},i)=>{
   let expected=module==='editor'&&fn==='editor'?approved.reduce((s,[a,b])=>s.replaceAll(a,b),baseline.outputs[i]):baseline.outputs[i];
   if(module==='settings'&&fn==='settingsPage'){
    assert.ok(expected.includes(removedUpdate));expected=expected.replace(removedUpdate,'');
    const spaces={0:'不到0.1 MB',1:'不到0.1 MB',1048576:'约 1.0 MB',3879731:'约 3.7 MB'};
    assert.ok(Object.hasOwn(spaces,args[1].usage));
    expected=expected.replace(/^<h1>本机<\/h1><section class="panel"><h2>占用空间<\/h2><p>[^<]+<\/p><\/section>/,
     `<h1 class="local-usage-heading" id="local-usage-title">本机<span>（空间占用：${spaces[args[1].usage]}）</span></h1>`);
    const before='<p>上次备份：';assert.ok(expected.includes(before));expected=expected.replace(before,extraFormat+before);
   }
   assert.equal(modules[module][fn](...args),expected,module+'.'+fn+' case '+i);
  });
});
