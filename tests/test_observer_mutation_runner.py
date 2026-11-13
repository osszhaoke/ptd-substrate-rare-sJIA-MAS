"""Run controls and a notification-boundary mutant in isolated fictional trees."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import threading
import uuid
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run

ROOT=Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
    out=ROOT/args.output;out.mkdir(parents=True,exist_ok=False)
    results=[]
    for mode in ['control','mutant']:
        dest=out/mode;dest.mkdir();tree=ROOT/'runtime'/('observer-'+str(uuid.uuid4()));tree.mkdir()
        shutil.copytree(ROOT/'web',tree/'web');(tree/'tests').mkdir()
        (tree/'package.json').write_text('{"type":"module"}\n')
        for name in ['backup_task.test.mjs','coordinator.test.mjs','consultation_draft.test.mjs']:
            shutil.copyfile(ROOT/'tests'/name,tree/'tests'/name)
        if mode=='mutant':
            (tree/'web/shared/observe.js').write_text('export function observe(owner,callback){callback();}\n')
        (dest/'served-bytes.json').write_text(json.dumps({p.relative_to(tree/'web').as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in (tree/'web').rglob('*') if p.is_file()},indent=2)+'\n')
        node=subprocess.run(['node','--test','tests/backup_task.test.mjs','tests/coordinator.test.mjs','tests/consultation_draft.test.mjs'],cwd=tree,capture_output=True,text=True,timeout=20)
        (dest/'node.log').write_text(node.stdout+node.stderr)
        server=Server(('127.0.0.1',0),tree/'web',dest/'unused-budget.json',Configuration({}))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            try:run('store-notifications',dest/'browser',{'profile':str(uuid.uuid4())},f'http://127.0.0.1:{server.server_port}/')
            except SystemExit:pass
            browser=json.loads((dest/'browser.json').read_text())
        finally:server.shutdown();server.server_close()
        if mode=='control':
            assert node.returncode==0 and browser.get('ok') is True,(node.stdout,browser)
        else:
            assert node.returncode!=0 and 'fictional saved observer' in node.stdout+node.stderr, node.stdout+node.stderr
            assert browser.get('ok') is False and browser.get('error')=='LOCAL_LISTENER_STARVED',browser
        results.append({'mode':mode,'nodeExitCode':node.returncode,'browser':browser})
    (out/'result.json').write_text(json.dumps({'ok':True,'results':results,'productMutated':False,'killedBy':'actual callback/commit behavior; no preflight rejection','identity':'author isolated fictional controls and mutant'},indent=2)+'\n')


if __name__=='__main__':main()
