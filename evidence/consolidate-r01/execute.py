"""Exact consolidation plan: preserve Git history, prune duplicate working files, rename root."""
import fcntl
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
out = root / 'evidence/consolidate-r01'
plan = json.loads((out / 'plan.json').read_text())
target = Path(plan['targetRoot'])
assert str(root) == plan['sourceRoot']
assert target.parent == root.parent and target.name == '003-PTDS-FLASH-H5'
assert not target.exists() and not root.is_symlink()
assert not (out / 'result.json').exists()
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip() == plan['archiveIndexCommit']
subprocess.run(['git', 'fsck', '--full', '--no-dangling'], cwd=root, check=True)

def log(value):
    with (out / 'execution.jsonl').open('a') as stream:
        stream.write(json.dumps(value, ensure_ascii=False) + '\n')

cwd_result = subprocess.run(['lsof', '-a', '-d', 'cwd', '-Fpn'], capture_output=True, text=True)
assert cwd_result.returncode in (0, 1)
for line in cwd_result.stdout.splitlines():
    if line.startswith('n'):
        assert line[1:] != str(root) and not line[1:].startswith(str(root) + '/'), line

lock = (root / 'runtime/browser-test.lock').open('a')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
parents = set()
for entry in plan['archiveEvidenceFromWorkingTree']:
    path = root / entry['path']
    assert path.is_relative_to(root / 'evidence') and not path.is_symlink()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256']
    path.unlink()
    parents.update(p for p in path.parents if p.is_relative_to(root / 'evidence') and p != root / 'evidence')
    log({'workingCopyArchivedInGit': entry['path'], 'blob': entry['gitBlob']})
for path in sorted(parents, key=lambda p: len(p.parts), reverse=True):
    if path.exists() and not any(path.iterdir()):
        path.rmdir()

archive = root / plan['removeReproducibleSourceZip']['path']
assert hashlib.sha256(archive.read_bytes()).hexdigest() == plan['removeReproducibleSourceZip']['sha256']
archive.unlink()
log({'removedReproducibleSourceZip': plan['removeReproducibleSourceZip']})
root.rename(target)
out = target / 'evidence/consolidate-r01'
log({'directoryMoved': {'from': str(root), 'to': str(target)}})
fcntl.flock(lock, fcntl.LOCK_UN)
lock.close()
result = {'ok': True, 'root': str(target), 'oldRootAbsent': not root.exists(),
          'historicalEvidenceWorkingFilesArchived': len(plan['archiveEvidenceFromWorkingTree']),
          'historyCommit': plan['archiveIndexCommit'], 'gitHistoryRetained': True,
          'reproducibleSourceZipRemoved': True, 'productSourceModified': False,
          'privateStateContentReadOrErased': False, 'servicesStartedOrStopped': False}
(out / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
