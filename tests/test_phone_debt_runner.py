"""Explicit phone-harness faults and progress, using a fresh fictional profile."""
import argparse
import functools
import http.server
import json
from pathlib import Path
import threading
import uuid
from unittest.mock import patch
from tools import phone_acceptance
from tools.run_browser import run

ROOT=Path(__file__).resolve().parents[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True)
    parser.add_argument('--case',choices=['phone-quota','phone-journal','phone-progress'],required=True)
    parser.add_argument('--baseline',action='store_true');args=parser.parse_args()
    output=ROOT/args.output;output.mkdir(parents=True,exist_ok=False)
    source=Path('/Users/osszhaoke/Downloads/PTDS-H5-public-24h-r01') if args.baseline else ROOT
    with patch.object(phone_acceptance,'ROOT',source):bundle=phone_acceptance.build(output/'bundle')
    phone_acceptance.verify(bundle['site'])
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=bundle['site']))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        result=run(args.case,output/'browser',{'profile':str(uuid.uuid4())},f'http://127.0.0.1:{server.server_port}/')
        (output/'result.json').write_text(json.dumps({'ok':True,'case':args.case,'source':str(source),'bundle':bundle,'browser':result,'physicalPhone':'NOT_TESTED'},indent=2)+'\n')
    finally:server.shutdown();server.server_close()


if __name__=='__main__':main()
