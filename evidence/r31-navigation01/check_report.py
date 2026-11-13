from pathlib import Path
import hashlib,json,re
O=Path(__file__).resolve().parent
spec=Path('/Users/osszhaoke/Downloads/000-PTDSv0.3-StarTorchv2 - astra/docs/reference/AI_REPORTING_R02.source.txt');s=spec.read_text();contract=json.loads(re.search(r'PTDS_REPORTING_CONTRACT_BEGIN.*?```json\s*(.*?)\s*```',s,re.S).group(1));body=(O/'final-response.md').read_text();count=sum(not c.isspace()for c in body);assert count<=contract['max_body_characters'];assert body.startswith('【进度汇报｜'+contract['version']+'】');positions=[]
for field in contract['fields']:
 marker=field+'：';assert body.count(marker)==1;positions.append(body.index(marker))
assert positions==sorted(positions)
for i,pos in enumerate(positions):
 end=positions[i+1]if i+1<len(positions)else len(body);assert body[pos+len(contract['fields'][i])+1:end].strip()
(O/'report-format-validation.json').write_text(json.dumps({'ok':True,'mode':'one-off checker against embedded authoritative JSON contract; canonical checker outside permitted task roots not used','specPath':str(spec),'specSha256':hashlib.sha256(spec.read_bytes()).hexdigest(),'charactersExcludingWhitespace':count,'bodySha256':hashlib.sha256(body.encode()).hexdigest(),'manualSemanticReview':'A1 adopted vs A2 pending independent/NOT_ADOPTED explicit; real lower loss and device/clinical/performance gaps retained; no approval requested'},ensure_ascii=False,indent=2)+'\n');print(count)
