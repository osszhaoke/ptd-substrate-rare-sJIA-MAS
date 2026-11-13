"""Verify archive; restore historical synthetic artifacts to a NEW directory only."""
import argparse,hashlib,json,os,stat,zipfile
from pathlib import Path,PurePosixPath
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
def hashfile(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--destination',type=Path);ap.add_argument('--only-path',action='append',default=[]);args=ap.parse_args()
 archive=BASE/'archive.zip';identity=json.loads((BASE/'ARCHIVE_VERIFIED.json').read_text())
 assert hashfile(archive)==identity['sha256'],'archive SHA256 mismatch'
 with zipfile.ZipFile(archive) as z:
  m=json.loads(z.read('manifest.json'));assert m['format']=='ptds-synthetic-artifacts/1'
  seen=set();blobs={}
  for item in m['items']:
   name=PurePosixPath(item['path']);assert not name.is_absolute() and '..' not in name.parts and name.parts[0]=='evidence'
   assert item['path'] not in seen;seen.add(item['path'])
   assert len(item['sha256'])==64 and set(item['sha256'])<=set('0123456789abcdef')
   assert item['mode']&~0o777==0
   blobs[item['sha256']]=item['bytes']
  assert len(z.namelist())==len(blobs)+1
  assert set(z.namelist())=={'manifest.json'}|{'blobs/'+h for h in blobs}
  for h,size in blobs.items():
   data=z.read('blobs/'+h);assert len(data)==size and hashlib.sha256(data).hexdigest()==h
  wanted=set(args.only_path);assert wanted<=seen,'unknown path requested'
  items=[x for x in m['items'] if not wanted or x['path'] in wanted]
  if args.destination:
   dest=args.destination.expanduser().resolve()
   assert dest!=ROOT and ROOT not in dest.parents,'restore outside the active project'
   assert not dest.exists(),'destination must not already exist'
   dest.mkdir(parents=True)
   for item in items:
    target=dest/item['path'];target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('xb') as f:f.write(z.read('blobs/'+item['sha256']))
    target.chmod(item['mode']);os.utime(target,ns=(item['mtimeNs'],item['mtimeNs']))
    assert hashfile(target)==item['sha256'] and stat.S_IMODE(target.stat().st_mode)==item['mode']
  print(json.dumps({'ok':True,'verifiedFiles':len(m['items']),'verifiedBlobs':len(blobs),'restoredFiles':len(items) if args.destination else 0,'destination':str(args.destination) if args.destination else None,'archiveSha256':identity['sha256']}))
if __name__=='__main__':main()
