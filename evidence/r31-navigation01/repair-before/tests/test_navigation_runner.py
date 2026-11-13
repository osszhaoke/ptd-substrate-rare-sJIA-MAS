"""R31-A2 primary navigation, fictional UI only; no external/paid call."""
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
  data={'ok':True,'identity':'author fictional actual navigation; not independent/human/iPhone','positive':results,'mutations':killed,'positiveControl':'same nav-390-100 unmutated scenario','paidProviderCalls':0};(out/'result.json').write_text(json.dumps(data,indent=2)+'\n');return data
 finally:server.shutdown();server.server_close()
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();verify(ROOT/a.output)
if __name__=='__main__':main()
