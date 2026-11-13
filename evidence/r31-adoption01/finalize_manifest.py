"""Generate the current source index from the adopted receipt; never create a ZIP."""
import copy,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from tools.verify_debt import require_verification
out=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def validate(index,receipt):
    assert index['staticPatch']==receipt['staticPatch'],'INDEX_PATCH_MISMATCH'
    assert index['verification']==receipt['verification'],'INDEX_PROOF_MISMATCH'
    assert index['verificationBinding']==receipt['binding'],'INDEX_BINDING_MISMATCH'
    assert index['staticVersion']==receipt['staticVersion'],'INDEX_STATIC_VERSION_MISMATCH'
    proof=require_verification(ROOT,ROOT/index['verification'])
    assert proof['binding']['digest']==receipt['binding'],'ADOPTION_PROOF_MISMATCH'
    entries=index['files']
    assert len({e['path'] for e in entries})==len(entries),'INDEX_DUPLICATE_PATH'
    for entry in entries:
        p=ROOT/entry['path'];assert p.is_file(),'INDEX_FILE_MISSING'
        assert entry['sha256']==sha(p) and entry['bytes']==p.stat().st_size,'INDEX_FILE_MISMATCH'
    assert index['productTreeSha256']==hashlib.sha256(json.dumps(entries,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'INDEX_TREE_MISMATCH'
    return proof

def main():
    assert not (out/'manifest-validation.json').exists(),'OUTPUT_EXISTS'
    receipt=json.loads((out/'adoption-result.json').read_text());assert receipt['ok'] and receipt['batch']=='R31-A1'
    path=ROOT/'SOURCE_MANIFEST.json';old=json.loads(path.read_text());index=copy.deepcopy(old)
    paths=sorted({e['path']for e in old['files']}|{r['path']for r in receipt['exactDelta']if r['path'].startswith('web/')or r['path']=='tools/acceptance_index.py'});entries=[{'path':p,'sha256':sha(ROOT/p),'bytes':(ROOT/p).stat().st_size}for p in paths]
    index.update(files=entries,productTreeSha256=hashlib.sha256(json.dumps(entries,sort_keys=True,separators=(',',':')).encode()).hexdigest(),scope='current R31-A1 reference-quality projection over R30; parser, strict wire, save, frozen restore, Store and medical rules unchanged; original ZIP unchanged',staticPatch=receipt['staticPatch'],verification=receipt['verification'],verificationBinding=receipt['binding'],staticVersion=receipt['staticVersion'],adoption='evidence/r31-adoption01/adoption-result.json')
    validate(index,receipt)
    negatives={}
    for label,key,value in [('old-patch','staticPatch','r19-ocr01'),('old-proof','verification','evidence/r20-verification04/result.json'),('missing-proof','verification','evidence/r31-missing-proof/result.json'),('old-binding','verificationBinding','0'*64),('stale-proof','verification','evidence/r25-verification01/result.json')]:
        changed=copy.deepcopy(index);changed[key]=value
        # Match the receipt in proof controls to exercise existence/current-input binding.
        expected=copy.deepcopy(receipt)
        if label in ['missing-proof','stale-proof']:expected[key]=value
        try:validate(changed,expected)
        except (AssertionError,ValueError) as error:negatives[label]=str(error)
        else:raise AssertionError('NEGATIVE_NOT_REJECTED '+label)
    path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');validate(json.loads(path.read_text()),receipt)
    (out/'manifest-validation.json').write_text(json.dumps({'ok':True,'entryCount':len(entries),'addedPaths':sorted(set(paths)-{e['path']for e in old['files']}),'staticPatch':index['staticPatch'],'verification':index['verification'],'binding':index['verificationBinding'],'productTreeSha256':index['productTreeSha256'],'sourceManifestSha256':sha(path),'negativeControls':negatives,'zipCreatedOrModified':False},indent=2)+'\n')
    print(json.dumps({'ok':True,'sourceManifestEntries':len(entries),'negativeControls':negatives}))
if __name__=='__main__':main()
