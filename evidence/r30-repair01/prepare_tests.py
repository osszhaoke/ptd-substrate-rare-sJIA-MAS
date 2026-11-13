from pathlib import Path
R=Path(__file__).resolve().parents[2];C=R/'runtime/r30-candidate01'
p=C/'tests/browser.report-rows.js';s=p.read_text();anchor="  $('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));";assert s.count(anchor)==1
branch='''  if(cfg.upgradeOldStage){
   const reviews=await store.reviews();ok(reviews.length===1&&!reviews[0].confirmation&&(await store.page()).items.length===0,'UPGRADE_OLD_NOT_UNCONFIRMED');
   const r=reviews[0],savedSource=await store.get('sources',r.sourceBinding.id);
   await store.meta({id:'r30-upgrade',reviewId:r.id,requestId:r.requestId,revision:r.revision,digest:r.digest,rows:r.payload.reportRows.length,sourceId:savedSource.id,sourceHash:savedSource.hash,sourceBinding:savedSource.bindingDigest,sourceLedger:m.canonical(savedSource.ledger)});
   for(const registration of await navigator.serviceWorker.getRegistrations())await registration.unregister();for(const key of await caches.keys())await caches.delete(key);
   store.close();window.webkit.messageHandlers.result.postMessage({ok:true,reviewId:r.id,requestId:r.requestId,rows:r.payload.reportRows.length,unconfirmed:true,records:0});return;
  }
'''
p.write_text(s.replace(anchor,branch+anchor))
