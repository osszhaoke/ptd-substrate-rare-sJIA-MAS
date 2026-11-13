"""Explicit operational tests: isolated temporary state, fictional credentials, loopback only."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.request
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('alpha_operator', HERE / 'operator_bootstrap.py')
module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class OperatorTests(unittest.TestCase):
    def test_absolute_deadline_clock_rollback_and_expired_start(self):
        clock = [1000.0, 100.0]
        d = module.absolute_deadline(1010, lambda: clock[0], lambda: clock[1])
        self.assertEqual(d.expires, 1010)
        clock[0] = 1;clock[1] = 110
        self.assertTrue(d.expired(), 'wall rollback must not extend monotonic deadline')
        with self.assertRaisesRegex(module.OcrError, 'APPROVED_DEADLINE_PASSED'):
            module.absolute_deadline(0)

    def test_one_owner_lock_release_and_symlink_rejection(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'owner.lock'
            with module.owner(path):
                with self.assertRaises(BlockingIOError):
                    with module.owner(path):
                        self.fail('parallel owner admitted')
            with module.owner(path):
                pass
            link = Path(temp) / 'linked.lock';link.symlink_to(path)
            with self.assertRaises(OSError):
                with module.owner(link):
                    self.fail('linked owner admitted')

    def test_real_http_expiry_closes_listener_and_clears_transient_payload(self):
        class FakeConnector:
            returncode = None
            def poll(self):return self.returncode
            def terminate(self):self.returncode = 0
            def wait(self, timeout=None):return self.returncode
        real_server = module.PublicServer
        observed = {};ready = threading.Event();connector = FakeConnector()
        def capture_server(*args, **kwargs):
            server = real_server(*args, **kwargs);observed['port'] = server.server_port;ready.set();return server
        def request():
            if not ready.wait(2):return
            time.sleep(.05)
            with urllib.request.urlopen(f"http://127.0.0.1:{observed['port']}/health", timeout=2) as response:
                observed['response'] = json.loads(response.read())
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp);payload = {};target = time.time() + 1.5
            reader = threading.Thread(target=request);reader.start()
            with patch.object(module, 'PublicServer', capture_server), \
                 patch.object(module, 'start_connector', return_value=(connector, {'url':'https://fictional.trycloudflare.com'})), \
                 patch.object(module.signal, 'signal'), patch.object(module.subprocess, 'run'):
                result = module.serve(payload, state_dir=folder/'state', target=target, port=0,
                                      qr=folder/'qr.png', lock_path=folder/'owner.lock')
            reader.join(timeout=2)
            self.assertEqual(observed['response']['expiresAt'], module.utc(target))
            self.assertFalse(observed['response']['ocrEnabled'])
            self.assertEqual(result['state'], 'EXPIRED')
            self.assertEqual(result['stopReason'], 'DEADLINE')
            self.assertIsNotNone(connector.poll())
            with self.assertRaises(Exception):
                urllib.request.urlopen(f"http://127.0.0.1:{observed['port']}/health", timeout=1)
            self.assertEqual(payload, {})
            self.assertFalse(result['credentialsStored'])

    def test_background_worker_survives_launcher_exit_and_pipe_has_no_file_secret(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp);marker = folder/'marker.json';done = folder/'done'
            worker = """import json,sys,os,time
from pathlib import Path
payload=json.loads(sys.stdin.read());assert payload['secretId']=='SYNTHETIC_ONLY_SENTINEL'
Path(sys.argv[1]).write_text(json.dumps({'pid':os.getpid(),'sid':os.getsid(0),'stdinTty':os.isatty(0)}))
payload.clear();time.sleep(1);Path(sys.argv[2]).write_text('done')
"""
            launcher = """import importlib.util,sys
spec=importlib.util.spec_from_file_location('operator',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
child=m.spawn_worker([sys.executable,'-B','-c',sys.argv[2],sys.argv[3],sys.argv[4]],{'secretId':'SYNTHETIC_ONLY_SENTINEL'})
print(child.pid)
"""
            completed = subprocess.run([sys.executable, '-B', '-c', launcher,
                                        str(HERE/'operator_bootstrap.py'), worker, str(marker), str(done)],
                                       capture_output=True, text=True, timeout=5, check=True)
            pid = int(completed.stdout.strip());until = time.monotonic() + 4
            while not done.exists() and time.monotonic() < until:time.sleep(.02)
            self.assertTrue(done.exists(), 'child did not survive completed launcher')
            data = json.loads(marker.read_text());self.assertEqual(data['pid'], pid)
            self.assertEqual(data['sid'], pid);self.assertFalse(data['stdinTty'])
            self.assertTrue(all('SYNTHETIC_ONLY_SENTINEL' not in p.read_text() for p in folder.iterdir()))


if __name__ == '__main__':unittest.main(verbosity=2)
