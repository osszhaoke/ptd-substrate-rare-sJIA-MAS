"""Isolated behavioral mutants; original product bytes are never changed."""
import argparse,hashlib,json,shutil,threading,uuid
from pathlib import Path
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]

def serve_case(case,out,web):
 config=Configuration({});public=config.public();config.public=lambda:{**public,'enabled':True,'maxImageBytes':2097152}
 server=Server(('127.0.0.1',0),web,out/'unused-budget.json',config)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  try:run(case,out/'browser',{'profile':str(uuid.uuid4())},f'http://127.0.0.1:{server.server_address[1]}/')
  except SystemExit:pass
  return json.loads((out/'browser.json').read_text())
 finally:server.shutdown();server.server_close()

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--control-only',action='store_true');a=p.parse_args();out=ROOT/a.output;out.mkdir(parents=True,exist_ok=False)
 specs=[('backup','backup-task','storage/backup_task.js','task.signal?.throwIfAborted();','','EXPECTED_AbortError'),('draft','consult-draft','app/consultation_draft.js',"this.edit({stale:true})","this.edit({stale:true,text:''})",'clinical notification erased manual additions'),('ocr','ocr-navigation','app/main.js',"['ocr','export','inspect-backup'].includes(id)?Promise.resolve().then(fn).catch(e=>{if(e.name!=='AbortError')notice(errorMessage(e));}):",'',None)]
 results=[]
 for name,case,path,original,replacement,expected in specs:
  for mode in (['control']if a.control_only else ['control','mutant']):
   dest=out/(name+'-'+mode);dest.mkdir();web=ROOT/'runtime'/('debt-'+str(uuid.uuid4()));shutil.copytree(ROOT/'web',web)
   if mode=='mutant':
    file=web/path;text=file.read_text();assert text.count(original)==(2 if name=='backup' else 1);file.write_text(text.replace(original,replacement))
   (dest/'served-bytes.json').write_text(json.dumps({str(x.relative_to(web)):hashlib.sha256(x.read_bytes()).hexdigest()for x in web.rglob('*')if x.is_file()},indent=2))
   result=serve_case(case,dest,web)
   if mode=='control':assert result.get('ok')is True,result
   else:
    assert result.get('ok')is False,result
    if expected:assert result['error']==expected,result
    else:assert result['error']=="WAIT ()=>$('#export')",result
   results.append({'case':name,'mode':mode,'result':result})
 (out/'result.json').write_text(json.dumps({'ok':True,'results':results,'identity':'author isolated fictional behavioral mutants'},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
