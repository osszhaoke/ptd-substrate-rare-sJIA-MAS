from pathlib import Path
import json
C=Path(__file__).resolve().parents[2]/'runtime/r29-candidate01';p=C/'tests/test_report_rows_runner.py';s=p.read_text()
f='''def historical_cases(out,server,config):
 base={'historical':'yes','backupBase64':base64.b64encode((ROOT/'tests/fixtures/r27-footer-backup.ptds').read_bytes()).decode(),'profile':str(uuid.uuid4())}
 url=f'http://127.0.0.1:{server.server_port}/'
 write=run('report-rows',out/'history-write',dict(base,mode='history-write'),url)
 read=run('report-rows',out/'history-read',{'historical':'yes','mode':'history-read','profile':base['profile']},url)
 pids=[json.loads((out/('history-'+m+'.binding.json')).read_text())['pid']for m in ['write','read']];assert pids[0]!=pids[1]and write['eventId']==read['eventId']
 negative=run('report-rows',out/'history-negative',dict(base,mode='history-negative',profile=str(uuid.uuid4())),url)
 tree=ROOT/'runtime'/('history-mutation-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',tree/'web');path=tree/'web/domain/report/restore_binding.js';text=path.read_text();old="if(error.message!=='REPORT_ORIGIN_MISMATCH')throw error;";assert text.count(old)==1;path.write_text(text.replace(old,'throw error;'))
 (out/'history-mutation-served.json').write_text(json.dumps({str(p.relative_to(tree)):hashlib.sha256(p.read_bytes()).hexdigest()for p in (tree/'web').rglob('*')if p.is_file()},indent=2))
 mutation=Server(('127.0.0.1',0),tree/'web',out/'history-mutation-unused-budget.json',config);threading.Thread(target=mutation.serve_forever,daemon=True).start()
 try:
  try:run('report-rows',out/'history-no-compat',dict(base,mode='history-write',profile=str(uuid.uuid4())),f'http://127.0.0.1:{mutation.server_port}/')
  except SystemExit:pass
  result=json.loads((out/'history-no-compat.json').read_text());assert result.get('ok')is False and result.get('error')=='HISTORICAL_BACKUP_REJECTED REPORT_ORIGIN_MISMATCH',result
 finally:mutation.shutdown();mutation.server_close();shutil.rmtree(tree)
 return {'write':write,'read':read,'pids':pids,'negative':negative,'compatRemovalKilled':result['error'],'sameUnmutatedPositiveControl':'history-write'}

'''
assert '\ndef main():'in s;s=s.replace('\ndef main():','\n'+f+'def main():',1)
s=s.replace('  killed={}  ','  historical=historical_cases(out,server,config)\n  killed={}  ')
s=s.replace("'behavioralMutations':killed,","'behavioralMutations':killed,'historical':historical,")
p.write_text(s)
p=C/'tools/test_plan.json';d=json.loads(p.read_text());d['r29HistoricalRestore']={'finding':'R28-A01','mandatoryBrowserEntry':'report-rows-wire','unitEntry':'tests/report_contract.test.mjs','fixtureSha256':'8130233a30cc090d05655aed74445ee0bb7c6e66b9ac380d2b36ea04708661e2','policy':'current-first, then exact frozen R27 whole-record origins only on REPORT_ORIGIN_MISMATCH; restore-only','controls':['exact independent old encrypted bytes','read-only inspection and restore','different-PID same-profile read','event/receipt/source unchanged; no authority replay','export and restore again','forged origin/source/line/receipt/duplicate and damaged cipher rejected; zero import','remove compatibility mutation killed by old-file restore behavior; same unmutated positive','new candidates remain27 and old28 cannot stage; old incomplete literal readable but cannot stage'],'limitsAndRequiredChecksUnchanged':True};p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
