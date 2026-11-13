"""All-CBC/unknown/qualitative state path; explicit fictional operator, zero paid OCR."""
import argparse,hashlib,json,shutil,subprocess,threading,uuid
from pathlib import Path
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def fixture():
 script="""import {cbcLedger} from './tests/fixtures/cbc_report.mjs';
 const l=cbcLedger();for(const [i,row]of [['尿蛋白','阴性','','阴性'],['虚构新项目','7.25','U/L','1-9'],['铁蛋白','1000','ng/mL','30-400']].entries()){
  for(const [j,text]of row.entries()){if(!text)continue;const x=[100,330,425,535][j],y=550+i*35;const id='r33_fictional_'+l.lines.length;l.lines.push({id,order:l.lines.length,text,page:1,confidence:.99,coordinates:[{x,y},{x:x+80,y},{x:x+80,y:y+20},{x,y:y+20}]});}}
 l.rawText=l.lines.map(x=>x.text).join('\\n');console.log(JSON.stringify(l));"""
 return json.loads(subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True,check=True).stdout)
def verify(out):
 out.mkdir(parents=True,exist_ok=False);ledger=fixture();token='fictional-r33-metrics-token-00000000000';calls=[]
 env=json.loads((ROOT/'deploy/PUBLIC_CONFIG.example.json').read_text());env['PTDS_PUBLIC_ORIGIN']='https://fictional.invalid'
 config=Configuration(env,{'tencentSecretId':'FICTIONAL_ID','tencentSecretKey':'FICTIONAL_KEY','trialToken':token})
 def fake_provider(body,c):calls.append(1);return ledger
 server=Server(('127.0.0.1',0),ROOT/'web',out/'fictional-budget.json',config,provider=fake_provider);config.origin=f'http://127.0.0.1:{server.server_port}';threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  profile=str(uuid.uuid4());write=run('metrics',out/'write',{'profile':profile,'mode':'write','token':token},config.origin+'/');read=run('metrics',out/'read',{'profile':profile,'mode':'read'},config.origin+'/');pids=[json.loads((out/(m+'.binding.json')).read_text())['pid']for m in ['write','read']];assert pids[0]!=pids[1];killed={}
  identity_profile=str(uuid.uuid4());identity=run('metrics',out/'identity-write',{'profile':identity_profile,'mode':'identity','identityLedger':json.dumps(ledger)},config.origin+'/');identity_read=run('metrics',out/'identity-read',{'profile':identity_profile,'mode':'identity-read'},config.origin+'/');identity_pids=[json.loads((out/('identity-'+m+'.binding.json')).read_text())['pid']for m in ['write','read']];assert identity_pids[0]!=identity_pids[1]
  for name,relative,old,new,error in [
   ('hide-report-rows','web/domain/metrics/identity.js','return [...p.reportRows.map','return [...p.reportRows.slice(0,1).map','METRICS_REPORT_ROWS_MISSING'),
   ('break-source-return','web/app/main.js',"$('#back-records').textContent='返回指标变化'","$('#back-records').textContent='返回预警'",'METRICS_SOURCE_RETURN')]:
   tree=ROOT/'runtime'/('metrics-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');p=tree/relative;s=p.read_text();assert s.count(old)==1;p.write_text(s.replace(old,new));mut=Server(('127.0.0.1',0),tree/'web',out/(name+'-budget.json'),config,provider=fake_provider);config.origin=f'http://127.0.0.1:{mut.server_port}';threading.Thread(target=mut.serve_forever,daemon=True).start()
   try:
    try:run('metrics',out/name,{'profile':str(uuid.uuid4()),'mode':'write','token':token},config.origin+'/')
    except SystemExit:pass
    result=json.loads((out/(name+'.json')).read_text());assert result.get('ok')is False and result.get('error')==error,result;killed[name]=error
   finally:mut.shutdown();mut.server_close();shutil.rmtree(tree)
  for name,relative,old,new in [
   ('merge-percent-and-absolute','web/domain/metrics/catalog.js',"['procalcitonin','降钙素原'","['plateletcrit','降钙素原'"),
   ('ignore-partial-date','web/domain/state/series.js','snapshot.partialDates?.includes(p.date)','false'),
   ('repeat-alias-merge','web/domain/metrics/identity.js','const matches=(name,labels)=>labels.has(spelling(name));',"const matches=(name,labels)=>{let rest=spelling(name);while(rest){const token=[...labels].find(t=>rest.startsWith(t));if(!token)return false;rest=rest.slice(token.length);}return true;};")]:
   tree=ROOT/'runtime'/('metrics-node-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');shutil.copytree(ROOT/'tests',tree/'tests');shutil.copy2(ROOT/'package.json',tree/'package.json');path=tree/relative;original=path.read_text();assert original.count(old)==1;path.write_text(original.replace(old,new))
   try:
    process=subprocess.run(['node','--test','tests/metric_series.test.mjs','tests/metric_identity.test.mjs'],cwd=tree,capture_output=True,text=True,timeout=30);(out/(name+'.log')).write_text(process.stdout+process.stderr)
    assert process.returncode!=0 and 'AssertionError' in process.stdout+process.stderr and 'ERR_MODULE' not in process.stdout+process.stderr,name;killed[name]='BEHAVIOR_ASSERTION'
   finally:shutil.rmtree(tree)
  result={'ok':True,'identity':'author fictional automated; no independent/human/clinical acceptance','write':write,'read':read,'pids':pids,'identityCase':identity,'identityRead':identity_read,'identityPids':identity_pids,'paidCalls':0,'mockCalls':len(calls),'mutations':killed};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');return result
 finally:server.shutdown();server.server_close()
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();verify(ROOT/a.output)
if __name__=='__main__':main()
