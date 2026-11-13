import base64,copy,io,json,os,stat,tempfile,threading,unittest,urllib.error,urllib.request
from pathlib import Path
from unittest.mock import patch
from gateway.ocr import Configuration,Budget,OcrError
from gateway.tencent import signed_headers,tencent_sync,map_tencent,MAX_RESPONSE
from gateway.credentials import read_credentials,read_public_config
from gateway.server import Server

ROOT=Path(__file__).resolve().parents[1]
def config(**changes):
    env={'PTDS_OCR_PROVIDER':'tencent-general-accurate','PTDS_OCR_REGION':'ap-guangzhou','PTDS_TENCENT_SECRET_ID':'AKID_SYNTHETIC_TEST','PTDS_TENCENT_SECRET_KEY':'synthetic-secret-not-real','PTDS_TRIAL_TOKEN':'synthetic-group-token-not-real-0000','PTDS_PUBLIC_ORIGIN':'https://trial.invalid','PTDS_OCR_TOTAL_CALLS':'100','PTDS_OCR_SESSION_CALLS':'100','PTDS_OCR_PER_MINUTE':'6','PTDS_OCR_CONCURRENCY':'1','PTDS_OCR_MAX_UNIT_COST':'0.50','PTDS_OCR_TOTAL_BUDGET':'50','PTDS_OCR_CURRENCY':'CNY','PTDS_OCR_BUDGET_NOTE':'USER_A_SYNTHETIC_TEST'}
    env.update(changes);return Configuration(env)
def fixture():
    return {'Response':{'RequestId':'synthetic-provider-request','Angle':0,'TextDetections':[
        {'DetectedText':'CRP +003.400 mg/L','Confidence':98,'Polygon':[{'X':1,'Y':2},{'X':99,'Y':2},{'X':99,'Y':20},{'X':1,'Y':20}]},
        {'DetectedText':'CRP +003.400 mg/L','Confidence':0,'Polygon':[]},
        {'DetectedText':'未匹配原行  literal  000.20'},
        {'DetectedText':''}]}}
class Response(io.BytesIO):
    def __enter__(self):return self
    def __exit__(self,*_):self.close()

class TencentTests(unittest.TestCase):
    def test_tc3_official_canonical_hash_and_independent_node_signature(self):
        # Official 2019-02-25 CVM canonical-request digest 7019a55...; key is our fiction.
        body=json.dumps({'Limit':1,'Filters':[{'Values':['未命名'],'Name':'instance-name'}]}).encode()
        h=signed_headers(body,'AKID_SYNTHETIC_TEST','synthetic-signing-key-not-real','ap-guangzhou',1551113065,host='cvm.tencentcloudapi.com',service='cvm',action='DescribeInstances',version='2017-03-12')
        expected='082506961021fd1e26953fae3ea70537afb9cb0096bdc47d916af7c6735e522d'
        self.assertTrue(h['Authorization'].endswith('Signature='+expected))
        self.assertIn('SignedHeaders=content-type;host;x-tc-action',h['Authorization'])
        self.assertNotEqual(h['Authorization'],signed_headers(body+b' ','AKID_SYNTHETIC_TEST','synthetic-signing-key-not-real','ap-guangzhou',1551113065)['Authorization'])

    def test_full_source_mapping_preserves_order_duplicates_nulls_and_raw(self):
        raw=fixture();ledger=map_tencent(raw,'ap-guangzhou');self.assertEqual(ledger['providerRaw'],raw)
        self.assertEqual(len(ledger['lines']),4);self.assertEqual(ledger['lines'][0]['text'],ledger['lines'][1]['text']);self.assertEqual(ledger['lines'][2]['text'],'未匹配原行  literal  000.20')
        self.assertEqual(ledger['lines'][0]['confidence'],.98);self.assertEqual(ledger['lines'][1]['confidence'],0);self.assertIsNone(ledger['lines'][2]['confidence']);self.assertIsNone(ledger['lines'][0]['page']);self.assertIsNone(ledger['lines'][1]['coordinates'])
        self.assertEqual(ledger['lines'][0]['coordinates'][0],{'x':1,'y':2});self.assertEqual(ledger['rawText'],'\n'.join(r['DetectedText']for r in raw['Response']['TextDetections']))
        for broken in [{}, {'Response':{'Error':{'Message':'private provider error'}}}, {'Response':{'TextDetections':[{'DetectedText':'x','Confidence':101}]}}, {'Response':{'TextDetections':[{'DetectedText':'x','Confidence':True}]}}]:
            with self.assertRaises(OcrError):map_tencent(broken,'ap-guangzhou')

    def test_real_adapter_exact_upload_single_attempt_and_response_limit(self):
        c=config();blob=(ROOT/'fixtures/lab.png').read_bytes();requests=[]
        class Opener:
            def open(self,request,timeout):requests.append((request,timeout));return Response(json.dumps(fixture()).encode())
        with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):ledger=tencent_sync(blob,c)
        self.assertEqual(len(requests),1);request,timeout=requests[0];self.assertEqual(request.full_url,'https://ocr.tencentcloudapi.com/');self.assertEqual(timeout,25)
        payload=json.loads(request.data);self.assertEqual(base64.b64decode(payload['ImageBase64']),blob);self.assertNotIn('ImageUrl',payload);self.assertFalse(payload['IsPdf']);self.assertEqual(ledger['provider'],'tencent-general-accurate')
        self.assertEqual(request.get_header('X-tc-action'),'GeneralAccurateOCR');self.assertEqual(request.get_header('X-tc-region'),'ap-guangzhou');self.assertIn('TC3-HMAC-SHA256',request.get_header('Authorization'))
        class TooBig:
            def open(self,*_,**__):return Response(b'x'*(MAX_RESPONSE+1))
        with patch('gateway.tencent.urllib.request.build_opener',return_value=TooBig()):
            with self.assertRaisesRegex(OcrError,'PROVIDER_RESPONSE_LIMIT'):tencent_sync(blob,c)

    def test_timeout_http_error_and_malformed_response_are_sanitized_no_retry(self):
        blob=(ROOT/'fixtures/lab.png').read_bytes();c=config()
        for error in [TimeoutError('SENSITIVE'),urllib.error.URLError(TimeoutError('SENSITIVE')),urllib.error.HTTPError('https://fake',429,'SENSITIVE',{},io.BytesIO(b'SENSITIVE'))]:
            opener=unittest.mock.Mock();opener.open.side_effect=error
            with patch('gateway.tencent.urllib.request.build_opener',return_value=opener):
                with self.assertRaises(OcrError)as caught:tencent_sync(blob,c)
            self.assertNotIn('SENSITIVE',str(caught.exception));self.assertEqual(opener.open.call_count,1)
        opener=unittest.mock.Mock();opener.open.return_value=Response(b'{not json')
        with patch('gateway.tencent.urllib.request.build_opener',return_value=opener):
            with self.assertRaisesRegex(OcrError,'PROVIDER_SCHEMA'):tencent_sync(blob,c)

    def test_configuration_and_persisted_currency_price_budget_identity(self):
        c=config();self.assertTrue(c.enabled);self.assertEqual(c.max_image_bytes,7*1024*1024);self.assertNotIn(c.secret_key,json.dumps(c.public()))
        for changes in [{'PTDS_TENCENT_SECRET_ID':''},{'PTDS_TENCENT_SECRET_KEY':''},{'PTDS_OCR_REGION':'us'},{'PTDS_OCR_CURRENCY':'USD'},{'PTDS_OCR_TOTAL_BUDGET':'49'},{'PTDS_PUBLIC_ORIGIN':'https://trial.invalid/path'}]:self.assertFalse(config(**changes).enabled)
        with tempfile.TemporaryDirectory()as directory:
            path=Path(directory)/'budget.json';b=Budget(path,c);b.reserve('test_request_0001',c.token,'one');b.release();self.assertEqual(b.state['reservedCost'],'0.50');self.assertEqual(Budget(path,c).state['reserved'],1)
            with self.assertRaisesRegex(OcrError,'BUDGET_CONFIGURATION_OR_SCHEMA_CHANGED'):Budget(path,config(PTDS_OCR_MAX_UNIT_COST='0.40'))
            with self.assertRaisesRegex(OcrError,'BUDGET_CONFIGURATION_OR_SCHEMA_CHANGED'):Budget(path,config(PTDS_OCR_TOTAL_BUDGET='60'))
            path.write_text('{"format":1}')
            with self.assertRaisesRegex(OcrError,'BUDGET_CONFIGURATION_OR_SCHEMA_CHANGED'):Budget(path,c)

    def test_hundred_attempts_fifty_yuan_hard_stop(self):
        c=config()
        with tempfile.TemporaryDirectory()as directory:
            b=Budget(Path(directory)/'budget.json',c)
            with patch('gateway.ocr.time.monotonic',side_effect=[i*11 for i in range(100)]):
                for i in range(100):b.reserve(f'test_request_{i:04}',c.token,'one');b.release()
            with self.assertRaisesRegex(OcrError,'GLOBAL_BUDGET_STOP'):b.reserve('test_request_extra',c.token,'new-ip')
            self.assertEqual(b.state['reservedCost'],'50.00')
            saved=b.path.read_text();self.assertNotIn(c.token,saved);self.assertNotIn(c.secret_key,saved)

    def test_explicit_private_credentials_and_rejected_paths_modes_json(self):
        secrets={'tencentSecretId':'AKID_SYNTHETIC_TEST','tencentSecretKey':'synthetic-key','trialToken':'synthetic-group-token-not-real-0000'}
        with tempfile.TemporaryDirectory()as directory:
            root=Path(directory).resolve();root.chmod(0o700);path=root/'credentials.json';path.write_text(json.dumps(secrets));path.chmod(0o600)
            self.assertEqual(read_credentials(path),secrets)
            c=Configuration({'PTDS_OCR_PROVIDER':'tencent-general-accurate'},read_credentials(path));self.assertFalse(c.enabled)
            with self.assertRaisesRegex(OcrError,'CREDENTIAL_SOURCE_CONFLICT'):Configuration({'PTDS_TRIAL_TOKEN':'old'},secrets)
            path.chmod(0o644)
            with self.assertRaisesRegex(OcrError,'CREDENTIAL_FILE_PERMISSIONS'):read_credentials(path)
            path.chmod(0o600);link=root/'linked.json';link.symlink_to(path)
            with self.assertRaisesRegex(OcrError,'CREDENTIAL_FILE_UNAVAILABLE'):read_credentials(link)
            alias=root/'alias';alias.symlink_to(root,target_is_directory=True)
            with self.assertRaisesRegex(OcrError,'CREDENTIAL_FILE_UNAVAILABLE'):read_credentials(alias/'credentials.json')
            path.write_text('{"trialToken":"x","trialToken":"y"}')
            with self.assertRaisesRegex(OcrError,'CREDENTIAL_FILE_INVALID'):read_credentials(path)
            root.chmod(0o755)
            with self.assertRaisesRegex(OcrError,'CREDENTIAL_DIRECTORY_PERMISSIONS'):read_credentials(path)
            root.chmod(0o700)

    def test_public_config_cannot_carry_secrets(self):
        with tempfile.TemporaryDirectory()as directory:
            p=Path(directory)/'public.json';p.write_text('{"PTDS_OCR_PROVIDER":"tencent-general-accurate"}');self.assertIn('PTDS_OCR_PROVIDER',read_public_config(p))
            p.write_text('{"PTDS_TENCENT_SECRET_KEY":"synthetic"}')
            with self.assertRaisesRegex(OcrError,'PUBLIC_CONFIG_INVALID'):read_public_config(p)

    def test_seven_mib_http_and_provider_boundary_exact_bytes_and_no_charge_on_rejection(self):
        from gateway.tencent import MAX_ENCODED
        c=config();image=(ROOT/'fixtures/lab.png').read_bytes();sent=[]
        class Opener:
            def open(self,request,timeout):
                payload=json.loads(request.data)
                encoded=payload['ImageBase64']
                self_test.assertLessEqual(len(encoded),MAX_ENCODED)
                sent.append(base64.b64decode(encoded))
                return Response(json.dumps(fixture()).encode())
        self_test=self
        with tempfile.TemporaryDirectory() as directory:
            server=Server(('127.0.0.1',0),ROOT/'web',Path(directory)/'budget.json',c)
            thread=threading.Thread(target=server.serve_forever);thread.start()
            try:
                base='http://127.0.0.1:'+str(server.server_port)
                with urllib.request.urlopen(base+'/api/ocr/config') as response:
                    self.assertEqual(json.load(response)['maxImageBytes'],7*1024*1024)
                def upload(size,index):
                    body=image+b'\0'*(size-len(image))
                    request=urllib.request.Request(base+'/api/ocr',body,{'Content-Type':'image/png','Origin':c.origin,'Authorization':'Bearer '+c.token,'X-Request-ID':f'seven_mib_{index}'})
                    try:
                        with urllib.request.urlopen(request,timeout=15) as response:return response.status,json.load(response),body
                    except urllib.error.HTTPError as error:
                        with error:return error.code,json.load(error),body
                with patch('gateway.tencent.urllib.request.build_opener',return_value=Opener()):
                    for index,size in enumerate([2*1024*1024+1,7*1024*1024]):
                        code,result,body=upload(size,index)
                        self.assertEqual(code,200);self.assertEqual(sent[-1],body)
                        self.assertEqual(result['ledger']['provider'],'tencent-general-accurate')
                    code,result,_=upload(7*1024*1024+1,2)
                    self.assertEqual((code,result['error']),(413,'OCR_IMAGE_SIZE'))
                self.assertEqual(len(sent),2);self.assertEqual(server.budget.state['reserved'],2)
                self.assertEqual(server.budget.state['reservedCost'],'1.00')
            finally:server.shutdown();thread.join();server.server_close()

    def test_two_to_seven_mib_upgrade_preserves_spending_deduplication_and_rejects_other_changes(self):
        current=config();old=config();old.policy={**old.policy,'onlineImageBytes':2*1024*1024};old.max_image_bytes=2*1024*1024
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'budget.json';budget=Budget(path,old)
            budget.reserve('legacy_request_0001',old.token,'one');budget.release()
            original=path.read_bytes();upgraded=Budget(path,current)
            self.assertEqual(path.read_bytes(),original) # No reset or write during loading.
            self.assertEqual(upgraded.state['reserved'],1);self.assertEqual(upgraded.state['reservedCost'],'0.50')
            with self.assertRaisesRegex(OcrError,'REQUEST_ALREADY_ATTEMPTED'):upgraded.reserve('legacy_request_0001',current.token,'one')
            upgraded.reserve('new_request_0002',current.token,'one');upgraded.release()
            reopened=Budget(path,current);self.assertEqual(reopened.state['reserved'],2)
            self.assertEqual(reopened.state['reservedCost'],'1.00');self.assertEqual(reopened.state['identity'],reopened.identity)
            with self.assertRaisesRegex(OcrError,'BUDGET_CONFIGURATION_OR_SCHEMA_CHANGED'):Budget(path,old)
            for key,value in [('onlineImageBytes',3*1024*1024),('maxCalls',99),('region','ap-beijing')]:
                data=json.loads(original);data['identity']['policy'][key]=value;path.write_text(json.dumps(data))
                with self.subTest(key=key),self.assertRaisesRegex(OcrError,'BUDGET_CONFIGURATION_OR_SCHEMA_CHANGED'):Budget(path,current)
