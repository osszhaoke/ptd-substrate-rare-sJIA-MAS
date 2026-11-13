import test from 'node:test';
import assert from 'node:assert/strict';
import {editor} from '../web/features/editor.js';

const render=config=>editor({zone:'Asia/Shanghai',config});
test('public mode has no visible trial code but retains upload consent and confirmation',()=>{
 const html=render({enabled:true,publicTrial:true});
 assert.match(html, /id="trial-token" type="hidden" value="public-24h"/);
 assert.doesNotMatch(html,/识别试用码|由提供者给出/);
 assert.match(html,/id="upload-consent"/);
 assert.match(html,/id="confirmed" type="checkbox" disabled/);
});
test('existing private mode retains its original code input',()=>{
 const html=render({enabled:true});
 assert.match(html,/识别试用码/);
 assert.match(html,/id="trial-token" type="password"/);
});
test('no credentials means explicitly manual mode',()=>{
 const html=render({enabled:false,publicTrial:false});
 assert.match(html,/在线识别暂未开通，可直接手填/);
 assert.doesNotMatch(html,/id="trial-token"/);
});
