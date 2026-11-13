"""Deduplicate this batch's intermediate archive; every original byte remains recoverable."""
import hashlib,json,os,shutil,tarfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;ARCH=ROOT/'runtime/archives-r26-01'
plan=json.loads((OUT/'plan.json').read_text());first=json.loads((OUT/'archive-verified.json').read_text());original=ROOT/first['archive'];dest=ARCH/'engineering-candidates-content-addressed.zip'
assert not dest.exists() and hashlib.file_digest(original.open('rb'),'sha256').hexdigest()==first['sha256']
expected={x['path']:x for x in plan['files']};manifest=[];stored=set()
with zipfile.ZipFile(dest,'x',zipfile.ZIP_DEFLATED,compresslevel=6)as zip:
 with tarfile.open(original,'r:gz')as tar:
  for member in tar:
   row=expected[member.name];manifest.append({**row,'mtime':member.mtime})
   if row['sha256']in stored:continue
   data=tar.extractfile(member).read();assert len(data)==row['bytes']and hashlib.sha256(data).hexdigest()==row['sha256'];zip.writestr('blobs/'+row['sha256'],data);stored.add(row['sha256'])
 zip.writestr('manifest.json',json.dumps({'format':'ptds-engineering-content-archive/1','files':manifest},separators=(',',':')))
os.chmod(dest,0o600)
with zipfile.ZipFile(dest)as zip:
 mapped=json.loads(zip.read('manifest.json'));assert mapped['files']==manifest and {x['path']: {k:x[k]for k in ['path','bytes','sha256','mode']}for x in mapped['files']}==expected
 assert len({x['path']for x in manifest})==len(manifest)==len(plan['files'])
 assert set(zip.namelist())=={'manifest.json'}|{'blobs/'+x for x in stored}
 for key in stored:assert hashlib.sha256(zip.read('blobs/'+key)).hexdigest()==key
newsha=hashlib.file_digest(dest.open('rb'),'sha256').hexdigest();assert hashlib.file_digest(original.open('rb'),'sha256').hexdigest()==first['sha256']
(OUT/'deduplicated-verified.json').write_text(json.dumps({'ok':True,'archive':str(dest.relative_to(ROOT)),'sha256':newsha,'archiveBytes':dest.stat().st_size,'originalFiles':len(manifest),'uniqueBlobs':len(stored),'allBlobHashesAndPathSizeModeMappingsVerified':True,'format':'ptds-engineering-content-archive/1','supersedesIntermediateArchive':first['archive'],'originalHistoricalSealedPackagesModified':False},indent=2)+'\n')
original.unlink()
now=shutil.disk_usage(ROOT);before=plan['diskBefore'];(OUT/'final-result.json').write_text(json.dumps({'ok':True,'archive':str(dest.relative_to(ROOT)),'archiveSha256':newsha,'archiveBytes':dest.stat().st_size,'archivedFiles':len(manifest),'uniqueBlobs':len(stored),'removedDirectories':plan['selected'],'logicalOriginalBytes':plan['logicalBytes'],'logicalBytesSaved':plan['logicalBytes']-dest.stat().st_size,'diskBefore':before,'diskAfter':now._asdict(),'diskFreeDelta':now.free-before['free'],'intermediateArchiveRemovedOnlyAfterFullReplacementVerification':True,'oldSealedZIPsChanged':False,'retained':plan['retained'],'currentProductSourceChanged':False,'servicesRestarted':0},indent=2)+'\n')
print(json.dumps({'ok':True,'files':len(manifest),'uniqueBlobs':len(stored),'archiveBytes':dest.stat().st_size,'logicalBytesSaved':plan['logicalBytes']-dest.stat().st_size,'diskFreeDelta':now.free-before['free']}),flush=True)
