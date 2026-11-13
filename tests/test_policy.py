import copy, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
from gateway.policy import load_policy
from gateway.ocr import Configuration, OcrError

class PolicyTests(unittest.TestCase):
    def test_pinned_and_invalid(self):
        original=json.loads(Path('deploy/TRIAL_POLICY.json').read_text())
        self.assertEqual(load_policy('deploy/TRIAL_POLICY.json'),original)
        invalid=[None,[],1,{},dict(original,extra=1)]
        for k in original:
            p=copy.deepcopy(original);p.pop(k);invalid.append(p)
            invalid.append(dict(original,**{k:True}))
        for k in ['maxCalls','maxConcurrent','maxPerMinute','onlineImageBytes']:
            for v in [0,-1,'1',1.5,10**20,None]:invalid.append(dict(original,**{k:v}))
        for k in ['maxBudget','minReservedUnitCost']:
            for v in ['NaN','Infinity','-1','0',50,None,'bad','1e1000000']:invalid.append(dict(original,**{k:v}))
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'policy.json'
            for value in invalid:
                p.write_text(json.dumps(value))
                with self.subTest(value=value), self.assertRaisesRegex(ValueError,'TRIAL_POLICY_INVALID'):load_policy(p)
            for raw in ['{','NaN','{"x":Infinity}','{"maxCalls":100,"maxCalls":1}']:
                p.write_text(raw)
                with self.assertRaisesRegex(ValueError,'TRIAL_POLICY_INVALID'):load_policy(p)
            p.unlink()
            with self.assertRaisesRegex(ValueError,'TRIAL_POLICY_INVALID'):load_policy(p)
    def test_configuration_structured_failure(self):
        with patch('gateway.ocr.load_policy',side_effect=ValueError('TRIAL_POLICY_INVALID')):
            with self.assertRaises(OcrError) as error:Configuration({'PTDS_OCR_PROVIDER':'tencent-general-accurate'})
            self.assertEqual((error.exception.code,error.exception.status),('TRIAL_POLICY_INVALID',503))

    def test_image_limit_accepts_seven_mib_without_relaxing_other_trial_limits(self):
        original=json.loads(Path('deploy/TRIAL_POLICY.json').read_text())
        self.assertEqual(original['onlineImageBytes'],7*1024*1024)
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'policy.json'
            for size in [2*1024*1024,7*1024*1024]:
                path.write_text(json.dumps(dict(original,onlineImageBytes=size)))
                self.assertEqual(load_policy(path)['onlineImageBytes'],size)
            for key,value in [('onlineImageBytes',7*1024*1024+1),('maxCalls',101),('maxConcurrent',2),('maxPerMinute',7),('maxBudget','51')]:
                path.write_text(json.dumps(dict(original,**{key:value})))
                with self.subTest(key=key), self.assertRaisesRegex(ValueError,'TRIAL_POLICY_INVALID'):load_policy(path)
