import argparse,json,shutil,threading,uuid
from pathlib import Path
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='evidence/final/upgrade');args=parser.parse_args()
    out=ROOT/args.output;out.mkdir(parents=True,exist_ok=False)
    runtime=ROOT/'runtime'/('upgrade-'+out.parent.name+'-'+out.name);runtime.mkdir(exist_ok=False)
    roots=[]
    for i in (1,2):
        root=runtime/f'v{i}';shutil.copytree(ROOT/'web',root)
        title='PTDS synthetic shell '+str(i)
        p=root/'index.html';s=p.read_text();start=s.index('<title>');end=s.index('</title>');p.write_text(s[:start]+'<title>'+title+s[end:])
        p=root/'sw.js';p.write_text(p.read_text().replace("const CACHE='ptds-h5-","const CACHE='ptds-h5-synthetic-upgrade-"+str(i)+'-'))
        roots.append(root)
    server=Server(('127.0.0.1',0),roots[0],ROOT/'runtime/upgrade-budget.json',Configuration({}));threading.Thread(target=server.serve_forever,daemon=True).start()
    cfg={'profile':str(uuid.uuid4())};url='http://127.0.0.1:'+str(server.server_address[1])+'/'
    try:
        a=run('upgrade',out/'prime',{**cfg,'mode':'prime'},url);identity={'requestId':a['receipt']['id'],'sourceHash':a['sourceHash']}
        server.root=roots[1].resolve(strict=True);run('upgrade',out/'update-wait',{**cfg,'mode':'wait-update'},url)
        run('upgrade',out/'updated-reopen',{**cfg,**identity,'mode':'verify','title':'PTDS synthetic shell 2'},url)
        server.root=roots[0].resolve(strict=True);run('upgrade',out/'rollback-wait',{**cfg,'mode':'wait-update'},url)
        run('upgrade',out/'rollback-reopen',{**cfg,**identity,'mode':'verify','title':'PTDS synthetic shell 1'},url)
    finally:server.shutdown();server.server_close()
if __name__=='__main__':main()
