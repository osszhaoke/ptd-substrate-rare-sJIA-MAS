from pathlib import Path
import json,subprocess,sys
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;C=R/'runtime/r31-navigation-candidate01'
swift=(R/'evidence/r31-reference01/run_confirmed.py').read_text().split("swift='''",1)[1].split("'''",1)[0]
def environment(label):
 p=O/('environment-'+label+'.json');assert not p.exists();result=subprocess.run(['swift','-e',swift],check=True,capture_output=True,text=True,timeout=45);data=json.loads(result.stdout);p.write_text(json.dumps(data,indent=2)+'\n');assert data['onConsole']is True and data['screenLocked']is False;return data
before=environment('before02')
with(O/'verification-driver02.log').open('x')as log:code=subprocess.run([sys.executable,'-B','-m','tools.verify_debt','--output','evidence/r31-navigation-verification02'],cwd=C,stdout=log,stderr=subprocess.STDOUT,timeout=1800).returncode
after=environment('after02');(O/'verification-window02.json').write_text(json.dumps({'ok':code==0,'before':before,'after':after,'exit':code,'identity':'complete author fictional verification; not independent/human/physical','freshCompleteWindow':True,'joinedSamples':False},indent=2)+'\n');sys.exit(code)
