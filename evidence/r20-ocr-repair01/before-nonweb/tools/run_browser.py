"""Explicit new standalone test whitelist, synthetic profiles only."""
import argparse,json,subprocess,uuid,fcntl,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(case,output,config=None,url='http://127.0.0.1:18791/'):
    lock_path=ROOT/'runtime/browser-test.lock';lock_path.parent.mkdir(exist_ok=True)
    with open(lock_path,'a')as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        return _run(case,output,config,url)
def _run(case,output,config=None,url='http://127.0.0.1:18791/'):
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    if any(output.with_suffix(suffix).exists() for suffix in ['.json','.log','.binding.json']):raise SystemExit('OUTPUT_EXISTS')
    args=[str(ROOT/'tools/bin/browser-probe'),url,str(ROOT/'tests'/('browser.'+case+'.js')),str(output)]
    p=subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    binding={str(x.relative_to(ROOT)):hashlib.sha256(x.read_bytes()).hexdigest()for folder in ['web','gateway']for x in (ROOT/folder).rglob('*')if x.is_file()and '__pycache__'not in x.parts};binding['deploy/TRIAL_POLICY.json']=hashlib.sha256((ROOT/'deploy/TRIAL_POLICY.json').read_bytes()).hexdigest();binding['tests/browser.'+case+'.js']=hashlib.sha256((ROOT/'tests'/('browser.'+case+'.js')).read_bytes()).hexdigest()
    meta={'productAndTestBytes':binding,'pid':p.pid,'config':config or {},'command':args,'probeSourceSha256':hashlib.sha256((ROOT/'tools/browser_probe.swift').read_bytes()).hexdigest(),'probeBinarySha256':hashlib.sha256((ROOT/'tools/bin/browser-probe').read_bytes()).hexdigest()}
    output.with_suffix('.binding.json').write_text(json.dumps(meta,indent=2))
    try:out,err=p.communicate(json.dumps(config or {}),timeout=165)
    except subprocess.TimeoutExpired:
        p.kill();out,err=p.communicate();output.with_suffix('.json').write_text(json.dumps({'ok':False,'error':'BROWSER_PROCESS_TIMEOUT','identity':'incomplete run; not a business assertion'}))
    output.with_suffix('.log').write_text(out+err)
    if not output.with_suffix('.json').exists():output.with_suffix('.json').write_text(json.dumps({'ok':False,'error':'BROWSER_EXIT_WITHOUT_RESULT','returncode':p.returncode,'identity':'incomplete run; not a business assertion'}))
    result=json.loads(output.with_suffix('.json').read_text());print(json.dumps({'case':case,'pid':p.pid,'ok':result.get('ok'),'error':result.get('error'),'target':result.get('target'),'p95Ms':result.get('p95Ms')},ensure_ascii=False),flush=True)
    if p.returncode or not result.get('ok'):raise SystemExit('BROWSER_FAILED '+str(output))
    return result
def main():
    p=argparse.ArgumentParser();p.add_argument('case',choices=['records-consistency','home-resources','async-ownership','draft-save-races','store-lifecycle','store-notifications','phone-journal','backup-fixture','phone-progress','phone-quota','backup-profile','public-24h','tencent-split','phone-tool','consult-draft','consult-draft-persist','ocr-navigation','backup-task','backup-scale','state-batch','consult-scale','workflow','experience','backup-stream','css','core','ui','file','ocr','persist','scale','offline','upgrade','state','state-ui','state-scale','state-persist','compat','mobile']);p.add_argument('output');p.add_argument('--profile');p.add_argument('--mode');p.add_argument('--target');p.add_argument('--request-id');p.add_argument('--url',default='http://127.0.0.1:18791/');a=p.parse_args()
    cfg={k:v for k,v in {'profile':a.profile or str(uuid.uuid4()),'mode':a.mode,'target':a.target,'requestId':a.request_id}.items()if v is not None};run(a.case,ROOT/a.output,cfg,a.url)
if __name__=='__main__':main()
