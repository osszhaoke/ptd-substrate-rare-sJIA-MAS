import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from tools.phone_acceptance import build, verify


class PhoneBundleTests(unittest.TestCase):
    def test_deterministic_exact_bundle_and_no_product_entry(self):
        with tempfile.TemporaryDirectory() as temporary:
            first, second = [Path(temporary)/name for name in ['first','second']]
            a, b = build(first), build(second)
            self.assertEqual(a['zipSha256'], b['zipSha256'])
            self.assertFalse(a['servicesStarted'])
            manifest = verify(first/'site')
            self.assertEqual(manifest['treeSha256'], a['treeSha256'])
            with zipfile.ZipFile(first/'PTDS-H5-phone-r19.zip') as archive:
                self.assertEqual(len(archive.namelist()), len(set(archive.namelist())))
                self.assertNotIn('app/main.js', archive.namelist())
                self.assertIn('shared/observe.js', archive.namelist())
                self.assertNotIn('gateway/server.py', archive.namelist())
                for name in archive.namelist():
                    self.assertEqual(archive.read(name), (first/'site'/name).read_bytes())
            with self.assertRaisesRegex(ValueError, 'OUTPUT_EXISTS'):
                build(first)

    def test_missing_added_or_changed_files_rejected(self):
        for change in ['missing','added','changed']:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as temporary:
                site=Path(build(Path(temporary)/'bundle')['site'])
                if change=='missing': (site/'phone.js').unlink()
                elif change=='added': (site/'unapproved.js').write_text('new')
                else: (site/'phone.js').write_text('changed')
                with self.assertRaisesRegex(ValueError, 'MISMATCH'):
                    verify(site)
