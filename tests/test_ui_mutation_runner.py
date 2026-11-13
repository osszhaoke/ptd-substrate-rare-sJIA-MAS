"""Isolated behavior mutation for the stale asynchronous review regression."""
import argparse, hashlib, json, shutil, threading, uuid
from pathlib import Path
from gateway.server import Server
from gateway.ocr import Configuration
from tools.run_browser import run

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    out = ROOT / parser.parse_args().output
    out.mkdir(parents=True, exist_ok=False)
    runtime = ROOT / 'runtime' / ('ui-mutation-' + str(uuid.uuid4()))
    runtime.mkdir()
    results = {}
    for mode in ['control', 'mutant']:
        web = runtime / mode
        shutil.copytree(ROOT / 'web', web)
        if mode == 'mutant':
            path = web / 'app/main.js'
            text = path.read_text()
            original = 'if(edit!==editGeneration||s!==source){'
            assert text.count(original) == 1
            path.write_text(text.replace(original, 'if(false){'))
        binding = {str(p.relative_to(web)): hashlib.sha256(p.read_bytes()).hexdigest()
                   for p in sorted(web.rglob('*')) if p.is_file()}
        (out / (mode + '-served-bytes.json')).write_text(json.dumps(binding, indent=2))
        server = Server(('127.0.0.1', 0), web, runtime / 'unused-budget.json', Configuration({}))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            try:
                run('state-ui', out / mode, {'profile': str(uuid.uuid4()), 'width': '320'},
                    'http://127.0.0.1:' + str(server.server_address[1]) + '/')
            except SystemExit:
                if mode != 'mutant':
                    raise
            result = json.loads((out / (mode + '.json')).read_text())
            if mode == 'control':
                assert result.get('ok') is True
            else:
                assert result.get('ok') is False
                assert result.get('error') == 'async edit enabled stale review'
            results[mode] = result
        finally:
            server.shutdown()
            server.server_close()
    control = json.loads((out / 'control-served-bytes.json').read_text())
    mutant = json.loads((out / 'mutant-served-bytes.json').read_text())
    assert [p for p in control if control[p] != mutant[p]] == ['app/main.js']
    (out / 'result.json').write_text(json.dumps({
        'ok': True, 'controlPassed': True, 'mutantKilledByBehaviorAssertion': True,
        'failure': results['mutant']['error'], 'changedFiles': ['app/main.js'],
        'productionSourceModified': False, 'scope': 'synthetic isolated runtime copies'
    }, indent=2))


if __name__ == '__main__':
    main()
