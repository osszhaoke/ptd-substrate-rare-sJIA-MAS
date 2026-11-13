import json,sys,threading
from pathlib import Path
R=Path(__file__).resolve().parents[2];C=R/'runtime/r29-candidate01';sys.path.insert(0,str(C))
from tests.test_report_rows_runner import historical_cases
from gateway.server import Server
from gateway.ocr import Configuration
out=C/'evidence/r29-history02';out.mkdir(exist_ok=False,parents=True);config=Configuration();server=Server(('127.0.0.1',0),C/'web',out/'unused-budget.json',config);threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 r=historical_cases(out,server,config);(out/'result.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'ok':True,'historical':r}))
finally:server.shutdown();server.server_close()
