"""Explicit current default acceptance index; no deployment, archive or service operations."""
import argparse,copy,json,re
from pathlib import Path
from tools.verify_debt import require_verification
FIELDS=('author','currentProof','verificationEvidence','verificationBinding','checks','nodeTests','pythonTests')
def expected_index(root,evidence):
 root=Path(root);evidence=Path(evidence);proof=require_verification(root,evidence)
 count=lambda name,pattern:int(re.search(pattern,(evidence.parent/name).read_text()).group(1))
 node=count('node.log',r'ℹ tests (\d+)');python=count('python.log',r'Ran (\d+) tests');checks=len(proof['checks']);rel=evidence.relative_to(root).as_posix()
 return {'author':f'PASS_{checks}_CHECKS_{node}_NODE_{python}_PYTHON','currentProof':rel,'verificationEvidence':rel,'verificationBinding':proof['binding']['digest'],'checks':checks,'nodeTests':node,'pythonTests':python}
def validate_index(index,expected):
 for key in FIELDS:
  if index.get(key)!=expected[key]:raise ValueError('CURRENT_ACCEPTANCE_MISMATCH '+key)
 patch=index.get('staticPatch',{})
 for key,alias in [('verification','currentProof'),('binding','verificationBinding')]:
  if patch.get(key)!=expected[alias]:raise ValueError('CURRENT_ACCEPTANCE_PATCH_MISMATCH '+key)
 return True

def refresh_index(index,expected):
 result=copy.deepcopy(index)
 if any(index.get(k)!=expected[k]for k in FIELDS):result.setdefault('previousDefaultIndexes',[]).append({k:index.get(k)for k in FIELDS})
 result.update(expected);return result

def main():
 p=argparse.ArgumentParser();p.add_argument('--proof',type=Path,required=True);p.add_argument('--apply',action='store_true');a=p.parse_args();root=Path(__file__).resolve().parents[1];evidence=a.proof if a.proof.is_absolute()else root/a.proof;expected=expected_index(root,evidence);path=root/'ACCEPTANCE.json';index=json.loads(path.read_text());index=refresh_index(index,expected)if a.apply else index;validate_index(index,expected)
 if a.apply:path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'ok':True,'currentDefaultIndex':expected,'applied':a.apply}))
if __name__=='__main__':main()
