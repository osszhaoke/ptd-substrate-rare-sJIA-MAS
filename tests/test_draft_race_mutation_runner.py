"""Isolated actual-behavior controls for debounce and conflict barriers; no product mutation."""
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = ROOT / args.output
    output.mkdir(parents=True, exist_ok=False)
    baseline = json.loads((ROOT / 'tests/fixtures/r15-draft-baseline.json').read_text())
    original = ROOT / baseline['fixturePath']
    assert original.parent == ROOT / 'tests/fixtures'
    assert hashlib.sha256(original.read_bytes()).hexdigest() == baseline['sha256']
    expected = {
        'original': 'failed save automatically retried by pending debounce',
        'retry': 'failed save automatically retried by pending debounce',
        'conflict-success': 'late save acknowledgement hid external conflict',
        'conflict-error': 'late write error reopened a conflicted draft for retry',
    }
    results = []
    for mode in ['control', 'original', 'retry', 'conflict-success', 'conflict-error']:
        destination = output / mode
        destination.mkdir()
        tree = ROOT / 'runtime' / ('r15-draft-mutant-' + str(uuid.uuid4()))
        tree.mkdir()
        shutil.copytree(ROOT / 'web', tree / 'web')
        (tree / 'tests').mkdir()
        shutil.copyfile(ROOT / 'tests/consultation_draft.test.mjs', tree / 'tests/consultation_draft.test.mjs')
        (tree / 'package.json').write_text('{"type":"module"}\n')
        source = tree / 'web/app/consultation_draft.js'
        text = source.read_text()
        if mode == 'original':
            source.write_bytes(original.read_bytes())
        elif mode == 'retry':
            needle = '}catch(error){clearTimeout(this.timer);this.timer=null;'
            assert text.count(needle) == 1
            source.write_text(text.replace(needle, '}catch(error){'))
        elif mode == 'conflict-success':
            needle = "if(this.disposed||this.status==='conflict')return false;"
            assert text.count(needle) == 3
            source.write_text(text.replace(needle, 'if(this.disposed)return false;'))
        elif mode == 'conflict-error':
            needle = "this.status=this.status==='conflict'||error.message==='DRAFT_CONFLICT'?'conflict':'error';"
            assert text.count(needle) == 1
            source.write_text(text.replace(needle, "this.status=error.message==='DRAFT_CONFLICT'?'conflict':'error';"))
        (destination / 'served-bytes.json').write_text(json.dumps({
            path.relative_to(tree / 'web').as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (tree / 'web').rglob('*') if path.is_file()
        }, indent=2) + '\n')
        node = subprocess.run(['node', '--test', 'tests/consultation_draft.test.mjs'],
                              cwd=tree, capture_output=True, text=True, timeout=20)
        (destination / 'node.log').write_text(node.stdout + node.stderr)
        server = Server(('127.0.0.1', 0), tree / 'web', destination / 'unused-budget.json', Configuration({}))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            try:
                run('draft-save-races', destination / 'browser', {'profile': str(uuid.uuid4())},
                    f'http://127.0.0.1:{server.server_port}/')
            except SystemExit:
                pass
            browser = json.loads((destination / 'browser.json').read_text())
        finally:
            server.shutdown()
            server.server_close()
        if mode == 'control':
            assert node.returncode == 0 and browser.get('ok') is True, (node.stdout, browser)
        else:
            assert node.returncode != 0 and expected[mode] in node.stdout + node.stderr, node.stdout + node.stderr
            if mode in ['original', 'conflict-success']:
                assert browser.get('ok') is False and browser.get('error', '').startswith('SAVED_AFTER_COMPETING_DRAFT'), browser
            else:
                assert browser.get('ok') is True, browser
        results.append({'mode': mode, 'nodeExitCode': node.returncode, 'browser': browser})
        shutil.rmtree(tree)  # All expected results/logs/hash bindings retained; generated trees are disposable.
    (output / 'result.json').write_text(json.dumps({
        'ok': True, 'results': results, 'productMutated': False,
        'killedBy': 'actual pending timer, save-result, and persisted CAS/notification assertions; not preflight',
        'identity': 'author isolated fictional controls and four regressions',
    }, indent=2) + '\n')


if __name__ == '__main__':
    main()
