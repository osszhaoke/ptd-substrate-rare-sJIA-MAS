import hashlib
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

from gateway.ocr import Budget
from public_trial.server import (Deadline, PublicServer, configuration,
                                 connector_command, watch_session)

ROOT = Path(__file__).resolve().parents[1]


class PublicTrialTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.clock = [1000.0, 100.0]
        self.deadline = Deadline(86400, lambda: self.clock[0], lambda: self.clock[1])
        self.server = PublicServer(('127.0.0.1', 0), ROOT / 'web', self.deadline)
        self.origin = 'http://127.0.0.1:' + str(self.server.server_port)
        self.calls = []
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def request(self, path, body=None, **headers):
        req = urllib.request.Request(self.origin + path, body, headers)
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            with error:
                return error.code, error.headers, error.read()

    def enable(self):
        config = configuration('https://fictional.trycloudflare.com', 'SYNTHETIC_ID', 'SYNTHETIC_KEY')
        config.origin = self.origin  # Test-only loopback transport.
        self.budget = Budget(Path(self.tmp.name) / 'synthetic-budget.json', config)
        def provider(body, _):
            self.calls.append(hashlib.sha256(body).hexdigest())
            return {'syntheticOnly': True}
        self.server.enable_ocr(config, self.budget, provider)

    def headers(self, request='synthetic_request_0001'):
        return {'Origin': self.origin, 'Content-Type': 'image/png', 'X-Request-ID': request}

    def test_public_no_code_real_http_and_duplicate_still_rejected(self):
        self.enable()
        image = (ROOT / 'web/fixture.png').read_bytes()
        code, _, body = self.request('/api/ocr', image, **self.headers())
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(body)['ledger'], {'syntheticOnly': True})
        self.assertEqual(self.request('/api/ocr', image, **self.headers())[0], 409)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.budget.state['reserved'], 1)

    def test_foreign_origin_never_calls_or_reserves(self):
        self.enable()
        headers = {**self.headers(), 'Origin': 'https://other.invalid'}
        self.assertEqual(self.request('/api/ocr', (ROOT / 'web/fixture.png').read_bytes(), **headers)[0], 403)
        self.assertEqual(self.calls, [])
        self.assertEqual(self.budget.state['reserved'], 0)

    def test_expiry_all_gets_and_ocr_410_no_additional_reservation(self):
        self.enable()
        self.assertEqual(self.request('/')[0], 200)
        self.clock[1] += 86400
        for path in ['/', '/health', '/api/ocr/config', '/style.css']:
            self.assertEqual(self.request(path)[0], 410)
        self.assertEqual(self.request('/api/ocr', b'x', **self.headers())[0], 410)
        self.assertEqual(self.budget.state['reserved'], 0)
        self.assertEqual(self.calls, [])

    def test_wall_clock_rollback_cannot_extend_and_forward_jump_closes(self):
        self.clock[0] -= 100000
        self.clock[1] += 86400
        self.assertTrue(self.deadline.expired())
        another = Deadline(86400, lambda: self.clock[0], lambda: self.clock[1])
        self.clock[0] += 86400
        self.assertTrue(another.expired())

    def test_no_credential_or_real_token_in_public_config_and_private_paths(self):
        self.enable()
        code, headers, data = self.request('/api/ocr/config')
        self.assertEqual(code, 200)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertTrue(json.loads(data)['publicTrial'])
        for secret in ['SYNTHETIC_ID', 'SYNTHETIC_KEY', self.server.config.token]:
            self.assertNotIn(secret.encode(), data)
        for path in ['/../runtime/session.json', '/%2e%2e/AUTHORIZATION.json', '/public_trial/server.py']:
            self.assertEqual(self.request(path)[0], 404)

    def test_unconfigured_explicitly_disabled_and_no_new_budget(self):
        data = json.loads(self.request('/api/ocr/config')[2])
        self.assertFalse(data['enabled'])
        self.assertFalse(data['publicTrial'])
        self.assertIsNone(self.server.budget)
        self.assertEqual(self.request('/api/ocr', b'x', **self.headers())[0], 503)
        self.assertEqual(list(Path(self.tmp.name).iterdir()), [])

    def test_existing_reservation_preserved_across_new_public_configuration(self):
        first = configuration('https://fictional.trycloudflare.com', 'SYNTHETIC_ID', 'SYNTHETIC_KEY')
        path = Path(self.tmp.name) / 'synthetic-budget.json'
        budget = Budget(path, first)
        budget.reserve('synthetic_prior_attempt', first.token, '127.0.0.1')
        budget.release()
        before = path.read_bytes()
        second = configuration('https://fictional.trycloudflare.com', 'SYNTHETIC_ID', 'SYNTHETIC_KEY')
        loaded = Budget(path, second)
        self.assertEqual(loaded.state['reserved'], 1)
        self.assertEqual(path.read_bytes(), before)

    def test_no_account_token_config_or_network_share_in_connector_command(self):
        command, env = connector_command('/synthetic/cloudflared', 18795)
        self.assertEqual(env, {'PATH': '/usr/bin:/bin:/usr/sbin:/sbin'})
        self.assertIn('/dev/null', command)
        self.assertIn('--no-chunked-encoding', command)
        self.assertIn('http://127.0.0.1:18795', command)
        self.assertNotIn('--token', command)
        self.assertNotIn('--allowed-mail', command)

    def test_10x_deadline_check_has_no_accumulating_state(self):
        for size in (1000, 10000):
            start = time.perf_counter()
            for _ in range(size):
                self.assertFalse(self.deadline.expired())
            self.assertLess((time.perf_counter() - start) * 1000, 1000)
        self.assertEqual(set(vars(self.deadline)), {'wall', 'monotonic', 'started', 'expires', 'monotonic_expires'})

    def test_watchdog_stops_on_deadline_and_connector_exit(self):
        class Child:
            def poll(self):
                return None
        self.clock[1] += 86400
        stop = threading.Event()
        watch = threading.Thread(target=watch_session, args=(self.deadline, Child(), stop))
        watch.start()
        self.assertTrue(stop.wait(1))
        watch.join(timeout=1)
        self.assertFalse(watch.is_alive())
        fresh = Deadline(86400)
        stop = threading.Event()
        with patch.object(Child, 'poll', return_value=1):
            watch = threading.Thread(target=watch_session, args=(fresh, Child(), stop))
            watch.start()
            self.assertTrue(stop.wait(1))
            watch.join(timeout=1)

    def test_restarting_existing_session_never_extends_or_starts_tunnel(self):
        from public_trial import server as module
        home = Path(self.tmp.name)
        runtime = home / 'runtime'
        runtime.mkdir()
        record = runtime / 'session.json'
        record.write_text('{"expiresAt":"synthetic-original-deadline"}')
        before = record.read_bytes()
        with patch.object(module, 'ROOT', home), patch.object(module.sys, 'argv', ['public', '--start']), \
             patch.object(module.sys.stdin, 'isatty', return_value=True), \
             patch.object(module.sys.stderr, 'isatty', return_value=True), \
             patch.object(module, 'start_connector', side_effect=AssertionError('unexpected public restart')):
            self.assertEqual(module.main(), 2)
        self.assertEqual(record.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
