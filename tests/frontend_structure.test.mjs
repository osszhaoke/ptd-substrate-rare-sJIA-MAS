import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('linked layout sheets reconstruct the accepted R17 cascade byte for byte',()=>{
 const root=new URL('../web/',import.meta.url),html=readFileSync(new URL('index.html',root),'utf8');
 const allSheets=[...html.matchAll(/<link rel="stylesheet" href="\/([^"]+)">/g)].map(match=>match[1]);
 assert.equal(allSheets.filter(s=>s==='features/metrics.css').length,1);
 const sheets=allSheets.filter(s=>s!=='features/metrics.css');
 assert.deepEqual(sheets.slice(-3),['typography.css','features/home_resources.css','features/ocr_review.css']);
 const original=Buffer.concat(sheets.slice(0,-3).map(path=>readFileSync(new URL(path,root))));
 assert.equal(createHash('sha256').update(original).digest('hex'),
  'e3d109c888d85e3ba642c21ef1dae4243e2dfe15dae85fd609e85bb344cf9d77');
});
