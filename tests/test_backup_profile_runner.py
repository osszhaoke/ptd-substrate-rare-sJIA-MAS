"""Explicit 1k/10k fictional baseline or candidate; retain each complete window."""
import argparse
import json
import math
from pathlib import Path
import subprocess
import threading
import uuid
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run

ROOT=Path(__file__).resolve().parents[1]


def environment():
    result={}
    for name,command in [('cpu',['sysctl','-n','hw.logicalcpu']),('uptime',['uptime']),('swap',['sysctl','-n','vm.swapusage'])]:
        p=subprocess.run(command,capture_output=True,text=True,timeout=5)
        result[name]=p.stdout.strip() if p.returncode==0 else 'UNAVAILABLE'
    return result


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--enforce',action='store_true');args=parser.parse_args()
    output=ROOT/args.output;output.mkdir(parents=True,exist_ok=False)
    server=Server(('127.0.0.1',0),ROOT/'web',output/'unused-budget.json',Configuration({}))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    profile=str(uuid.uuid4());results={}
    try:
        for count in [1000,10000]:
            (output/f'environment-before-{count}.json').write_text(json.dumps(environment(),indent=2)+'\n')
            run('backup-fixture',output/f'prepare-{count}',{'profile':profile,'target':str(count)},f'http://127.0.0.1:{server.server_port}/')
            results[str(count)]=run('backup-profile',output/f'backup-{count}',{'profile':profile,'target':str(count)},f'http://127.0.0.1:{server.server_port}/')
            (output/f'environment-after-{count}.json').write_text(json.dumps(environment(),indent=2)+'\n')
        if args.enforce:
            for count, measurement in results.items():
                assert measurement['fileArrayBufferReads']<=math.ceil(measurement['fileBytes']/1048576)+1, 'FRAGMENTED_FILE_READS '+count
                assert measurement['maxFileReadBytes']<=1048576, 'READ_WINDOW_EXCEEDED '+count
                assert measurement['metadataBlobTexts']==0, 'METADATA_BLOB_TEXT '+count
                assert measurement['maxCryptoBytes']<=262145, 'CRYPTO_WINDOW_EXCEEDED '+count
                assert measurement['heartbeatSamples']>0 and measurement['heartbeatP95Ms']<=250, 'HEARTBEAT_BUDGET '+count
        (output/'result.json').write_text(json.dumps({'ok':True,'enforced':args.enforce,'measurements':results,'identity':'complete author fictional measurement window; not phone acceptance','realProviderCalls':0,'environment':'shared Mac; load recorded, no causal attribution solely from elapsed time'},indent=2)+'\n')
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':main()
