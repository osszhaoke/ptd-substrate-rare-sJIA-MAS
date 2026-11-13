"""Exact copied Python kernel oracle; synthetic stdin only, no instances/database/network."""
import sys,json
from pathlib import Path
from decimal import Decimal
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent/'reference'))
from h1_common import load_dictionary,DictionaryRegistry
from rules import RulePack,Value,eval_rule,compare
root=Path(__file__).resolve().parents[1]
registry=DictionaryRegistry([load_dictionary(root/'web/rules/h1-dictionary-0.1.json')])
pack=RulePack(json.loads((root/'web/rules/sjia-rulepack-0.1.json').read_text()),registry)
data=json.load(sys.stdin)
output=[]
for case in data:
 vals={k:Value(k,'BOOLEAN'if type(v['value'])is bool else'DECIMAL',v['value']if type(v['value'])is bool or v['value']is None else Decimal(v['value']),v.get('comparator'),v.get('unit'),v.get('conflict',False),tuple(v.get('refs',[])))for k,v in case['values'].items()}
 output.append({rid:eval_rule(rid,rule,vals)for rid,rule in pack.rules.items()})
json.dump(output,sys.stdout,ensure_ascii=False)
