"""Public HTTP -> no-code WebKit UI -> explicit confirmation -> new PID read."""
import argparse
import base64
import io
import json
from pathlib import Path
import threading
import uuid
from unittest.mock import patch

from gateway.ocr import Budget
from public_trial.server import Deadline, PublicServer, configuration
from tools.run_browser import run

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = ROOT / args.output
    output.mkdir(parents=True, exist_ok=False)
    lines = ['PTDS自检·合成化验单(非真实数据)', '采样时间:2026-10-04 08:00', '项目', '结果', '单位', '参考范围',
             '铁蛋白', '1520', 'ng/mL', '30-400', '血小板计数', '98', 'x10^9/L', '125-350',
             '白细胞计数', '6.2', 'x10^9/L', '3.5-9.5', 'C反应蛋白', '18', 'mg/L', '0-10',
             '谷草转氨酶', '65', 'U/L', '15-40', '甘油三酯', '2.30', 'mmol/L', '<1.7']
    response = {'Response': {'RequestId': 'synthetic-public-24h',
                            'TextDetections': [{'DetectedText': x, 'Confidence': 99} for x in lines]}}
    calls = []
    class Opener:
        def open(self, request, timeout):
            assert request.full_url == 'https://ocr.tencentcloudapi.com/' and timeout == 25
            assert base64.b64decode(json.loads(request.data)['ImageBase64']) == (ROOT / 'web/fixture.png').read_bytes()
            calls.append(1)
            return io.BytesIO(json.dumps(response).encode())
    server = PublicServer(('127.0.0.1', 0), ROOT / 'web', Deadline(86400))
    config = configuration('https://fictional.trycloudflare.com', 'SYNTHETIC_ID', 'SYNTHETIC_KEY')
    config.origin = 'http://127.0.0.1:' + str(server.server_port)
    budget = Budget(output / 'synthetic-budget.json', config)
    server.enable_ocr(config, budget)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = str(uuid.uuid4())
    try:
        with patch('gateway.tencent.urllib.request.build_opener', return_value=Opener()):
            written = run('public-24h', output / 'write', {'profile': profile, 'mode': 'write'}, config.origin + '/')
            read = run('public-24h', output / 'read', {'profile': profile, 'mode': 'read'}, config.origin + '/')
        write_pid = json.loads((output / 'write.binding.json').read_text())['pid']
        read_pid = json.loads((output / 'read.binding.json').read_text())['pid']
        assert write_pid != read_pid and written['eventId'] == read['eventId']
        assert len(calls) == 1 and budget.state['reserved'] == 1
        (output / 'result.json').write_text(json.dumps({
            'ok': True, 'identity': 'author automated fictional WebKit; not human or phone acceptance',
            'realProviderCalls': 0, 'fakeAdapterCalls': len(calls), 'browserPIDs': [write_pid, read_pid],
            'visibleTrialCode': False, 'manualConfirmationRequired': True,
            'observations': 6, 'sourceLines': 30, 'sameProfileNewPIDRead': True}, indent=2) + '\n')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
