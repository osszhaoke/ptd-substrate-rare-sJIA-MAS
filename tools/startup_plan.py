"""Build-time same-origin ES module graph. No source rewriting or dependency installation."""
import json,re,posixpath
from pathlib import Path
EXCLUDED={'sw.js','app/startup.js','app/startup_task.js','app/startup_plan.js'}
SPECIFIER=re.compile(r'''(?:\bimport\s+(?:[^;'"\n]*?\s+from\s*)?|\bexport\s+[^;'"\n]*?\s+from\s*)['"]([^'"]+)['"]''')
def graph(web):
 files={p.relative_to(web).as_posix():p for p in web.rglob('*.js') if p.relative_to(web).as_posix()not in EXCLUDED}
 out={}
 for name,p in files.items():
  deps=set()
  for target in SPECIFIER.findall(p.read_text()):
   if not target.startswith('.'):raise ValueError('STARTUP_EXTERNAL_IMPORT '+name)
   dep=posixpath.normpath(posixpath.join(posixpath.dirname(name),target))
   if dep not in files:raise ValueError('STARTUP_MISSING_IMPORT '+name+' '+dep)
   deps.add(dep)
  out[name]=deps
 return out
def levels(g):
 indices={};low={};stack=[];active=set();components=[]
 def visit(v):
  indices[v]=low[v]=len(indices);stack.append(v);active.add(v)
  for w in sorted(g[v]):
   if w not in indices:visit(w);low[v]=min(low[v],low[w])
   elif w in active:low[v]=min(low[v],indices[w])
  if low[v]==indices[v]:
   comp=[]
   while True:
    w=stack.pop();active.remove(w);comp.append(w)
    if w==v:break
   if len(comp)>4:raise ValueError('STARTUP_CYCLE_TOO_LARGE')
   components.append(sorted(comp))
 for v in sorted(g):
  if v not in indices:visit(v)
 owner={v:i for i,c in enumerate(components)for v in c}
 deps={i:{owner[d]for v in c for d in g[v]if owner[d]!=i}for i,c in enumerate(components)}
 done=set();out=[]
 while len(done)<len(components):
  ready=[i for i in range(len(components))if i not in done and deps[i]<=done]
  if not ready:raise ValueError('STARTUP_GRAPH_INVALID')
  out.append(sorted('/'+v for i in ready for v in components[i]));done.update(ready)
 return out
def prepare(web):
 plan=levels(graph(web));target=web/'app/startup_plan.js'
 target.write_text('// Generated from exact static imports; dependencies precede dependents.\nexport const STARTUP_LEVELS='+json.dumps(plan,separators=(',',':'))+';\n')
 return plan
