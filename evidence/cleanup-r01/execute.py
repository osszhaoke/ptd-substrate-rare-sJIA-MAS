"""One-shot exact authorized H5 cleanup; no private content reads."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path('/Users/osszhaoke/Downloads/PTDS-H5-debt-r14')
OUT = ROOT / 'evidence/cleanup-r01'
plan = json.loads((OUT / 'plan.json').read_text())
assert plan['keepRoot'] == str(ROOT)
assert not (OUT / 'result.json').exists(), 'Do not replay a completed cleanup'

def event(value):
    with (OUT / 'execution.jsonl').open('a') as log:
        log.write(json.dumps(value, ensure_ascii=False) + '\n')

for entry in plan['deleteRoots']:
    path = Path(entry['path'])
    assert path.parent == ROOT.parent and path != ROOT and not path.is_symlink()
    stat = path.stat()
    assert (stat.st_dev, stat.st_ino) == (entry['device'], entry['inode'])

cwd_result = subprocess.run(['lsof', '-a', '-d', 'cwd', '-Fpn'], capture_output=True, text=True)
assert cwd_result.returncode in (0, 1)
targets = [entry['path'] for entry in plan['deleteRoots']] + [str(ROOT / 'runtime')]
for line in cwd_result.stdout.splitlines():
    if line.startswith('n'):
        assert not any(line[1:] == p or line[1:].startswith(p + '/') for p in targets), line

lock = (ROOT / 'runtime/browser-test.lock').open('a')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
retained = ROOT / 'local-state-retained'
retained.mkdir(mode=0o700, exist_ok=False)
os.chmod(retained, 0o700)

# This is the existing fictional OCR check receipt, not credentials or report data.
receipt = ROOT.parent / 'PTDS-H5-OCR-acceptance-r01/RESULT.json'
if receipt.is_file():
    shutil.copyfile(receipt, OUT / 'previous-provider-check.json')
    event({'preserved': 'existing fictional provider check metadata'})

for entry in plan['retainStateWithoutReading']:
    source, destination = Path(entry['source']), Path(entry['destination'])
    assert source.exists() and not destination.exists()
    destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    source.rename(destination)
    event({'retainedWithoutContentRead': entry})

errors = []
for entry in plan['deleteRoots']:
    path = Path(entry['path'])
    try:
        shutil.rmtree(path)
        event({'deletedOldRoot': str(path)})
    except OSError as error:
        errors.append({'path': str(path), 'errorType': type(error).__name__, 'errno': error.errno})
        event({'failure': errors[-1]})

for value in plan['latestTemporary'] + plan['latestCache'] + [plan['deleteStaleReport']]:
    path = Path(value)
    assert path.is_relative_to(ROOT) and path != ROOT
    if path.name == 'browser-test.lock':
        continue  # Keep the locked inode until the entire cleanup is finished.
    assert not path.is_symlink()
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()
    event({'deletedGeneratedOrStale': value})

for name, expected in plan['sealedArchives'].items():
    assert hashlib.sha256((ROOT / 'deploy' / name).read_bytes()).hexdigest() == expected

remaining = sorted(p.name for p in ROOT.parent.glob('PTDS-H5-*'))
assert remaining == [ROOT.name], remaining
assert not errors, errors
result = {
    'ok': True,
    'oldRootsDeleted': len(plan['deleteRoots']),
    'onlyRemainingH5Root': str(ROOT),
    'generatedEntriesRemoved': len(plan['latestTemporary']) - 1 + len(plan['latestCache']),
    'staleReportRemoved': True,
    'retainedStateEntries': len(plan['retainStateWithoutReading']),
    'privateContentRead': False,
    'mainPTDSOrBrowserOrExternalSecretsChanged': False,
    'sealedArchivesUnchanged': True,
    'servicesStartedOrStopped': False,
    'errors': errors,
}
(OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
event({'completed': result})
fcntl.flock(lock, fcntl.LOCK_UN)
lock.close()
print(json.dumps(result, ensure_ascii=False))
