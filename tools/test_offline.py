import argparse,json,subprocess,sys,time,uuid,urllib.request
from pathlib import Path
from tools.run_browser import run
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args();out=ROOT/args.output;out.mkdir(parents=True,exist_ok=False)
    host="from gateway.server import Server;from gateway.ocr import Configuration;Server(('127.0.0.1',18788),'web','runtime/offline-budget.json',Configuration({})).serve_forever()"
    with open(out/'server.log','w')as log:
        process=subprocess.Popen([sys.executable,'-u','-c',host],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
        (out/'binding.json').write_text(json.dumps({'pid':process.pid,'port':18788,'serverMustExitBeforeColdStart':True},indent=2))
        try:
            for _ in range(100):
                try:
                    with urllib.request.urlopen('http://127.0.0.1:18788/health',timeout=1):break
                except OSError:time.sleep(.05)
            profile=str(uuid.uuid4());run('offline',out/'prime',{'profile':profile,'mode':'prime'},'http://127.0.0.1:18788/')
            process.terminate();process.wait(timeout=5)
            run('offline',out/'cold-start',{'profile':profile,'mode':'offline'},'http://127.0.0.1:18788/')
            (out/'server-exit.json').write_text(json.dumps({'pid':process.pid,'returncode':process.returncode,'exitedBeforeColdStart':True}))
        finally:
            if process.poll()is None:process.terminate();process.wait(timeout=5)
if __name__=='__main__':main()
