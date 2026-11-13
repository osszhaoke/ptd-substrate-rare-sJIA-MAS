"""Isolated controls and mutants for late database opens/upgrades and reader close."""
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
    baseline=json.loads((ROOT/'tests/fixtures/r14-lifecycle-baseline.json').read_text())
    originals={}
    for entry in baseline['files']:
        path=ROOT/entry['path']
        assert path.parent==ROOT/'tests/fixtures'
        assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256']
        originals[entry['sourcePath']]=path
    results=[]
    for mode in ['control','store-close','abandoned-upgrade','reader-close']:
        dest=out/mode;dest.mkdir();tree=ROOT/'runtime'/('lifecycle-'+str(uuid.uuid4()));tree.mkdir()
        shutil.copytree(ROOT/'web',tree/'web');(tree/'tests').mkdir()
        (tree/'package.json').write_text('{"type":"module"}\n');shutil.copyfile(ROOT/'tests/backup_reader.test.mjs',tree/'tests/backup_reader.test.mjs')
        if mode=='store-close':
            shutil.copyfile(originals['web/storage/store.js'],tree/'web/storage/store.js')
        elif mode=='abandoned-upgrade':
            p=tree/'web/storage/store.js';s=p.read_text();needle='if(abandoned||generation!==this.generation){r.transaction.abort();return;}'
            assert s.count(needle)==1;p.write_text(s.replace(needle,''))
        elif mode=='reader-close':
            shutil.copyfile(originals['web/storage/backup_reader.js'],tree/'web/storage/backup_reader.js')
        (dest/'served-bytes.json').write_text(json.dumps({p.relative_to(tree/'web').as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in (tree/'web').rglob('*') if p.is_file()},indent=2)+'\n')
        node=subprocess.run(['node','--test','tests/backup_reader.test.mjs'],cwd=tree,capture_output=True,text=True,timeout=20)
        (dest/'node.log').write_text(node.stdout+node.stderr)
        server=Server(('127.0.0.1',0),tree/'web',dest/'unused-budget.json',Configuration({}));threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            try:run('store-lifecycle',dest/'browser',{'profile':str(uuid.uuid4())},f'http://127.0.0.1:{server.server_port}/')
            except SystemExit:pass
            browser=json.loads((dest/'browser.json').read_text())
        finally:server.shutdown();server.server_close()
        if mode=='control':assert node.returncode==0 and browser.get('ok') is True,(node.stdout,browser)
        elif mode=='reader-close':
            assert node.returncode!=0 and 'Missing expected rejection' in node.stdout+node.stderr,node.stdout+node.stderr
            assert browser.get('ok') is True,browser
        else:
            assert node.returncode==0 and browser.get('ok') is False,(node.stdout,browser)
            expected='CLOSED_STORE_RESURRECTED' if mode=='store-close' else 'ABANDONED_UPGRADE_CHANGED_SCHEMA'
            assert browser.get('error','').startswith(expected),browser
        results.append({'mode':mode,'nodeExitCode':node.returncode,'browser':browser})
    (out/'result.json').write_text(json.dumps({'ok':True,'results':results,'productMutated':False,'killedBy':'actual lifecycle, schema and buffer behavior, not preflight','identity':'author isolated fictional controls and three mutants'},indent=2)+'\n')


if __name__=='__main__':main()
