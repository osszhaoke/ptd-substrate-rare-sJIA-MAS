"""One explicit local verification gate. Fictional profiles only; no test discovery."""
import argparse,hashlib,json,subprocess,sys,threading,uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def fingerprint(root=ROOT):
    files=[]
    for folder in ['web','gateway','tests','tools','deploy','public_trial','fixtures']:
        files.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and 'bin' not in p.parts and p.suffix not in ['.pyc','.zip'])
    files.extend(root/name for name in ['package.json','START_LOCAL.command','START_INVITE_TEST.command','START_PUBLIC_24H.command','PUBLIC_SOURCE_MANIFEST.json'] if (root/name).exists())
    hashes={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}
    return {'digest':hashlib.sha256(json.dumps(hashes,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'files':hashes}

def require_verification(root=ROOT,evidence=None):
    if evidence is None:raise ValueError('VERIFICATION_REQUIRED_EXPLICIT_CURRENT_EVIDENCE')
    path=Path(evidence)
    try:
        proof=json.loads(path.read_text());plan=json.loads((root/'tools/test_plan.json').read_text())
        required=plan['debtVerification']['requiredChecks'];actual=fingerprint(root)
        if proof.get('ok') is not True or proof.get('identity')!='author fictional automated verification':raise ValueError('VERIFICATION_FAILED')
        if proof.get('binding')!=actual:raise ValueError('VERIFICATION_STALE_OR_MISSING_FILES')
        if not required or set(proof.get('checks',{}))!=set(required) or any(proof['checks'][k]!='PASS' for k in required):raise ValueError('VERIFICATION_INCOMPLETE')
        return proof
    except (OSError,KeyError,json.JSONDecodeError) as error:
        raise ValueError('VERIFICATION_REQUIRED') from error

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);a=parser.parse_args()
    out=ROOT/a.output;out.mkdir(parents=True,exist_ok=False)
    from tools.build import prepare_shell,prepare_public_manifest
    from tools.run_browser import run
    from gateway.server import Server
    from gateway.ocr import Configuration
    prepare_shell();prepare_public_manifest();binding=fingerprint();plan=json.loads((ROOT/'tools/test_plan.json').read_text());checks={}
    server=Server(('127.0.0.1',0),ROOT/'web',out/'unused-budget.json',Configuration({}));threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_address[1]}/'
    proof={'ok':False,'identity':'author fictional automated verification','binding':binding,'checks':checks,'physicalPhone':'NOT_TESTED','independentTester':'NOT_TESTED','humanAcceptance':'NOT_ACCEPTED','paidProviderCalls':0}
    def command(name,args):
        print(name,flush=True)
        with (out/(name+'.log')).open('w') as log:
            p=subprocess.run(args,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,timeout=175)
        if p.returncode:raise RuntimeError('CHECK_FAILED '+name)
        checks[name]='PASS'
    def browser(name,case,config=None):
        if 'browser.'+case+'.js' not in plan['browserWhitelist']:raise RuntimeError('NOT_WHITELISTED '+case)
        run(case,out/name,config or {'profile':str(uuid.uuid4())},url);checks[name]='PASS'
    try:
        (ROOT/'tools/bin').mkdir(exist_ok=True)
        command('probe-compile',['swiftc','tools/browser_probe.swift','-o','tools/bin/browser-probe'])
        command('node',['npm','test'])
        command('python',[sys.executable,'-B','-m','unittest','tests.test_policy','tests.test_gateway','tests.test_lock_boundaries','tests.test_tencent','tests.test_deploy','tests.test_debt_build_gate','tests.test_phone_acceptance','tests.test_invite_runner','tests.test_public_trial','tests.test_startup_plan','-v'])
        for case in plan['debtVerification']['browserCases']:browser('browser-'+case,case)
        for tool,module in [('report-rows-wire','tests.test_report_rows_runner'),('startup-wire','tests.test_startup_runner'),('ocr-review-wire','tests.test_ocr_review_runner'),('ocr-tables-wire','tests.test_ocr_tables_runner'),('ocr-wire','tests.test_tencent_flow_runner'),('ocr-split-wire','tests.test_tencent_split_runner'),('review-mutations','tests.test_ui_mutation_runner'),('workflow-mutations','tests.test_workflow_mutation_runner'),('debt-mutations','tests.test_debt_mutation_runner'),('observer-mutations','tests.test_observer_mutation_runner'),('lifecycle-mutations','tests.test_lifecycle_mutation_runner'),('draft-race-mutations','tests.test_draft_race_mutation_runner'),('async-ownership','tests.test_async_ownership_runner'),('home-resources','tests.test_home_resources_runner'),('records-consistency','tests.test_records_consistency_runner'),('offline','tools.test_offline'),('upgrade','tools.test_upgrade'),('phone-tool','tests.test_phone_tool_runner')]:
            command(tool,[sys.executable,'-B','-m',module,'--output',str(out/tool)])
        command('metrics-wire',[sys.executable,'-B','-m','tests.test_metrics_runner','--output',str(out/'metrics-wire')])
        command('public-mode',[sys.executable,'-B','-m','tests.test_public_browser','--output',str(out/'public-mode')])
        for case in ['phone-quota','phone-journal','phone-progress']:
            command(case,[sys.executable,'-B','-m','tests.test_phone_debt_runner','--case',case,'--output',str(out/case)])
        command('backup-profile',[sys.executable,'-B','-m','tests.test_backup_profile_runner','--enforce','--output',str(out/'backup-profile')])
        profile=str(uuid.uuid4())
        browser('draft-reopen-write','consult-draft-persist',{'profile':profile,'mode':'write'})
        browser('draft-reopen-read','consult-draft-persist',{'profile':profile,'mode':'read'})
        writes=json.loads((out/'draft-reopen-write.json').read_text());reads=json.loads((out/'draft-reopen-read.json').read_text())
        pid1=json.loads((out/'draft-reopen-write.binding.json').read_text())['pid'];pid2=json.loads((out/'draft-reopen-read.binding.json').read_text())['pid']
        assert pid1!=pid2 and writes['revision']==reads['revision'] and writes['text']==reads['text'];checks['draft-reopen']='PASS'
        browser('draft-page-refresh','consult-draft-persist',{'profile':str(uuid.uuid4()),'mode':'refresh','allowReload':'yes'})
        for width,scale in [('320','100'),('390','100'),('430','100'),('620','100'),('320','160')]:browser('layout-'+width+'-'+scale,'css',{'profile':str(uuid.uuid4()),'width':width,'fontScale':scale})
        baseline=json.loads((ROOT/'tests/fixtures/r09-settings-layout-baseline.json').read_text())
        for name,expected in baseline['outputs'].items():
            data=json.loads((out/(name+'.json')).read_text())
            actual=[p for p in data['pages'] if p['name'] not in baseline['approvedChangedPages'] and p['name'] not in baseline['approvedAddedPages']]
            # R31-A2 approved primary-nav-only projection; original R09 golden is retained and source-bound.
            nav_baseline=json.loads((ROOT/'tests/fixtures/r31-navigation-parity.json').read_text())
            assert hashlib.sha256((ROOT/'tests/fixtures/r09-settings-layout-baseline.json').read_bytes()).hexdigest()==nav_baseline['originalR09FixtureSha256']
            nav_expected=nav_baseline['outputs'][name]
            assert nav_expected['originalPagesSha256']==expected['pagesSha256'] and nav_expected['pageNames']==expected['pageNames']
            assert all(len(p['navLabels'])==4 for p in data['pages']),'VISIBLE_NAVIGATION_COUNT_CHANGED'
            normalized=[{k:v for k,v in p.items()if k!='navLabels'}for p in actual]
            digest=hashlib.sha256(json.dumps(normalized,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            assert digest==nav_expected['withoutPrimaryNavigationSha256'],'UNCHANGED_PAGE_STYLE_CHANGED '+name
            assert {p['name'] for p in data['pages']}==set(expected['pageNames'])|set(baseline['approvedChangedPages'])|set(baseline['approvedAddedPages']),'LAYOUT_PAGE_COVERAGE_CHANGED '+name
        checks['style-parity']='PASS'
        profile=str(uuid.uuid4())
        for n in [1000,3000,6000,10000]:
            browser('state-scale-'+str(n),'state-scale',{'profile':profile,'target':str(n)})
            browser('metrics-scale-'+str(n),'metrics',{'profile':profile,'mode':'scale','target':str(n)})
            if n in [1000,10000]:
                browser('consult-scale-'+str(n),'consult-scale',{'profile':profile,'target':str(n)})
                browser('backup-scale-'+str(n),'backup-scale',{'profile':profile,'target':str(n)})
                measurement=json.loads((out/('backup-scale-'+str(n)+'.json')).read_text());assert measurement['heartbeatP95Ms']<=250 and measurement['maxCryptoBytes']<=262145
        browser('originals-64MiB','backup-scale',{'profile':str(uuid.uuid4()),'mode':'originals'})
        measurement=json.loads((out/'originals-64MiB.json').read_text());assert measurement['originalBytes']==67108864 and measurement['maxCryptoBytes']<=262145 and measurement['heartbeatP95Ms']<=250
        assert binding==fingerprint(),'SOURCE_CHANGED_DURING_VERIFICATION'
        assert set(checks)==set(plan['debtVerification']['requiredChecks']),'VERIFICATION_PLAN_MISMATCH'
        proof['ok']=True
    except BaseException as error:
        proof['failure']={'type':type(error).__name__,'message':str(error)};raise
    finally:
        server.shutdown();server.server_close();(out/'result.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'ok':True,'checks':len(checks),'binding':binding['digest'],'result':str(out/'result.json')}),flush=True)

if __name__=='__main__':main()
