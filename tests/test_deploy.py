import json,os,subprocess,sys,tempfile,unittest
import contextlib,io,re
from unittest.mock import patch
from pathlib import Path
from tools.prepare_mainland import prepare
from gateway.credentials import read_credentials,read_public_config
from gateway.ocr import Configuration
ROOT=Path(__file__).resolve().parents[1]
class DeploymentTests(unittest.TestCase):
    def test_default_gateway_and_all_proxy_launchers_use_current_origin(self):
        from gateway import server
        calls=[];locks=[]
        real_open=open
        def tracked_open(*args,**kwargs):
            handle=real_open(*args,**kwargs);locks.append(handle);return handle
        class StopTestServer(Exception):pass
        class FakeServer:
            def __init__(self,address,*args):calls.append(address);self.config=Configuration({})
            def serve_forever(self):raise StopTestServer()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(sys,'argv',['gateway.server','--runtime',directory]),patch.object(server,'Server',FakeServer),patch.object(server,'Configuration',return_value=Configuration({})),patch.object(server,'open',tracked_open,create=True),contextlib.redirect_stdout(io.StringIO()):
                try:
                    with self.assertRaises(StopTestServer):server.main()
                finally:
                    for handle in locks:handle.close()
            material={'tencentSecretId':'AKID_SYNTHETIC','tencentSecretKey':'SYNTHETIC_KEY','trialToken':'synthetic-token-000000000000000000000'}
            prepared=prepare(Path(directory).resolve()/'prepared','https://trial.invalid',material)
            with self.subTest(component='default CLI'):
                self.assertEqual(calls,[('127.0.0.1',18791)])
            for path in [Path(prepared['caddyfile']),ROOT/'deploy/Caddyfile']:
                port=re.search(r'reverse_proxy 127\.0\.0\.1:(\d+)',path.read_text()).group(1)
                with self.subTest(component=str(path)):
                    self.assertEqual(port,'18791')
            service=(ROOT/'deploy/ptds-h5.service').read_text()
            with self.subTest(component='systemd source root'):
                self.assertIn('WorkingDirectory=/opt/ptds-h5-sjia-mas-r19\n',service)
            self.assertIn('--port 18791',service)
            self.assertIn('--runtime /home/ptds/.ptds/runtime/h5-r02',service)
            self.assertIn('127.0.0.1:18791:8080',(ROOT/'deploy/compose.yaml').read_text())
    def test_compose_cannot_create_a_new_project_budget_volume(self):
        compose=(ROOT/'deploy/compose.yaml').read_text()
        self.assertIn('external: true',compose)
        self.assertIn('name: ${PTDS_EXISTING_BUDGET_VOLUME:?Set_single_authoritative_existing_budget_volume}',compose)
        self.assertIn('ocr-budget-r02:/runtime',compose)
    def test_prepare_outputs_check_config_and_no_runtime_side_effect(self):
        material={'tencentSecretId':'AKID_SYNTHETIC','tencentSecretKey':'SYNTHETIC_PRIVATE_KEY','trialToken':'synthetic-token-000000000000000000000'}
        with tempfile.TemporaryDirectory()as directory:
            output=Path(directory).resolve()/'ptds';result=prepare(output,'https://trial.invalid',material)
            self.assertFalse(result['servicesStarted']);self.assertEqual(result['cloudCalls'],0)
            private=Path(result['secretFile']);self.assertEqual(private.stat().st_mode&0o777,0o600);self.assertEqual(private.parent.stat().st_mode&0o777,0o700)
            c=Configuration(read_public_config(result['publicConfig']),read_credentials(private));self.assertTrue(c.enabled)
            p=subprocess.run([sys.executable,'-m','gateway.server','--runtime',result['runtime'],'--config-file',result['publicConfig'],'--secrets-file',str(private),'--check-config','--require-ocr'],cwd=ROOT,capture_output=True,text=True,timeout=10)
            self.assertEqual(p.returncode,0,p.stderr);self.assertTrue(json.loads(p.stdout)['enabled']);self.assertNotIn('SYNTHETIC_PRIVATE_KEY',p.stdout+p.stderr);self.assertFalse(any(Path(result['runtime']).iterdir()))
            before=private.read_bytes()
            with self.assertRaisesRegex(ValueError,'OUTPUT_EXISTS'):prepare(output,'https://trial.invalid',material)
            self.assertEqual(private.read_bytes(),before)
            public=json.loads(Path(result['publicConfig']).read_text());public['PTDS_OCR_TOTAL_CALLS']='101';public['PTDS_OCR_TOTAL_BUDGET']='51';self.assertFalse(Configuration(public,material).enabled)
            self.assertNotIn(material['tencentSecretKey'],Path(result['caddyfile']).read_text())
    def test_piped_secret_input_is_rejected(self):
        p=subprocess.run([sys.executable,'tools/prepare_mainland.py','--output','/NOT_CREATED','--origin','https://trial.invalid'],cwd=ROOT,input='synthetic\n',capture_output=True,text=True,timeout=10)
        self.assertNotEqual(p.returncode,0);self.assertIn('NO_PIPED_SECRETS',p.stderr);self.assertNotIn('synthetic',p.stdout+p.stderr)
