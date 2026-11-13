"""Actual UI controls and fixed original regressions, using fictional profiles only."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import threading
import uuid

from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run

ROOT = Path(__file__).resolve().parents[1]
CASES = ['ocr-edit', 'ocr-hash-edit', 'consult-edit', 'consult-conflict', 'reload-error']
EXPECTED = {
    'ocr-edit': ['OCR_OVERWROTE_NEW_MANUAL_EDIT'],
    'ocr-hash-edit': ['OCR_OVERWROTE_NEW_MANUAL_EDIT'],
    'consult-edit': ['GENERATION_OVERWROTE_NEW_MANUAL_EDIT'],
    'consult-conflict': ['GENERATION_OVERWROTE_CONFLICTING_TEXT'],
    'reload-error': ['RELOAD_REJECTION_ESCAPED_UI', 'RELOAD_FAILURE_NOT_VISIBLE'],
}


class FictionalBrowserConfig(Configuration):
    # Show the existing OCR UI while keeping the server's provider disabled.
    # Browser fetches are intercepted by the test; no credentials, budget or provider needed.
    def public(self):
        return {'enabled': True, 'provider': 'fictional', 'region': 'local',
                'maxImageBytes': 2097152, 'disclosure': '虚构本机测试，不调用服务商'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--baseline-only', action='store_true')
    args = parser.parse_args()
    output = ROOT / args.output
    output.mkdir(parents=True, exist_ok=False)
    baseline = json.loads((ROOT / 'tests/fixtures/r16-ownership-baseline.json').read_text())
    originals = {}
    for item in baseline['files']:
        source = ROOT / item['fixturePath']
        assert source.parent == ROOT / 'tests/fixtures'
        data = source.read_bytes()
        assert hashlib.sha256(data).hexdigest() == item['sha256']
        originals[item['sourcePath']] = data
    results = []
    groups = [('original-main', CASES[:2], 'web/app/main.js'),
              ('original-flow', CASES[2:], 'web/app/consultation_flow.js'),
              ('original-draft', [], 'web/app/consultation_draft.js')]
    if not args.baseline_only:
        groups.insert(0, ('control', CASES + ['ocr-navigation'], None))
        groups.append(('ocr-cancel-mutant', CASES[:2], 'web/app/main.js'))
    for group, cases, original in groups:
        destination = output / group
        destination.mkdir()
        tree = ROOT / 'runtime' / ('r16-ownership-' + str(uuid.uuid4()))
        tree.mkdir()
        shutil.copytree(ROOT / 'web', tree / 'web')
        (tree / 'tests').mkdir()
        shutil.copyfile(ROOT / 'tests/consultation_draft.test.mjs', tree / 'tests/consultation_draft.test.mjs')
        (tree / 'package.json').write_text('{"type":"module"}\n')
        if original:
            (tree / original).write_bytes(originals[original])
        if group == 'ocr-cancel-mutant':
            path = tree / 'web/app/main.js'
            text = path.read_text()
            needle = 'function invalidate(){cancelOcr();'
            assert text.count(needle) == 1
            path.write_text(text.replace(needle, 'function invalidate(){'))
        served = {p.relative_to(tree / 'web').as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in (tree / 'web').rglob('*') if p.is_file()}
        (destination / 'served-bytes.json').write_text(json.dumps(served, indent=2) + '\n')
        if group in ['control', 'original-draft']:
            node = subprocess.run(['node', '--test', 'tests/consultation_draft.test.mjs'],
                                  cwd=tree, capture_output=True, text=True, timeout=20)
            (destination / 'node.log').write_text(node.stdout + node.stderr)
            if group == 'control':
                assert node.returncode == 0, node.stdout + node.stderr
            else:
                assert node.returncode != 0 and 'load published an older snapshot' in node.stdout, node.stdout
                assert 'continuous reload ignored intervening changes' in node.stdout, node.stdout
                assert 'initial load hid an intervening clinical change' in node.stdout, node.stdout
            results.append({'group': group, 'nodeExitCode': node.returncode})
        if cases:
            server = Server(('127.0.0.1', 0), tree / 'web', destination / 'unused-budget.json', FictionalBrowserConfig({}))
            assert not server.config.enabled and server.budget is None
            threading.Thread(target=server.serve_forever, daemon=True).start()
            try:
                for mode in cases:
                    case = 'ocr-navigation' if mode == 'ocr-navigation' else 'async-ownership'
                    try:
                        run(case, destination / mode, {'profile': str(uuid.uuid4()), 'mode': mode},
                            f'http://127.0.0.1:{server.server_port}/')
                    except SystemExit:
                        pass
                    result = json.loads((destination / (mode + '.json')).read_text())
                    if group in ['control', 'original-main']:
                        assert result.get('ok') is True, result
                    else:
                        assert result.get('ok') is False and result.get('error') in EXPECTED[mode], result
                    results.append({'group': group, 'mode': mode, 'browser': result})
            finally:
                server.shutdown()
                server.server_close()
        shutil.rmtree(tree)  # Expected results and exact served hashes remain in evidence.
    (output / 'result.json').write_text(json.dumps({
        'ok': True, 'baselineOnly': args.baseline_only, 'results': results,
        'identity': 'author isolated original regressions' if args.baseline_only else 'author fictional controls and original regressions',
        'actualProviderCalls': 0, 'productMutated': False,
        'killedBy': 'actual input values, conflict text, persisted CAS, bounded reads and visible reload error; not preflight',
    }, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
