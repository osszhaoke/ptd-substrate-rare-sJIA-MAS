import io,json,tempfile,threading,unittest,urllib.request,urllib.error
from unittest.mock import patch
from pathlib import Path
from gateway.server import Server
from gateway.ocr import Configuration,Budget,OcrError,map_google,dimensions
ROOT=Path(__file__).resolve().parents[1]
def config(**changes):
    env={'PTDS_OCR_PROVIDER':'google-vision-sync','PTDS_OCR_REGION':'eu','PTDS_OCR_API_KEY':'synthetic-test-key','PTDS_TRIAL_TOKEN':'synthetic-trial-token-not-real-0000','PTDS_PUBLIC_ORIGIN':'https://trial.invalid','PTDS_OCR_TOTAL_CALLS':'3','PTDS_OCR_SESSION_CALLS':'3','PTDS_OCR_PER_MINUTE':'10','PTDS_OCR_CONCURRENCY':'1','PTDS_OCR_MAX_UNIT_COST':'TEST_ONLY','PTDS_OCR_BUDGET_NOTE':'SYNTHETIC_TEST_NO_PAID_CALLS'}
    env.update({'PTDS_OCR_MAX_UNIT_COST':'1','PTDS_OCR_TOTAL_BUDGET':'3','PTDS_OCR_CURRENCY':'USD'});env.update(changes);return Configuration(env)
class GatewayTests(unittest.TestCase):
    def setUp(self):self.temp=tempfile.TemporaryDirectory();self.calls=[]
    def tearDown(self):self.temp.cleanup()
    def server(self,c):
        def provider(body,c):self.calls.append(body);return map_google({'responses':[{'fullTextAnnotation':{'text':'CRP 3.40 mg/L\nCRP 3.40 mg/L\nunknown'}}]},c.region)
        s=Server(('127.0.0.1',0),ROOT/'web',Path(self.temp.name)/'budget.json',c,provider);threading.Thread(target=s.serve_forever,daemon=True).start();self.addCleanup(s.server_close);self.addCleanup(s.shutdown);return s
    def request(self,s,path,body=None,**headers):
        r=urllib.request.Request('http://127.0.0.1:'+str(s.server_port)+path,body,headers)
        try:
            with urllib.request.urlopen(r,timeout=5)as res:return res.status,res.headers,res.read()
        except urllib.error.HTTPError as e:
            with e:return e.code,e.headers,e.read()
    def test_default_disabled_and_security(self):
        s=self.server(Configuration({}));code,h,b=self.request(s,'/api/ocr/config');self.assertFalse(json.loads(b)['enabled']);self.assertEqual(h['Cache-Control'],'no-store')
        self.assertEqual(self.request(s,'/api/ocr',b'x')[0],503);self.assertEqual(self.request(s,'/../AUTHORIZATION.json')[0],404);self.assertEqual(self.request(s,'/%2e%2e/AUTHORIZATION.json')[0],404)
        code,h,b=self.request(s,'/');self.assertIn("script-src 'self'",h['Content-Security-Policy']);self.assertNotIn(b'synthetic-test-key',b)
    def test_isolation_idempotency_budget_restart(self):
        c=config();s=self.server(c);body=(ROOT/'fixtures/lab.png').read_bytes();headers={'Origin':c.origin,'Authorization':'Bearer '+c.token,'Content-Type':'image/png','X-Request-ID':'request_0001'}
        code,h,b=self.request(s,'/api/ocr',body,**headers);self.assertEqual(code,200);l=json.loads(b)['ledger'];self.assertEqual(len(l['lines']),3);self.assertEqual(l['lines'][0]['text'],l['lines'][1]['text'])
        self.assertEqual(self.request(s,'/api/ocr',body,**headers)[0],409)
        self.assertEqual(self.request(s,'/api/ocr',body,**{**headers,'Origin':'https://other.invalid','X-Request-ID':'request_0002'})[0],403)
        self.assertEqual(self.request(s,'/api/ocr',body,**{**headers,'Authorization':'Bearer wrong','X-Request-ID':'request_0002'})[0],401)
        for i in (2,3):self.assertEqual(self.request(s,'/api/ocr',body,**{**headers,'X-Request-ID':f'request_{i:04}'})[0],200)
        code,h,b=self.request(s,'/api/ocr',body,**{**headers,'X-Request-ID':'request_0004'});self.assertEqual(code,429);self.assertIn(b'GLOBAL_BUDGET_STOP',b);self.assertEqual(len(self.calls),3)
        budget=Budget(Path(self.temp.name)/'budget.json',c)
        with self.assertRaisesRegex(OcrError,'GLOBAL_BUDGET_STOP'):budget.reserve('new_req_0005',c.token,'local')
        saved=(Path(self.temp.name)/'budget.json').read_text();self.assertNotIn('CRP',saved);self.assertNotIn(c.token,saved);self.assertNotIn('PNG',saved)
    def test_media_and_concurrency_and_no_refund(self):
        c=config();budget=Budget(Path(self.temp.name)/'budget.json',c);budget.reserve('request_0001',c.token,'one')
        with self.assertRaisesRegex(OcrError,'OCR_BUSY'):budget.reserve('request_0002',c.token,'one')
        budget.release();budget.reserve('request_0002',c.token,'one');budget.release();self.assertEqual(budget.state['reserved'],2)
        with self.assertRaisesRegex(OcrError,'INVALID_IMAGE'):dimensions(b'not png','image/png')
        with self.assertRaisesRegex(OcrError,'PNG_JPEG_ONLY'):dimensions(b'x','application/pdf')
    def test_rate_limit_and_invalid_provider(self):
        c=config(PTDS_OCR_PER_MINUTE='1');b=Budget(Path(self.temp.name)/'budget.json',c);b.reserve('request_0001',c.token,'one');b.release()
        with self.assertRaisesRegex(OcrError,'RATE_LIMIT'):b.reserve('request_0002',c.token,'one')
        with self.assertRaisesRegex(OcrError,'PROVIDER_REJECTED'):map_google({'responses':[{'error':{'message':'private'}}]},'eu')
    def test_provider_failure_consumes_reservation_and_never_retries(self):
        c=config();s=self.server(c);n=[]
        def fail(*_):n.append(1);raise OcrError('PROVIDER_TIMEOUT',504)
        s.provider=fail;headers={'Origin':c.origin,'Authorization':'Bearer '+c.token,'Content-Type':'image/png','X-Request-ID':'request_0001'}
        self.assertEqual(self.request(s,'/api/ocr',(ROOT/'fixtures/lab.png').read_bytes(),**headers)[0],504);self.assertEqual(n,[1]);self.assertEqual(s.budget.state['reserved'],1);self.assertEqual(s.budget.busy,0)
    def test_budget_io_failure_fails_closed_and_config_rejects_overspend(self):
        c=config();b=Budget(Path(self.temp.name)/'budget.json',c)
        with patch('gateway.ocr.os.replace',side_effect=OSError('synthetic disk error')):
            with self.assertRaisesRegex(OcrError,'BUDGET_UNAVAILABLE'):b.reserve('request_0001',c.token,'one')
        with self.assertRaisesRegex(OcrError,'BUDGET_UNAVAILABLE'):b.reserve('request_0002',c.token,'one')
        self.assertFalse(config(PTDS_OCR_TOTAL_BUDGET='2').enabled)
        self.assertFalse(config(PTDS_OCR_REGION='').enabled)
    def test_jpeg_end_marker_and_trailing_metadata(self):
        import base64
        image=base64.b64decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==')
        self.assertEqual(dimensions(image,'image/jpeg'),(1,1))
        self.assertEqual(dimensions(image+b'fictional-trailing-metadata','image/jpeg'),(1,1))
        fake_end=b'\xff\xd8\xff\xe1\x00\x06AB\xff\xd9'
        for broken in [image[:-2], image[:-3],fake_end,image[:4]+b'\xff\xff'+image[6:]]:
            with self.subTest(length=len(broken)):
                with self.assertRaises(OcrError):dimensions(broken,'image/jpeg')
        c=config();s=self.server(c);body=image+b'fictional-trailing-metadata'
        code,_,_=self.request(s,'/api/ocr',body,Origin=c.origin,Authorization='Bearer '+c.token,**{'Content-Type':'image/jpeg','X-Request-ID':'jpeg_meta_0001'})
        self.assertEqual(code,200);self.assertEqual(self.calls,[body])
        code,_,_=self.request(s,'/api/ocr',fake_end,Origin=c.origin,Authorization='Bearer '+c.token,**{'Content-Type':'image/jpeg','X-Request-ID':'jpeg_bad_0002'})
        self.assertEqual(code,400);self.assertEqual(self.calls,[body]);self.assertEqual(s.budget.state['reserved'],1)
if __name__=='__main__':unittest.main()
