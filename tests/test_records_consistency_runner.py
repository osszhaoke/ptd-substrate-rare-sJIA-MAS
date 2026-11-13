"""Actual UI controls, pinned original regression and effective guard removal."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import threading
import uuid

from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    out = ROOT / args.output
    out.mkdir(parents=True, exist_ok=False)
    baseline = json.loads((ROOT / 'tests/fixtures/r19-records-baseline.json').read_text())
    originals = {}
    for entry in baseline['files']:
        data = (ROOT / entry['fixturePath']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == entry['sha256']
        originals[entry['sourcePath']] = data
    results = []
    for group in ['control', 'original-r18', 'guard-removal']:
        dest = out / group
        dest.mkdir()
        tree = ROOT / 'runtime' / ('records-consistency-' + str(uuid.uuid4()))
        tree.mkdir()
        shutil.copytree(ROOT / 'web', tree / 'web')
        if group == 'original-r18':
            for path, data in originals.items():
                (tree / path).write_bytes(data)
        if group == 'guard-removal':
            path = tree / 'web/app/records_snapshot.js'
            text = path.read_text()
            needle = 'if(page.revision===latest&&(!statePrefs.enabled||snap.revision===latest))'
            assert text.count(needle) == 1
            path.write_text(text.replace(needle, 'if(true)'))
        served = {p.relative_to(tree / 'web').as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in (tree / 'web').rglob('*') if p.is_file()}
        (dest / 'served-bytes.json').write_text(json.dumps(served, indent=2) + '\n')
        server = Server(('127.0.0.1', 0), tree / 'web', dest / 'unused-budget.json', Configuration({}))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            modes = ['intervening-write', 'queued-navigation', 'continuous', 'page-snapshot'] if group == 'control' else ['intervening-write']
            for mode in modes:
                try:
                    run('records-consistency', dest / mode, {'profile': str(uuid.uuid4()), 'mode': mode},
                        f'http://127.0.0.1:{server.server_port}/')
                except SystemExit:
                    pass
                result = json.loads((dest / (mode + '.json')).read_text())
                if group == 'control':
                    assert result.get('ok') is True, result
                else:
                    assert result.get('ok') is False and result.get('error') == 'HOME_PUBLISHED_OLD_TIMELINE', result
                results.append({'group': group, 'mode': mode, 'browser': result})
        finally:
            server.shutdown()
            server.server_close()
        shutil.rmtree(tree)  # Only the completed fictional tree; exact served hashes remain.
    (out / 'result.json').write_text(json.dumps({
        'ok': True, 'results': results, 'actualProviderCalls': 0, 'productMutated': False,
        'identity': 'author fictional actual UI controls and original regression',
        'killedBy': 'actual timeline IDs after real service commits; not a preflight check',
    }, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
