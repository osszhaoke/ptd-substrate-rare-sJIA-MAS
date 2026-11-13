"""Fictional configuration and temporary ledger only; no real credential/ledger/provider access."""
import importlib.util
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
import json

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('local_operator', HERE / 'operator.py')
operator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operator)

class LocalOperatorTests(unittest.TestCase):
    def config(self, origin=operator.ORIGIN):
        return operator.make_local_configuration('fictional-id', 'fictional-key', 'fictional-token-no-real-value-00000000', origin)

    def test_fixed_loopback_only(self):
        c = self.config()
        self.assertTrue(c.enabled)
        self.assertEqual(c.origin, 'http://127.0.0.1:18791')
        for origin in ['http://0.0.0.0:18791', 'http://192.168.1.2:18791', 'http://127.0.0.1:8888', 'http://other.invalid']:
            with self.assertRaisesRegex(operator.SetupError, 'LOCAL_FIXED_LOOPBACK_ORIGIN_REQUIRED'):
                self.config(origin)

    def test_original_public_https_gate_unchanged_and_missing_secret_rejected(self):
        env = json.loads((operator.ROOT / 'deploy/PUBLIC_CONFIG.example.json').read_text())
        env.update(PTDS_PUBLIC_ORIGIN=operator.ORIGIN, PTDS_TENCENT_SECRET_ID='fictional-id',
                   PTDS_TENCENT_SECRET_KEY='fictional-key', PTDS_TRIAL_TOKEN='fictional-token-no-real-value-00000000')
        self.assertFalse(operator.Configuration(env).enabled)
        with self.assertRaisesRegex(operator.SetupError, 'OCR_CONFIGURATION_INCOMPLETE'):
            operator.make_local_configuration('', '', 'fictional-token-no-real-value-00000000')

    def test_original_origin_token_and_request_guards_before_fake_provider(self):
        calls = []
        def fake_provider(body, config):
            calls.append(True)
            return {'format': 'fictional'}
        with tempfile.TemporaryDirectory() as tmp:
            c = self.config()
            server = operator.Server(('127.0.0.1', 0), operator.ROOT / 'web', Path(tmp)/'fake-budget.json', c, fake_provider)
            thread = threading.Thread(target=server.serve_forever, daemon=True);thread.start()
            body = (operator.ROOT / 'fixtures/lab.png').read_bytes()
            def request(origin, token, request_id):
                req = urllib.request.Request('http://127.0.0.1:'+str(server.server_port)+'/api/ocr', body,
                    {'Origin': origin, 'Authorization': 'Bearer '+token, 'Content-Type':'image/png','X-Request-ID': request_id})
                try:
                    with urllib.request.urlopen(req, timeout=5) as r:return r.status
                except urllib.error.HTTPError as error:
                    with error:return error.code
            try:
                self.assertEqual(request('http://other.invalid',c.token,'fake_request01'),403)
                self.assertEqual(request(c.origin,'wrong','fake_request02'),401)
                self.assertEqual(calls,[])
                self.assertEqual(request(c.origin,c.token,'fake_request03'),200)
                self.assertEqual(request(c.origin,c.token,'fake_request03'),409)
                self.assertEqual(len(calls),1)
                reopened=operator.Budget(Path(tmp)/'fake-budget.json',c)
                self.assertEqual(reopened.state['reserved'],1)
                self.assertEqual(str(reopened.state['reservedCost']),'0.50')
            finally:
                server.shutdown();server.server_close();thread.join(2)

if __name__ == '__main__':
    unittest.main(verbosity=2)
