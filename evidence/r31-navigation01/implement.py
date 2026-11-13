from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;C=R/'runtime/r31-navigation-candidate01'
# Old raw snapshots must still pass the unchanged original golden before deriving the narrowly approved projection.
original=json.loads((R/'tests/fixtures/r09-settings-layout-baseline.json').read_text());derived={'scope':'approved R31-A2 primary nav only; all existing page content38 styles remain exact','sourceBinding':'eb4367b928962e422f409df5d7e5f8d7df9aa7e585070dd0cb7ffc0425e27980','sourceProof':'evidence/r31-verification02/result.json','originalR09FixtureSha256':hashlib.sha256((R/'tests/fixtures/r09-settings-layout-baseline.json').read_bytes()).hexdigest(),'outputs':{}}
canonical=lambda x:hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
for name,expected in original['outputs'].items():
 p=R/'evidence/r31-verification02'/(name+'.json');raw=json.loads(p.read_text());pages=[x for x in raw['pages']if x['name']not in original['approvedChangedPages']and x['name']not in original['approvedAddedPages']];assert canonical(pages)==expected['pagesSha256'],'ORIGINAL_STYLE_BASELINE_NOT_EXACT'
 normalized=[]
 for page in pages:
  page=json.loads(json.dumps(page));assert [x['tag']for x in page['styles'][-8:]]==['BUTTON','SPAN']*4;page['styles']=page['styles'][:-8];assert len(page['navLabels'])==4;page.pop('navLabels');normalized.append(page)
 derived['outputs'][name]={'originalPagesSha256':expected['pagesSha256'],'sourceResultSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'withoutPrimaryNavigationSha256':canonical(normalized),'pageNames':expected['pageNames']}
(C/'tests/fixtures/r31-navigation-parity.json').write_text(json.dumps(derived,indent=2)+'\n')
p=C/'web/index.html';s=p.read_text();assert s.count('<button data-nav="consultation">')==1;s=s.replace('<button data-nav="consultation">','<button data-nav="consultation" hidden>');s=s.replace('帮你记病程、准备问诊 · 不代替医生','帮你整理病程和检查记录 · 不代替医生');p.write_text(s)
for name in ['tests/browser.css.js','tests/browser.mobile.js']:
 p=C/name;s=p.read_text().replace("nav=[...document.querySelectorAll('nav button')]","nav=[...document.querySelectorAll('nav button')].filter(e=>e.getClientRects().length)").replace('nav.length===4','nav.length===3')
 if name.endswith('css.js'):
  s=s.replace("!e.closest('[hidden],.home-resources')","!e.closest('[hidden],.home-resources,nav')")
 p.write_text(s)
p=C/'tools/verify_debt.py';s=p.read_text();old="""            digest=hashlib.sha256(json.dumps(actual,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            assert digest==expected['pagesSha256'],'UNCHANGED_PAGE_STYLE_CHANGED '+name""";new="""            # R31-A2 approved primary-nav-only projection; original R09 golden is retained and source-bound.
            nav_baseline=json.loads((ROOT/'tests/fixtures/r31-navigation-parity.json').read_text())
            assert hashlib.sha256((ROOT/'tests/fixtures/r09-settings-layout-baseline.json').read_bytes()).hexdigest()==nav_baseline['originalR09FixtureSha256']
            nav_expected=nav_baseline['outputs'][name]
            assert nav_expected['originalPagesSha256']==expected['pagesSha256'] and nav_expected['pageNames']==expected['pageNames']
            assert all(len(p['navLabels'])==3 for p in data['pages']),'VISIBLE_NAVIGATION_COUNT_CHANGED'
            normalized=[{k:v for k,v in p.items()if k!='navLabels'}for p in actual]
            digest=hashlib.sha256(json.dumps(normalized,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            assert digest==nav_expected['withoutPrimaryNavigationSha256'],'UNCHANGED_PAGE_STYLE_CHANGED '+name""";assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
(C/'tests/browser.navigation.js').write_text('''(async()=>{
 const $=s=>document.querySelector(s),ok=(v,m)=>{if(!v)throw Error(m);},wait=async f=>{for(let i=0;i<600;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('WAIT '+f);};
 window.confirm=()=>true;const cfg=window.__PROBE_INPUT__;if(cfg.fontScale)document.documentElement.style.fontSize=cfg.fontScale+'%';
 const routes=()=>[...document.querySelectorAll('nav button')].filter(e=>e.getClientRects().length),assertNav=()=>{ok(routes().map(e=>e.dataset.nav).join(',')==='records,capture,settings','NAVIGATION_VISIBLE_ROUTES');ok(routes().map(e=>e.querySelector('span').textContent).join(',')==='状态,录入,本机','NAVIGATION_LABELS');const hidden=$('[data-nav="consultation"]');ok(hidden?.hidden&&getComputedStyle(hidden).display==='none','NAVIGATION_CONSULTATION_NOT_HIDDEN');hidden.focus();ok(document.activeElement!==hidden,'NAVIGATION_HIDDEN_FOCUSABLE');ok(routes().every(e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44&&parseFloat(getComputedStyle(e.querySelector('span')).fontSize)>=14),'NAVIGATION_TOUCH_OR_FONT');ok(document.documentElement.scrollWidth<=innerWidth+1,'NAVIGATION_OVERFLOW');};
 await wait(()=>$('#start'));assertNav();ok($('.footer').textContent==='帮你整理病程和检查记录 · 不代替医生','NAVIGATION_COPY_STILL_PROMISES_CONSULTATION');
 $('#local-consent').checked=true;$('#timezone').value='Asia/Shanghai';$('#start').click();await wait(()=>$('.state-overview'));assertNav();
 $('[data-nav="capture"]').click();await wait(()=>$('#start-review'));$('#start-review').click();await wait(()=>!$('#review-step').hidden);$('#clinical-date').value='2020-01-01';$('#clinical-date').dispatchEvent(new Event('input',{bubbles:true}));$('#note').value='虚构三项导航验收记录';$('#note').dispatchEvent(new Event('input',{bubbles:true}));$('#prepare-review').click();await wait(()=>!$('#confirmation').hidden&&!$('#confirmed').disabled);ok(!$('#confirmed').checked&&$('#save').disabled,'NAVIGATION_AUTO_CONFIRM');$('#confirmed').checked=true;$('#confirmed').dispatchEvent(new Event('change'));$('#save').click();await wait(()=>$('#delete-record'));assertNav();
 const {RecordStore}=await import('/storage/store.js'),m=await import('/domain/model.js'),s=new RecordStore(),page=await s.page(),d=await s.detail(page.items[0].id);ok(page.items.length===1,'NAVIGATION_RECORD_SAVE');const event=m.canonical(d.event),receipt=m.canonical(d.receipt),draft=JSON.stringify(await s.readConsultationDraft());
 $('[data-nav="settings"]').click();await wait(()=>$('#export'));assertNav();$('[data-nav="records"]').click();await wait(()=>$('.state-overview'));assertNav();$('[data-nav="capture"]').click();await wait(()=>$('#start-review'));assertNav();$('[data-nav="records"]').click();await wait(()=>$('.state-overview'));
 const again=await s.detail(d.event.id);ok(m.canonical(again.event)===event&&m.canonical(again.receipt)===receipt&&JSON.stringify(await s.readConsultationDraft())===draft,'NAVIGATION_CHANGED_PERSISTED_DATA');s.close();window.webkit.messageHandlers.result.postMessage({ok:true,visibleLabels:['状态','录入','本机'],hiddenConsultationNotFocusable:true,explicitFictionalSave:true,navigationPreservesData:true,width:innerWidth,fontScale:cfg.fontScale||'100',oldDraftActualCrossPIDCoverage:'existing mandatory draft-reopen and consult-draft cases exercise retained component via programmatic click; not user-visible entry'});
})().catch(e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message,stack:e.stack}));
''')
(C/'tests/test_navigation_runner.py').write_text('''"""R31-A2 primary navigation, fictional UI only; no external/paid call."""
import argparse,hashlib,json,shutil,threading,uuid
from pathlib import Path
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def verify(out):
 out.mkdir(parents=True,exist_ok=False);server=Server(('127.0.0.1',0),ROOT/'web',out/'unused-budget.json',Configuration({}));threading.Thread(target=server.serve_forever,daemon=True).start();results=[];killed={}
 try:
  for width,scale in [('320','100'),('390','100'),('320','160')]:results.append(run('navigation',out/('nav-'+width+'-'+scale),{'profile':str(uuid.uuid4()),'width':width,'fontScale':scale},f'http://127.0.0.1:{server.server_port}/'))
  for name,old,new,error in [('unhide','data-nav="consultation" hidden','data-nav="consultation"','NAVIGATION_VISIBLE_ROUTES'),('old-footer','帮你整理病程和检查记录 · 不代替医生','帮你记病程、准备问诊 · 不代替医生','NAVIGATION_COPY_STILL_PROMISES_CONSULTATION')]:
   tree=ROOT/'runtime'/('nav-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');p=tree/'web/index.html';text=p.read_text();assert text.count(old)==1;p.write_text(text.replace(old,new));(out/(name+'-served.json')).write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
   mutated=Server(('127.0.0.1',0),tree/'web',out/(name+'-unused-budget.json'),Configuration({}));threading.Thread(target=mutated.serve_forever,daemon=True).start()
   try:
    try:run('navigation',out/name,{'profile':str(uuid.uuid4()),'width':'390'},f'http://127.0.0.1:{mutated.server_port}/')
    except SystemExit:pass
    data=json.loads((out/(name+'.json')).read_text());assert data.get('ok')is False and data.get('error')==error,data;killed[name]=error
   finally:mutated.shutdown();mutated.server_close();shutil.rmtree(tree)
  data={'ok':True,'identity':'author fictional actual navigation; not independent/human/iPhone','positive':results,'mutations':killed,'positiveControl':'same nav-390-100 unmutated scenario','paidProviderCalls':0};(out/'result.json').write_text(json.dumps(data,indent=2)+'\\n');return data
 finally:server.shutdown();server.server_close()
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();verify(ROOT/a.output)
if __name__=='__main__':main()
''')
p=C/'tests/test_home_resources_runner.py';s=p.read_text().replace("        (out/'result.json').write_text", "        from tests.test_navigation_runner import verify as verify_navigation\n        navigation=verify_navigation(out/'navigation')\n        (out/'result.json').write_text");s=s.replace("'approvedCondition':", "'navigation':navigation,'approvedCondition':");p.write_text(s)
p=C/'tools/test_plan.json';d=json.loads(p.read_text());d['browserWhitelist'].append('browser.navigation.js');d['r31Navigation']={'scope':'temporarily hide primary consultation entry only; storage, components, backup and lifecycle unchanged','mandatoryBrowserEntry':'home-resources -> tests.test_navigation_runner','styleParity':'original R09 fixture unchanged; derive nav-excluded hashes from verified exact A1 captures, new native 3-route checks; no other golden changes','retainedComponentRegression':'existing consult/draft suites invoke hidden DOM button programmatically; not a claim of normal-user accessibility','mutations':['unhide','old-footer'],'productPaths':['web/index.html'],'noActualPhoneAcceptance':True};p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('IMPLEMENTED_ISOLATED_HTML_ONLY')
