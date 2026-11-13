import {esc,button} from '../app/ui.js';
export function settingsPage(zone,estimate,backup){
 const bytes=estimate?.usage;
 const space=typeof bytes==='number'&&Number.isFinite(bytes)&&bytes>=0?
  (bytes<104857.6?'不到0.1 MB':'约 '+(bytes/1048576).toFixed(1)+' MB'):'暂无法估算';
 return `<h1 class="local-usage-heading" id="local-usage-title">本机<span>（空间占用：${space}）</span></h1>
 ${backupPanel(zone,backup)}
 <section class="panel">` +
  `<h2>删除本机资料</h2>` +
  `<p class="muted">只删除这个浏览器里的资料，不影响已下载的备份。</p>${button('clear-all','清空本机资料','danger wide')}</section>`;
}

function backupPanel(zone,backup) {
 return `<section class="panel">` +
  `<h2>备份与恢复</h2>` +
  `<p class="muted">备份含已保存的记录和原图，不含未完成的录入和问诊草稿；问诊卡请另行下载。请另存一份，密码忘了无法找回。</p>` +
  `<p class="muted">文件为 .ptds 加密备份，需在本页输入密码恢复，不能直接当表格打开。</p>` +
  `<details id="backup-format"><summary>文件名和内容字段</summary>` +
  `<p class="muted">文件名：PTDS-encrypted-backup-日期.ptds。</p>` +
  `<p class="muted">记录字段：记录日期、采样时间（如填）、检查项目、数值、单位、身体情况、病程与备注。</p>` +
  `<p class="muted">原件信息：原文件名、原图、识别原文和来源关联（如有）。</p>` +
  `<p class="muted">保存信息：记录时区、保存时间、备份时间和完整性核对信息。</p></details>` +
  `<p>上次备份：${esc(backup?.at?new Date(backup.at).toLocaleString('zh-CN',{timeZone:zone}):'还没有')}</p>` +
  `<label class="field">备份密码（至少10位）<input id="password" type="password" autocomplete="new-password" minlength="10" maxlength="1024">` +
  `</label>${button('export','下载加密备份','primary wide')}<label class="field">选择备份文件<input id="backup-file" type="file" accept="application/json,application/octet-stream,.json,.ptds">` +
  `</label>${button('inspect-backup','查看要恢复的内容','wide')}<p id="backup-progress" role="status" aria-live="polite">` +
  `</p>` +
  `<button id="cancel-backup" type="button" class="wide" hidden>取消这次处理</button>` +
  `<div id="import-preview">` +
  `</div>` +
  `<details>` +
  `<summary>备份大小限制</summary>` +
  `<p class="muted">原图合计最多64 MB。超过上限会停止，不会删除已有资料。记录很多时，恢复可能需要几十秒。</p>` +
  `</details>` +
  `</section>`;
}
