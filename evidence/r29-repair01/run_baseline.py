import base64,json,sys,threading,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];C=ROOT/'runtime/r29-candidate01';sys.path.insert(0,str(C))
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run
out=Path(__file__).resolve().parent
server=Server(('127.0.0.1',0),C/'web',out/'baseline-fictional-budget.json',Configuration())
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 try:run('report-rows',out/'baseline',{'historical':'yes','mode':'history-write','profile':str(uuid.uuid4()),'backupBase64':base64.b64encode((C/'tests/fixtures/r27-footer-backup.ptds').read_bytes()).decode()},f'http://127.0.0.1:{server.server_port}/')
 except SystemExit:pass
 result=json.loads((out/'baseline.json').read_text());assert result['ok']is False and result['error']=='HISTORICAL_BACKUP_REJECTED REPORT_ORIGIN_MISMATCH',result
 print(json.dumps({'originalFailureReproduced':True,'error':result['error']}))
finally:server.shutdown();server.server_close()
