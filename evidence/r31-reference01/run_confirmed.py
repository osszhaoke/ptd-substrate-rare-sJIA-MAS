from pathlib import Path
import hashlib,json,subprocess,sys
R=Path(__file__).resolve().parents[2];C=R/'runtime/r31-reference-candidate01';O=Path(__file__).resolve().parent
swift='''import CoreGraphics; import Foundation
let d = CGSessionCopyCurrentDictionary() as? [String: Any] ?? [:]
let on = d[kCGSessionOnConsoleKey as String] as? Bool
let locked = d["CGSSessionScreenIsLocked"] as? Bool
let out: [String: Any] = ["onConsole": on as Any? ?? NSNull(), "screenLocked": locked ?? false, "screenLockedKeyPresent": locked != nil, "lockInterpretation": "CGSSessionScreenIsLocked absent or false means unlocked; no account fields collected"]
print(String(data: try! JSONSerialization.data(withJSONObject: out, options: [.sortedKeys]), encoding: .utf8)!)
'''
def environment(label):
 path=O/('environment-'+label+'.json');assert not path.exists();p=subprocess.run(['swift','-e',swift],check=True,capture_output=True,text=True,timeout=45);data=json.loads(p.stdout);path.write_text(json.dumps(data,indent=2)+'\n');assert data['onConsole']is True and data['screenLocked']is False,'GUI_ENVIRONMENT_BLOCKED';return data
before=environment('before02')
with (O/'verification02-driver.log').open('x')as log:
 code=subprocess.run([sys.executable,'-B','-m','tools.verify_debt','--output','evidence/r31-verification02'],cwd=C,stdout=log,stderr=subprocess.STDOUT).returncode
post=environment('after02');record={'ok':code==0,'commandExit':code,'before':before,'after':post,'firstWindow':'r31-verification01 passed61 but independent pre-window GUI snapshot NOT_CAPTURED; retained, not sole environment-qualified acceptance','secondWindow':'complete fresh profiles and samples; no joining across windows','sourceChanged':False,'firstProofSha256':hashlib.sha256((C/'evidence/r31-verification01/result.json').read_bytes()).hexdigest()};(O/'verification-windows.json').write_text(json.dumps(record,indent=2)+'\n');sys.exit(code)
