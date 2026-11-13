import {homeResources} from '../features/home_resources.js';
import {bindHomeResources} from './home_resources.js';
import {stateCards} from '../features/states.js';
import {recordsPage,calendarDays} from '../features/records.js';
import {$} from './ui.js';
import {recordsSnapshot} from './records_snapshot.js';

// The page snapshot stays local; main owns filter/cursor changes and navigation generation.
export async function mountRecords({main,store,stateController,statePrefs,zone,filter,cursor,current,navigation,on,showDetail,openPage,bindStateLinks,setHomeResources}){
  const snapshot=await recordsSnapshot({store,stateController,statePrefs,zone,filter,cursor,current});if(!snapshot)return;const {page,snap}=snapshot;main.innerHTML=homeResources()+recordsPage(page,filter,stateCards(snap,statePrefs.enabled));setHomeResources(bindHomeResources(main));bindStateLinks();
  $('#calendar-days').innerHTML=calendarDays(filter,zone);main.querySelectorAll('[data-date]').forEach(el=>el.onclick=()=>navigation(async()=>{await openPage(el.dataset.date,null);}));
  main.querySelectorAll('.open-event').forEach(el=>el.onclick=()=>navigation(()=>showDetail(el.dataset.id)));
  $('#filter-date').onchange=()=>navigation(async()=>{await openPage($('#filter-date').value,null);});
  on('clear-date',async()=>{await openPage('',null);});on('next-page',async()=>{await openPage(filter,page.next);});
 return true;
}
