import tempfile,unittest,subprocess,sys
from pathlib import Path
from tools.startup_plan import levels,graph,prepare
class StartupPlanTests(unittest.TestCase):
 def test_direct_script_entry_works_outside_project_directory(self):
  root=Path(__file__).resolve().parents[1]
  with tempfile.TemporaryDirectory()as d:
   result=subprocess.run([sys.executable,'-B',str(root/'tools/build.py'),'--help'],cwd=d,capture_output=True,text=True,timeout=10)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('--prepare',result.stdout)
 def test_dependency_order_and_real_cycle_preserved(self):
  g={'main':{'a','b'},'a':{'b','leaf'},'b':{'a'},'leaf':set()};result=levels(g)
  self.assertEqual(result,[['/leaf'],['/a','/b'],['/main']])
 def test_unknown_or_external_dependency_fails_closed(self):
  with tempfile.TemporaryDirectory()as d:
   root=Path(d);p=root/'a.js';p.write_text("import {x} from './missing.js';")
   with self.assertRaisesRegex(ValueError,'STARTUP_MISSING_IMPORT'):graph(root)
   p.write_text("import x from 'external';")
   with self.assertRaisesRegex(ValueError,'STARTUP_EXTERNAL_IMPORT'):graph(root)
 def test_actual_plan_covers_exact_modules_and_places_dependencies_first(self):
  root=Path(__file__).resolve().parents[1]/'web';g=graph(root);result=levels(g);seen=[p[1:]for row in result for p in row]
  self.assertEqual(set(seen),set(g));self.assertEqual(len(seen),len(g));rank={v:i for i,row in enumerate(result)for v in row}
  for name,deps in g.items():
   for dep in deps:self.assertLessEqual(rank['/'+dep],rank['/'+name])
  self.assertEqual(result[-1],['/app/main.js'])
if __name__=='__main__':unittest.main()
