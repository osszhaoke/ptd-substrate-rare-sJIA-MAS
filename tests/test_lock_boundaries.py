"""Real local HTTP and temporary fictional budgets; no provider network or credentials."""
import concurrent.futures
import json
import tempfile
import threading
import unittest
from pathlib import Path

from gateway.ocr import Budget, OcrError, map_google
from gateway.server import Server
from tests import test_gateway as gateway_tests

config, ROOT = gateway_tests.config, gateway_tests.ROOT


class LockBoundaryTests(unittest.TestCase):
    def test_waiting_provider_does_not_hold_budget_lock_or_block_reads(self):
        entered, release = threading.Event(), threading.Event()
        calls = []

        def provider(body, configuration):
            calls.append(1)
            entered.set()
            if not release.wait(8):
                raise AssertionError('fictional provider was not released')
            return map_google({'responses': [{'fullTextAnnotation': {'text': 'fictional'}}]}, configuration.region)

        with tempfile.TemporaryDirectory() as directory:
            configuration = config()
            server = Server(('127.0.0.1', 0), ROOT / 'web', Path(directory) / 'budget.json', configuration, provider)
            runner = threading.Thread(target=server.serve_forever, daemon=True)
            runner.start()
            body = (ROOT / 'fixtures/lab.png').read_bytes()
            headers = {'Origin': configuration.origin, 'Authorization': 'Bearer ' + configuration.token,
                       'Content-Type': 'image/png', 'X-Request-ID': 'fictional_lock_0001'}
            request = lambda path, data=None, **extra: gateway_tests.GatewayTests.request(self, server, path, data, **extra)
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    waiting = pool.submit(request, '/api/ocr', body, **headers)
                    try:
                        self.assertTrue(entered.wait(3))
                        acquired = server.budget.lock.acquire(blocking=False)
                        if acquired:
                            server.budget.lock.release()
                        self.assertTrue(acquired, 'provider network must run outside budget lock')
                        self.assertFalse(waiting.done())
                        self.assertEqual(request('/')[0], 200)
                        self.assertEqual(request('/api/ocr/config')[0], 200)
                        self.assertEqual(request('/api/ocr', body, **headers)[0], 409)
                        code, _, payload = request('/api/ocr', body, **{**headers, 'X-Request-ID': 'fictional_lock_0002'})
                        self.assertEqual(code, 429)
                        self.assertEqual(json.loads(payload)['error'], 'OCR_BUSY')
                        self.assertEqual(server.budget.state['reserved'], 1)
                        self.assertEqual(calls, [1])
                    finally:
                        release.set()
                    self.assertEqual(waiting.result(timeout=5)[0], 200)
                    self.assertEqual(server.budget.busy, 0)
                    self.assertEqual(request('/api/ocr', body, **{**headers, 'X-Request-ID': 'fictional_lock_0002'})[0], 200)
                    self.assertEqual(calls, [1, 1])
            finally:
                release.set()
                server.shutdown()
                server.server_close()
                runner.join(timeout=3)

    def test_simultaneous_reservations_preserve_single_budget_and_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            configuration = config(PTDS_OCR_TOTAL_CALLS='10', PTDS_OCR_SESSION_CALLS='10',
                                   PTDS_OCR_PER_MINUTE='100', PTDS_OCR_TOTAL_BUDGET='10', PTDS_OCR_CONCURRENCY='4')
            path = Path(directory) / 'budget.json'
            budget = Budget(path, configuration)
            start = threading.Event()

            def reserve(index):
                if not start.wait(timeout=5):
                    raise AssertionError('fictional start was not released')
                try:
                    budget.reserve(f'fictional_request_{index:04}', configuration.token, 'fictional-local')
                except OcrError as error:
                    return error.code
                else:
                    budget.release()
                    return 'RESERVED'

            # Four simultaneous workers match the unchanged four-call concurrency cap.
            # Sixteen workers could correctly reject OCR_BUSY before reaching budget exhaustion.
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                tasks = [pool.submit(reserve, index) for index in range(16)]
                start.set()
                outcomes = [task.result(timeout=8) for task in tasks]
            self.assertEqual(outcomes.count('RESERVED'), 10)
            self.assertEqual(outcomes.count('GLOBAL_BUDGET_STOP'), 6)
            self.assertEqual(budget.busy, 0)
            persisted = json.loads(path.read_text())
            self.assertEqual(persisted['reserved'], 10)
            self.assertEqual(len(set(persisted['requests'])), 10)
            reopened = Budget(path, configuration)
            self.assertEqual(reopened.state, persisted)
            with self.assertRaisesRegex(OcrError, 'GLOBAL_BUDGET_STOP'):
                reopened.reserve('fictional_after_restart', configuration.token, 'fictional-local')


if __name__ == '__main__':
    unittest.main()
