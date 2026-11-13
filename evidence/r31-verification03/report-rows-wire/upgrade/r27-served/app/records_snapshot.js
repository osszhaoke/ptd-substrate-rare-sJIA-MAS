// Read-only assembly. Both projections carry their own transactional revision.
// Three attempts bound concurrent-update churn; no polling, writes or retained cache.
export async function recordsSnapshot({store,stateController,statePrefs,zone,filter,cursor,current}){
 for(let attempt=0;attempt<3;attempt++){
  const [page,snap]=await Promise.all([
   store.page({date:filter||null,before:cursor}),
   statePrefs.enabled?stateController.load({nature:statePrefs.nature,zone}):Promise.resolve({nature:statePrefs.nature,zone,points:[],excludedTimezone:0})
  ]);
  if(!current())return null;
  const latest=(await store.get('meta','data-revision'))?.value||'initial';
  if(!current())return null;
  if(page.revision===latest&&(!statePrefs.enabled||snap.revision===latest))return {page,snap};
 }
 throw Error('RECORDS_CHANGED_TRY_AGAIN');
}
