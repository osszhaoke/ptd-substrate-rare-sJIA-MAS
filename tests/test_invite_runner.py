import contextlib,hashlib,io,json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from deploy import invite_runner as runner
from gateway.ocr import Budget

class InviteRunnerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.home=Path(self.tmp.name).resolve()
  base=self.home/'.ptds';base.mkdir(mode=0o755);base.chmod(0o755)
  for p in (base/'runtime',base/'runtime/h5-r02'):p.mkdir(mode=0o700)
  self.runtime=base/'runtime/h5-r02';(self.runtime/'gateway.lock').touch(mode=0o600)
  self.config=runner.make_configuration('SYNTHETIC_ID','SYNTHETIC_KEY','fictional-invite-trial-token-0000000000')
  b=Budget(self.runtime/'ocr-budget-v2.json',self.config);b.reserve('fictional-first-local-attempt','fictional-session','127.0.0.1');b.release()
 def test_existing_ledger_is_kept_and_0755_shared_parent_is_not_chmodded(self):
  before=(self.runtime/'ocr-budget-v2.json').read_bytes()
  with runner.runtime_lease(self.home) as runtime:
   self.assertEqual(runtime,self.runtime)
   self.assertEqual(Budget(runtime/'ocr-budget-v2.json',self.config).state['reserved'],1)
  self.assertEqual(before,(self.runtime/'ocr-budget-v2.json').read_bytes())
  self.assertEqual((self.home/'.ptds').stat().st_mode&0o777,0o755)
 def test_missing_ledger_is_not_recreated(self):
  p=self.runtime/'ocr-budget-v2.json';p.unlink()
  with self.assertRaises(FileNotFoundError):
   with runner.runtime_lease(self.home):self.fail('missing ledger accepted')
  self.assertFalse(p.exists())
 def test_concurrent_owner_and_pending_or_linked_ledger_rejected(self):
  with runner.runtime_lease(self.home):
   with self.assertRaisesRegex(runner.SetupError,'BUDGET_ALREADY_OWNED'):
    with runner.runtime_lease(self.home):self.fail('second owner')
  pending=self.runtime/'ocr-budget-v2.pending';pending.write_text('fake');pending.chmod(0o600)
  with self.assertRaisesRegex(runner.SetupError,'PENDING_LEDGER'):
   with runner.runtime_lease(self.home):self.fail('pending accepted')
  pending.unlink();ledger=self.runtime/'ocr-budget-v2.json';target=self.home/'outside';target.write_bytes(ledger.read_bytes());target.chmod(0o600);ledger.unlink();ledger.symlink_to(target)
  with self.assertRaisesRegex(runner.SetupError,'RUNTIME_FILE_UNSAFE'):
   with runner.runtime_lease(self.home):self.fail('symlink followed')
 def test_connector_token_is_not_in_argv_and_inherited_credentials_are_excluded(self):
  token='SYNTHETIC_TUNNEL_TOKEN_'+'x'*80
  with patch.dict(os.environ,{'TUNNEL_CRED_FILE':'DO_NOT_READ','TUNNEL_LOGLEVEL':'debug','PTDS_TENCENT_SECRET_KEY':'DO_NOT_READ'}):
   command,env=runner.connector_command('/fictional/cloudflared',token)
  self.assertNotIn(token,' '.join(command));self.assertEqual(set(env),{'PATH','TUNNEL_TOKEN'})
  self.assertEqual(env['TUNNEL_TOKEN'],token);self.assertIn('/dev/null',command);self.assertIn('error',command);self.assertIn('--no-autoupdate',command)
  for bad in ['short','cloudflared tunnel run --token '+token]:
   with self.assertRaises(runner.SetupError):runner.connector_command('/fake',bad)
 def test_child_only_cleanup_terminates_then_kills_if_needed(self):
  class Child:
   def __init__(self):self.events=[]
   def poll(self):return None
   def terminate(self):self.events.append('terminate')
   def wait(self,timeout):self.events.append(('wait',timeout));return 0
  c=Child();runner.stop_child(c);self.assertEqual(c.events,['terminate',('wait',10)])
 def test_no_tty_no_runtime_or_secret_read(self):
  with patch.object(runner.sys,'stdin',io.StringIO()),patch.object(runner,'runtime_lease',side_effect=AssertionError('no runtime read')),patch.object(runner.getpass,'getpass',side_effect=AssertionError('no prompt')),contextlib.redirect_stdout(io.StringIO()):
   self.assertEqual(runner.main(['--start']),2)
 def test_product_manifest_requires_every_current_exposed_file_and_exact_bytes(self):
  root=self.home/'product';root.mkdir()
  entries=[]
  for folder in ('web','gateway','deploy'):
   (root/folder).mkdir();p=root/folder/'sample.js';p.write_bytes(b'fictional')
   entries.append({'path':str(p.relative_to(root)),'bytes':9,'sha256':hashlib.sha256(b'fictional').hexdigest()})
  manifest=root/'SOURCE_MANIFEST.json';proof={'version':'h5-sjia-mas-r19','files':entries};manifest.write_text(json.dumps(proof));runner.verify_product(root)
  (root/'web/added.js').write_text('new')
  with self.assertRaisesRegex(runner.SetupError,'MISSING_FILES'):runner.verify_product(root)
  (root/'web/added.js').unlink();(root/'web/sample.js').write_text('changed')
  with self.assertRaisesRegex(runner.SetupError,'BYTES_CHANGED'):runner.verify_product(root)
 def test_local_server_binds_loopback_existing_budget_and_closes_after_connector_exit(self):
  captures=[]
  class Child:
   def poll(self):return 1
  def popen(command,**kw):captures.append((command,kw));return Child()
  before=(self.runtime/'ocr-budget-v2.json').read_bytes()
  with patch.object(runner,'PORT',0),patch.object(runner.subprocess,'Popen',side_effect=popen),contextlib.redirect_stdout(io.StringIO()):
   with self.assertRaisesRegex(runner.SetupError,'TUNNEL_EXITED'):
    with runner.runtime_lease(self.home) as runtime:runner.serve(self.config,runtime,'FAKE_TOKEN_'+'x'*100,'/fake/cloudflared')
  self.assertEqual(len(captures),1);self.assertEqual(before,(self.runtime/'ocr-budget-v2.json').read_bytes())
  self.assertEqual(captures[0][1]['stderr'],runner.subprocess.DEVNULL)
