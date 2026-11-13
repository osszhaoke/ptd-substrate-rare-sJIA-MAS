import {STARTUP_LEVELS} from './startup_plan.js';
import {preloadLevels,restoreStylesheets} from './startup_task.js';
const owner=new AbortController(),panel=document.createElement('section');panel.className='panel';panel.hidden=true;
panel.innerHTML='<p></p><button type="button" class="wide">重新打开</button>';
const main=document.querySelector('#main');main.before(panel);panel.querySelector('button').onclick=()=>location.reload();
const show=message=>{panel.hidden=false;panel.querySelector('p').textContent=message;};
const timer=setTimeout(()=>show('首次打开有点慢，请稍候，也可重新打开。已有记录不会清空。'),30000);
const leave=()=>{owner.abort();clearTimeout(timer);};addEventListener('pagehide',leave,{once:true});
function preload(url,signal){
 return new Promise((resolve,reject)=>{
  const link=document.createElement('link');link.rel='modulepreload';link.href=url;link.crossOrigin='anonymous';
  const clean=()=>{link.onload=null;link.onerror=null;signal.removeEventListener('abort',abort);link.remove();};
  const abort=()=>{clean();reject(new DOMException('Startup cancelled','AbortError'));};
  link.onload=()=>{clean();resolve();};link.onerror=()=>{clean();reject(new Error('STARTUP_READ_FAILED'));};
  if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});document.head.append(link);
 });
}
function restoreStyle(link,signal){
 return new Promise((resolve,reject)=>{
  const replacement=link.cloneNode();
  const clean=()=>{replacement.onload=null;replacement.onerror=null;signal.removeEventListener('abort',abort);};
  const abort=()=>{clean();reject(new DOMException('Startup cancelled','AbortError'));};
  replacement.onload=()=>{clean();resolve(replacement);};replacement.onerror=()=>{clean();reject(new Error('STARTUP_STYLE_READ_FAILED'));};
  if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});link.replaceWith(replacement);
 });
}
try{
 const styles=[...document.querySelectorAll('link[rel="stylesheet"]')];
 await restoreStylesheets(styles,restoreStyle,owner.signal);
 if(document.createElement('link').relList?.supports?.('modulepreload'))await preloadLevels(STARTUP_LEVELS,preload,owner.signal);
 if(owner.signal.aborted)throw new DOMException('Startup cancelled','AbortError');
 await import('./main.js');panel.remove();
}catch{
 show(owner.signal.aborted?'打开已中断，请重新打开。已有记录不会清空。':'暂时没打开，请重新打开试试。已有记录不会清空。');
}finally{clearTimeout(timer);removeEventListener('pagehide',leave);}
