"""Restore exact archived engineering files only into a NEW directory; never into the live tree."""
import argparse,hashlib,json,os,shutil,stat,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--destination',type=Path);p.add_argument('--only-path',action='append');a=p.parse_args()
proof=json.loads((OUT/'deduplicated-verified.json').read_text());archive=ROOT/proof['archive']
assert hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()==proof['sha256'],'ARCHIVE_HASH_MISMATCH'
with zipfile.ZipFile(archive)as zip:
 manifest=json.loads(zip.read('manifest.json'));assert manifest['format']=='ptds-engineering-content-archive/1'
 rows=manifest['files'];assert len({r['path']for r in rows})==len(rows)
 if a.only_path:
  chosen=set(a.only_path);rows=[r for r in rows if r['path']in chosen];assert {r['path']for r in rows}==chosen,'PATH_NOT_ARCHIVED'
 for row in rows:assert not Path(row['path']).is_absolute() and '..'not in Path(row['path']).parts and Path(row['path']).parts[0]=='runtime'
 if a.destination is None:print(json.dumps({'verifiedArchive':proof['archive'],'filesAvailable':len(rows),'requiresNewDestination':True}));raise SystemExit
 target=a.destination.absolute();assert target.is_relative_to(ROOT/'runtime') and target!=ROOT/'runtime'and not target.exists(),'NEW_RUNTIME_DESTINATION_REQUIRED';target.mkdir(mode=0o700)
 for row in rows:
  dest=target/row['path'];dest.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
  with zip.open('blobs/'+row['sha256'])as source,dest.open('xb')as f:shutil.copyfileobj(source,f)
  assert dest.stat().st_size==row['bytes']and hashlib.file_digest(dest.open('rb'),'sha256').hexdigest()==row['sha256'],'RESTORE_FILE_HASH_MISMATCH';os.chmod(dest,row['mode']);os.utime(dest,(row['mtime'],row['mtime']))
 (target/'RESTORE_RECEIPT.json').write_text(json.dumps({'ok':True,'archiveSha256':proof['sha256'],'fileCount':len(rows),'allBytesAndModesRestored':True,'destination':str(target),'noLiveSourceOverwrite':True},indent=2)+'\n')
 print(json.dumps({'ok':True,'restored':len(rows),'destination':str(target)}))
