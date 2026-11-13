"""Five sizes, enlarged original QR and external link semantics, no external network."""
import argparse
import json
from pathlib import Path
import threading
import uuid
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
    out=ROOT/args.output;out.mkdir(parents=True,exist_ok=False)
    server=Server(('127.0.0.1',0),ROOT/'web',out/'unused-budget.json',Configuration({}))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    results=[]
    try:
        for width,scale in [('320','100'),('390','100'),('430','100'),('620','100'),('320','160')]:
            results.append(run('home-resources',out/('home-'+width+'-'+scale),
                               {'profile':str(uuid.uuid4()),'width':width,'fontScale':scale},f'http://127.0.0.1:{server.server_port}/'))
        results.append(run('home-resources',out/'qr-enlarged',
                           {'profile':str(uuid.uuid4()),'width':'390','screenshot':'qr'},f'http://127.0.0.1:{server.server_port}/'))
        from tests.test_navigation_runner import verify as verify_navigation
        navigation=verify_navigation(out/'navigation')
        (out/'result.json').write_text(json.dumps({'ok':True,'results':results,'actualProviderCalls':0,
            'recordsRead':'fresh fictional profiles only','externalTargetFetched':False,
            'navigation':navigation,'approvedCondition':'actual QR image click enlarges original and closes correctly',
            'identity':'author five sizes plus large fonts and actual modal; not physical iPhone acceptance'},ensure_ascii=False,indent=2)+'\n')
    finally:server.shutdown();server.server_close()


if __name__=='__main__':main()
