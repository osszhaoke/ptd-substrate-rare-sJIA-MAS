"""Explicit byte-verified reversible engineering archival; no original inputs/live process touched."""
import gzip,hashlib,json,os,shutil,stat,sys,tarfile,time,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from tools.verify_debt import require_verification,fingerprint
require_verification(ROOT,ROOT/'evidence/r26-verification01/result.json');binding=fingerprint(ROOT)
ARCH=ROOT/'runtime/archives-r26-01';ARCH.mkdir(mode=0o700,exist_ok=False)
selected=['ocr-candidate01','ocr-review-candidate01','startup-candidate01','startup-candidate02','startup-fallback-candidate01','r24-candidate01','r25-candidate01','r26-candidate01']
assert not (OUT/'plan.json').exists(),'OUTPUT_EXISTS'
sha=lambda p:hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
keep=['runtime/local-ocr-r23-01','runtime/local-acceptance-r23-01','runtime/r26-web-swap01','runtime/r26-source-before01','runtime/r26-image-check01','web','evidence','deploy/PTDS-H5-sjia-mas-r19.zip']
def inventory():
 result=[]
 for name in selected:
  root=ROOT/'runtime'/name;assert root.is_dir() and not root.is_symlink()
  for p in sorted(root.rglob('*')):
   assert not p.is_symlink(),'SYMLINK_NOT_AUTHORIZED'
   if p.is_file():
    assert p.name not in ['.env','SecretId','SecretKey'],'PROTECTED_FILE_NAME'
    result.append({'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p),'mode':stat.S_IMODE(p.stat().st_mode)})
 return result
before=shutil.disk_usage(ROOT);files=inventory();(OUT/'plan.json').write_text(json.dumps({'operation':'compress, verify every byte/path/mode, then remove only explicit candidate directories','selected':selected,'retained':keep,'fileCount':len(files),'logicalBytes':sum(x['bytes']for x in files),'diskBefore':before._asdict(),'files':files,'archiveIsPrivate':True,'noPublicDeploymentOrServiceRestart':True},indent=2)+'\n');print(json.dumps({'phase':'plan','files':len(files),'bytes':sum(x['bytes']for x in files)}),flush=True)
archive=ARCH/'engineering-candidates.tar.gz'
with tarfile.open(archive,'w:gz',compresslevel=6)as tar:
 for row in files:tar.add(ROOT/row['path'],arcname=row['path'],recursive=False)
os.chmod(archive,0o600);expected={x['path']:x for x in files};verified={}
with tarfile.open(archive,'r:gz')as tar:
 for member in tar:
  assert member.isfile() and member.name in expected and member.name not in verified
  row=expected[member.name];f=tar.extractfile(member);h=hashlib.file_digest(f,'sha256').hexdigest();assert h==row['sha256'] and member.size==row['bytes'] and member.mode==row['mode'];verified[member.name]=h
assert set(verified)==set(expected) and inventory()==files,'SOURCE_CHANGED_DURING_ARCHIVE'
(OUT/'archive-verified.json').write_text(json.dumps({'ok':True,'archive':str(archive.relative_to(ROOT)),'sha256':sha(archive),'archiveBytes':archive.stat().st_size,'verifiedFileCount':len(verified),'everyFileHashModeAndSizeMatched':True},indent=2)+'\n')
print(json.dumps({'phase':'verified','archiveBytes':archive.stat().st_size}),flush=True)
for name in selected:shutil.rmtree(ROOT/'runtime'/name)
assert fingerprint(ROOT)==binding
for p in keep:assert (ROOT/p).exists()
after=shutil.disk_usage(ROOT);(OUT/'result.json').write_text(json.dumps({'ok':True,'archive':str(archive.relative_to(ROOT)),'archiveSha256':sha(archive),'removedDirectories':selected,'filesArchivedThenRemoved':len(files),'logicalOriginalBytes':sum(x['bytes']for x in files),'compressedBytes':archive.stat().st_size,'logicalBytesSaved':sum(x['bytes']for x in files)-archive.stat().st_size,'diskBefore':before._asdict(),'diskAfter':after._asdict(),'diskFreeDelta':after.free-before.free,'currentBindingUnchanged':binding['digest'],'retained':keep,'serviceRestarts':0,'originalTestImagesRemoved':False,'oldZipModified':False,'historicalRootEvidenceModified':False,'restoration':'verify archive SHA then restore selected regular files with exact per-file hash/mode from plan.json; never overwrite running source automatically'},indent=2)+'\n')
print(json.dumps({'phase':'complete','freedLogicalBytes':sum(x['bytes']for x in files)-archive.stat().st_size,'diskFreeDelta':after.free-before.free}),flush=True)
