import json,tempfile,unittest
from pathlib import Path
from tools.verify_debt import fingerprint,require_verification

class BuildGateTests(unittest.TestCase):
    def fixture(self,root):
        for name in ['web','gateway','tests','tools','deploy','fixtures']:(root/name).mkdir()
        (root/'fixtures/lab.png').write_bytes((Path(__file__).resolve().parents[1]/'fixtures/lab.png').read_bytes())
        (root/'web/a.js').write_text('export const version=1;')
        (root/'tools/test_plan.json').write_text(json.dumps({'debtVerification':{'requiredChecks':['regression']}}))
        proof=root/'proof.json';proof.write_text(json.dumps({'ok':True,'identity':'author fictional automated verification','binding':fingerprint(root),'checks':{'regression':'PASS'}}));return proof
    def test_missing_evidence_cannot_build(self):
        with tempfile.TemporaryDirectory()as d:
            root=Path(d);self.fixture(root)
            with self.assertRaisesRegex(ValueError,'VERIFICATION_REQUIRED'):require_verification(root,root/'absent.json')
    def test_current_proof_accepted_and_every_changed_byte_invalidates(self):
        with tempfile.TemporaryDirectory()as d:
            root=Path(d);proof=self.fixture(root);self.assertTrue(require_verification(root,proof)['ok'])
            (root/'web/a.js').write_text('export const version=2;')
            with self.assertRaisesRegex(ValueError,'STALE'):require_verification(root,proof)
    def test_added_or_missing_file_cannot_silently_pass(self):
        for operation in ['add','remove']:
            with self.subTest(operation=operation),tempfile.TemporaryDirectory()as d:
                root=Path(d);proof=self.fixture(root)
                if operation=='add':(root/'web/b.js').write_text('new')
                else:(root/'web/a.js').unlink()
                with self.assertRaisesRegex(ValueError,'STALE'):require_verification(root,proof)
    def test_missing_failed_or_wrong_hash_results_rejected(self):
        for change in ['missing','failed','hash','not-ok']:
            with self.subTest(change=change),tempfile.TemporaryDirectory()as d:
                root=Path(d);path=self.fixture(root);p=json.loads(path.read_text())
                if change=='missing':p['checks']={}
                elif change=='failed':p['checks']['regression']='FAIL'
                elif change=='hash':p['binding']['files']['web/a.js']='0'*64
                else:p['ok']=False
                path.write_text(json.dumps(p))
                with self.assertRaises(ValueError):require_verification(root,path)

    def test_unspecified_proof_never_loads_an_old_default(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);self.fixture(root)
            with self.assertRaisesRegex(ValueError,'EXPLICIT_CURRENT_EVIDENCE'):
                require_verification(root)

    def test_actual_image_input_change_or_removal_rejects_previous_proof(self):
        for operation in ['change','remove']:
            with self.subTest(operation=operation),tempfile.TemporaryDirectory() as d:
                root=Path(d);proof=self.fixture(root);image=root/'fixtures/lab.png';original=image.read_bytes()
                self.assertTrue(require_verification(root,proof)['ok'])
                if operation=='change':image.write_bytes(original[:-1]+bytes([original[-1]^1]))
                else:image.unlink()
                with self.assertRaisesRegex(ValueError,'VERIFICATION_STALE_OR_MISSING_FILES'):
                    require_verification(root,proof)
                image.write_bytes(original)
                self.assertTrue(require_verification(root,proof)['ok'])

    def test_current_acceptance_index_rejects_stale_alias_counts_and_binding_and_preserves_history(self):
        from tools.acceptance_index import FIELDS,validate_index,refresh_index
        expected={'author':'PASS_61_CHECKS_130_NODE_55_PYTHON','currentProof':'evidence/current/result.json','verificationEvidence':'evidence/current/result.json','verificationBinding':'a'*64,'checks':61,'nodeTests':130,'pythonTests':55}
        current=dict(expected,staticPatch={'verification':expected['currentProof'],'binding':expected['verificationBinding']},human='PENDING',clinicalExpert='PENDING')
        self.assertTrue(validate_index(current,expected))
        for key in FIELDS:
            with self.subTest(key=key):
                bad=dict(current);bad[key]='stale'
                with self.assertRaisesRegex(ValueError,'CURRENT_ACCEPTANCE_MISMATCH'):validate_index(bad,expected)
                repaired=refresh_index(bad,expected);self.assertTrue(validate_index(repaired,expected));self.assertEqual(repaired['previousDefaultIndexes'][-1][key],'stale');self.assertEqual(repaired['human'],'PENDING');self.assertEqual(refresh_index(repaired,expected),repaired)
        for key in ['verification','binding']:
            bad=dict(current,staticPatch=dict(current['staticPatch']));bad['staticPatch'][key]='stale'
            with self.assertRaisesRegex(ValueError,'PATCH_MISMATCH'):validate_index(bad,expected)
