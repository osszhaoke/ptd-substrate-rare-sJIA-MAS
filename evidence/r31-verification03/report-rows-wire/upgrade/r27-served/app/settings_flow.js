import {today,need} from '../domain/model.js';
import {exportBackup,inspectBackup,restoreBackup} from '../storage/backup.js';
import {settingsPage} from '../features/settings.js';
import {$,button,notice,download} from './ui.js';

// One mount owns its preview. Store, task and write admission remain the existing owners.
export async function mountSettings({main,store,backupTask,on,zone,current,setup,afterClear}){
 let inspection=null;

  const [estimate,backup]=await Promise.all([navigator.storage?.estimate?.()||{},store.get('meta','lastBackup')]);if(!current())return;
  main.innerHTML=settingsPage(zone,estimate,backup);
  on('export',async()=>{
   const password=$('#password').value;
   const b=await backupTask.run(job=>exportBackup(store,password,job));if(!current())return;
   download(b,'PTDS-encrypted-backup-'+today(zone)+'.ptds');$('#password').value='';$('#backup-progress').textContent='备份已生成，请确认文件下载好了。';
  });
  on('inspect-backup',async()=>{
   const f=$('#backup-file').files[0];need(f,'请选择备份文件');inspection=null;$('#import-preview').innerHTML='';
   const password=$('#password').value,checked=await backupTask.run(job=>inspectBackup(f,password,store,job));if(!current())return;
   inspection=checked;$('#password').value='';const s=inspection.summary;
   $('#backup-progress').textContent='已核对，请确认是否恢复。';$('#cancel-backup').hidden=false;$('#cancel-backup').disabled=false;
   $('#import-preview').innerHTML=`<p>共 ${s.records} 条记录、${s.originals} 张原图。</p><p class="muted">本机已有 ${s.duplicates} 条相同记录，${s.conflicts.length} 条内容对不上。</p><p class="muted">只恢复已保存的记录，不会上传图片。</p>${button('restore','确认恢复','primary wide')}`;$('#restore').disabled=s.conflicts.length>0;
   on('restore',async()=>{
    need(inspection,'请选择备份文件');const checked=inspection;
    const result=await backupTask.run(job=>job.commit(()=>restoreBackup(store,checked)));inspection=null;
    notice(`恢复完成：新增 ${result.added} 条`);await setup();
   });
  });
  $('#cancel-backup').onclick=()=>{
   if(!backupTask.cancel())return;
   inspection=null;$('#import-preview').innerHTML='';$('#backup-progress').textContent=backupTask.busy?'正在取消…':'已取消，原有病程未改变。';
   if(!backupTask.busy)$('#cancel-backup').hidden=true;
  };
  on('clear-all',async()=>{need(!backupTask.busy,'BACKUP_BUSY');if(prompt('将删除这里全部记录和图片，请先备份。输入 清除 确认')!=='清除')return;await store.clear();afterClear();await setup();});
 return true;
}
