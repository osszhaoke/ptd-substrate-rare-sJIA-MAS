"""Build an isolated static fictional phone-test site; never serves or publishes it."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build(output):
    output = Path(output)
    if output.exists():
        raise ValueError('OUTPUT_EXISTS')
    sources = {
        'index.html': ROOT/'tools/phone_acceptance/index.html',
        'phone.js': ROOT/'tools/phone_acceptance/phone.js',
        'phone.css': ROOT/'tools/phone_acceptance/phone.css',
        'fixture.png': ROOT/'web/fixture.png',
    }
    for directory in ['domain', 'storage', 'shared']:
        for path in sorted((ROOT/'web'/directory).rglob('*.js')):
            sources[path.relative_to(ROOT/'web').as_posix()] = path
    sources['rules/definitions.js'] = ROOT/'web/rules/definitions.js'
    # A missing dependency fails explicitly. No fallback to an older tree or secret/config lookup.
    payload = {name: path.read_bytes() for name, path in sources.items()}
    entries = [{'path': name, 'sha256': sha(data), 'bytes': len(data)} for name, data in sorted(payload.items())]
    tree = sha(json.dumps(entries, sort_keys=True, separators=(',', ':')).encode())
    manifest = {
        'version': 'h5-phone-r19', 'treeSha256': tree, 'files': entries,
        'scope': 'static fictional acceptance only; no product UI, OCR, credentials or real data',
        'builderSha256': sha(Path(__file__).read_bytes()),
        'physicalPhone': 'NOT_TESTED_BY_BUILD',
    }
    payload['PHONE_MANIFEST.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode()
    output.mkdir(parents=True)
    site = output/'site'
    site.mkdir()
    with zipfile.ZipFile(output/'PTDS-H5-phone-r19.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(payload.items()):
            path = site/name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            info = zipfile.ZipInfo(name, (2026, 11, 7, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    return {'site': str(site), 'treeSha256': tree, 'zipSha256': sha((output/'PTDS-H5-phone-r19.zip').read_bytes()), 'files': len(payload), 'servicesStarted': False, 'cloudCalls': 0}


def verify(site):
    site = Path(site)
    manifest = json.loads((site/'PHONE_MANIFEST.json').read_text())
    names = {entry['path'] for entry in manifest['files']}
    actual = {path.relative_to(site).as_posix() for path in site.rglob('*') if path.is_file()}
    if actual != names | {'PHONE_MANIFEST.json'}:
        raise ValueError('PHONE_FILE_SET_MISMATCH')
    for entry in manifest['files']:
        raw_path = site/entry['path']
        path = raw_path.resolve()
        if not path.is_relative_to(site.resolve()) or raw_path.is_symlink():
            raise ValueError('PHONE_PATH_REJECTED')
        data = path.read_bytes()
        if len(data) != entry['bytes'] or sha(data) != entry['sha256']:
            raise ValueError('PHONE_BYTES_MISMATCH')
    tree = sha(json.dumps(manifest['files'], sort_keys=True, separators=(',', ':')).encode())
    if tree != manifest['treeSha256']:
        raise ValueError('PHONE_TREE_MISMATCH')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--verify', type=Path)
    args = parser.parse_args()
    if bool(args.output) == bool(args.verify):
        parser.error('choose --output NEW_DIRECTORY or --verify SITE_DIRECTORY')
    print(json.dumps(build(args.output) if args.output else verify(args.verify), ensure_ascii=False))


if __name__ == '__main__':
    main()
