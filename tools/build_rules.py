"""Generate browser data from exact local rule/dictionary copies; no network."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def main():
    folder=ROOT/'web/rules';names=['sjia-rulepack-0.1.json','h1-dictionary-0.1.json']
    pins={'sjia-rulepack-0.1.json':'326437fd6c0cb65ca522421a8fb6070dfa27a9f3322663342fa38e8659668d45','h1-dictionary-0.1.json':'8796767e230fc5705b78956d715832cff607872e67ddeb2c2ef427a202dc4ce8'}
    if any(hashlib.sha256((folder/n).read_bytes()).hexdigest()!=pins[n]for n in names):raise SystemExit('RULE_SOURCE_PIN_MISMATCH')
    docs=[json.loads((folder/n).read_text())for n in names]
    binding={n:hashlib.sha256((folder/n).read_bytes()).hexdigest()for n in names}
    (folder/'definitions.js').write_text('// Generated from the adjacent exact JSON copies; tools/build_rules.py\nexport const PACK='+json.dumps(docs[0],ensure_ascii=False)+';\nexport const H1_DICTIONARY='+json.dumps(docs[1],ensure_ascii=False)+';\nexport const RULE_BINDING='+json.dumps(binding)+';\n')
    print(json.dumps(binding))
if __name__=='__main__':main()
