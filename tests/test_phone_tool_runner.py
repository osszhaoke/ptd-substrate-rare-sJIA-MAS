"""Run the isolated static phone harness on a fresh fictional Mac WebKit profile."""
import argparse
import functools
import http.server
import json
import threading
import uuid
from pathlib import Path
from tools.phone_acceptance import build, verify
from tools.run_browser import run


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args=parser.parse_args()
    output=Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=False)
    result=build(output/'bundle')
    verify(result['site'])
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=result['site']))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        run('phone-tool',output/'browser',{'profile':str(uuid.uuid4()),'allowReload':'yes'},f'http://127.0.0.1:{server.server_address[1]}/')
        (output/'result.json').write_text(json.dumps({'ok':True,'bundle':result,'physicalPhone':'NOT_TESTED','identity':'author fictional harness verification'},indent=2)+'\n')
    finally:
        server.shutdown()
        server.server_close()


if __name__=='__main__':
    main()
