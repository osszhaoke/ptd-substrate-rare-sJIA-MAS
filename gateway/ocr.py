"""Synchronous official OCR adapter. Images and OCR text remain in memory only."""
import base64, hashlib, json, os, re, socket, struct, threading, time, urllib.request, urllib.error
from urllib.parse import urlsplit
from decimal import Decimal,InvalidOperation
from pathlib import Path
from .policy import load_policy

MAX_IMAGE=8*1024*1024
MAX_PIXELS=24000000
class OcrError(Exception):
    def __init__(self, code, status=400): self.code,self.status=code,status

def need(ok,code,status=400):
    if not ok: raise OcrError(code,status)

def dimensions(body,mime):
    if mime=='image/png':
        need(len(body)>=24 and body[:8]==b'\x89PNG\r\n\x1a\n' and body[12:16]==b'IHDR','INVALID_IMAGE')
        w,h=struct.unpack('>II',body[16:24])
    elif mime=='image/jpeg':
        need(body[:2]==b'\xff\xd8','INVALID_IMAGE')
        i=2;w=h=0;scan=False;ended=False
        # Walk segments and scan escapes. EOI inside metadata is not an image end.
        # Bytes after an actual EOI are allowed metadata; upload/original bytes stay intact.
        while i<len(body):
            if scan:
                i=body.find(b'\xff',i)
                need(i>=0,'INVALID_IMAGE')
            else:need(body[i]==255,'INVALID_IMAGE')
            while i<len(body) and body[i]==255:i+=1
            need(i<len(body),'INVALID_IMAGE');marker=body[i];i+=1
            if scan and (marker==0 or 0xD0<=marker<=0xD7):continue
            if marker==0xD9:
                need(scan and w>0 and h>0,'INVALID_IMAGE');ended=True;break
            need(marker not in (0,0xD8) and not 0xD0<=marker<=0xD7,'INVALID_IMAGE')
            if marker==0x01:continue
            need(i+2<=len(body),'INVALID_IMAGE');length=int.from_bytes(body[i:i+2],'big')
            need(length>=2 and i+length<=len(body),'INVALID_IMAGE')
            if marker in (0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF):
                need(length>=8 and not w and not h,'INVALID_IMAGE');h,w=struct.unpack('>HH',body[i+3:i+7])
            if marker==0xDA:need(w>0 and h>0 and length>=6,'INVALID_IMAGE')
            i+=length;scan=marker==0xDA
        need(ended,'INVALID_IMAGE')
    else: raise OcrError('PNG_JPEG_ONLY',415)
    need(w>0 and h>0 and w*h<=MAX_PIXELS,'IMAGE_PIXEL_LIMIT',413)
    return w,h

def env_int(env,key,maximum):
    try:v=int(env.get(key,''))
    except ValueError:return None
    return v if 1<=v<=maximum else None

class Configuration:
    def __init__(self,env=None,secrets=None):
        env=os.environ if env is None else env
        if secrets is not None:
            need(not any(env.get(k)for k in ['PTDS_OCR_API_KEY','PTDS_TENCENT_SECRET_ID','PTDS_TENCENT_SECRET_KEY','PTDS_TRIAL_TOKEN']),'CREDENTIAL_SOURCE_CONFLICT',503)
            env={**env,'PTDS_TENCENT_SECRET_ID':secrets['tencentSecretId'],'PTDS_TENCENT_SECRET_KEY':secrets['tencentSecretKey'],'PTDS_TRIAL_TOKEN':secrets['trialToken']}
        self.key=env.get('PTDS_OCR_API_KEY','')
        self.token=env.get('PTDS_TRIAL_TOKEN','')
        self.secret_id=env.get('PTDS_TENCENT_SECRET_ID','')
        self.secret_key=env.get('PTDS_TENCENT_SECRET_KEY','')
        self.origin=env.get('PTDS_PUBLIC_ORIGIN','')
        self.provider=env.get('PTDS_OCR_PROVIDER','')
        self.region=env.get('PTDS_OCR_REGION','')
        self.total=env_int(env,'PTDS_OCR_TOTAL_CALLS',10000)
        self.per_session=env_int(env,'PTDS_OCR_SESSION_CALLS',10000)
        self.per_minute=env_int(env,'PTDS_OCR_PER_MINUTE',100)
        self.concurrency=env_int(env,'PTDS_OCR_CONCURRENCY',4)
        self.unit_cost=env.get('PTDS_OCR_MAX_UNIT_COST','')
        self.budget=env.get('PTDS_OCR_BUDGET_NOTE','')
        self.currency=env.get('PTDS_OCR_CURRENCY','')
        self.unit_price=Decimal('0');self.max_budget=Decimal('0')
        self.policy=None;self.max_image_bytes=MAX_IMAGE
        if self.provider=='tencent-general-accurate':
            try:self.policy=load_policy(Path(__file__).resolve().parents[1]/'deploy/TRIAL_POLICY.json')
            except ValueError:raise OcrError('TRIAL_POLICY_INVALID',503)from None
            self.max_image_bytes=self.policy['onlineImageBytes']
        try:
            unit=Decimal(self.unit_cost);budget=Decimal(env.get('PTDS_OCR_TOTAL_BUDGET',''))
            self.unit_price=unit;self.max_budget=budget
            cost_valid=unit.is_finite()and budget.is_finite()and unit>0 and budget>0 and bool(self.total)and unit*self.total<=budget and bool(re.fullmatch('[A-Z]{3}',self.currency))
        except (InvalidOperation,ValueError):cost_valid=False
        # Explicit deployment/operator decisions are required; no billable engineering defaults.
        def secret(v):return type(v)is str and 0<len(v)<=512 and v.isascii() and not any(c.isspace()for c in v)
        google=self.provider=='google-vision-sync'and self.region in ('us','eu')and secret(self.key)
        tencent=self.policy is not None and self.region==self.policy['region']and self.currency==self.policy['currency']and secret(self.secret_id)and secret(self.secret_key)
        if tencent:
            tencent=bool(cost_valid and self.total<=self.policy['maxCalls']and self.per_session and self.per_session<=self.policy['maxCalls']and self.per_minute and self.per_minute<=self.policy['maxPerMinute']and self.concurrency and self.concurrency<=self.policy['maxConcurrent']and self.max_budget<=Decimal(self.policy['maxBudget'])and self.unit_price>=Decimal(self.policy['minReservedUnitCost']))
        try:
            origin=urlsplit(self.origin)
            valid_origin=origin.scheme=='https'and bool(origin.hostname)and not origin.username and not origin.password and not origin.path and not origin.query and not origin.fragment and (origin.port is None or 1<=origin.port<=65535)
        except ValueError:valid_origin=False
        self.enabled=bool((google or tencent)and secret(self.token)and len(self.token)>=32 and valid_origin and all([self.total,self.per_session,self.per_minute,self.concurrency])and cost_valid and self.budget)
    def public(self):
        if not self.enabled:
            return {'enabled':False,'provider':None,'region':None,'maxImageBytes':self.max_image_bytes,'disclosure':'在线OCR尚未配置；当前不会上传图片，可手工核对与保存。'}
        provider='腾讯云通用文字识别（高精度版）'if self.provider=='tencent-general-accurate'else'Google Cloud Vision同步OCR'
        region_text='大陆请求地域参数（不代表已核实仅在广州处理）'if self.provider=='tencent-general-accurate'else'请求区域'
        return {'enabled':True,'provider':self.provider,'region':self.region,'maxImageBytes':self.max_image_bytes,
                'disclosure':f'本次图片经本网关发送至{provider}，{region_text}：{self.region}。图片离开设备；本网关不持久保存图片或识别正文。服务商及平台仍可能留存请求元数据。'}

class Budget:
    """One process owner; atomic, fsynced reservation before every paid call. No refunds/retries."""
    def __init__(self,path,config):
        self.path=Path(path);self.config=config;self.lock=threading.Lock();self.rate={};self.busy=0;self.poisoned=False
        self.path.parent.mkdir(parents=True,exist_ok=True)
        self.identity={'provider':config.provider,'region':config.region,'currency':config.currency,'unitCost':str(config.unit_price),'maxBudget':str(config.max_budget),'maxCalls':config.total,'policy':config.policy}
        self.state={'format':2,'identity':self.identity,'reserved':0,'reservedCost':'0','requests':[],'sessions':{}}
        if self.path.exists():
            try:
                self.state=json.loads(self.path.read_text())
                legacy_identity=None
                if config.provider=='tencent-general-accurate' and config.policy and config.policy['onlineImageBytes']==7*1024*1024:
                    # Only the approved 2 -> 7 MiB upload change is compatible.
                    # Calls, costs, request IDs and every other policy field stay pinned.
                    legacy_identity={**self.identity,'policy':{**config.policy,'onlineImageBytes':2*1024*1024}}
                need(self.state['format']==2 and (self.state['identity']==self.identity or legacy_identity is not None and self.state['identity']==legacy_identity),'BUDGET_CONFIGURATION_OR_SCHEMA_CHANGED',503)
                need(Decimal(self.state['reservedCost'])==self.state['reserved']*config.unit_price,'BUDGET_CORRUPT',503)
                need( isinstance(self.state['reserved'],int) and self.state['reserved']==len(self.state['requests']) and len(self.state['requests'])<=10000 and sum(self.state['sessions'].values())==self.state['reserved'],'BUDGET_CORRUPT',503)
                need(len(set(self.state['requests']))==len(self.state['requests'])and all(isinstance(v,str)and re.fullmatch('[a-f0-9]{64}',v)for v in self.state['requests'])and all(re.fullmatch('[a-f0-9]{64}',k)and type(v)is int and v>0 for k,v in self.state['sessions'].items()),'BUDGET_CORRUPT',503)
                self.state['identity']=self.identity # Next reservation persists the new identity atomically.
            except (ValueError,KeyError,TypeError,InvalidOperation):raise OcrError('BUDGET_CORRUPT',503)
    def reserve(self,request_id,session,ip):
        with self.lock:
            need(not self.poisoned,'BUDGET_UNAVAILABLE',503)
            now=time.monotonic();self.rate={k:v for k,v in self.rate.items() if v[1]>now-60}
            need(ip in self.rate or len(self.rate)<1024,'RATE_CAPACITY',429)
            n,at=self.rate.get(ip,(0,now));need(n<self.config.per_minute,'RATE_LIMIT',429)
            req_hash=hashlib.sha256(request_id.encode()).hexdigest();sess_hash=hashlib.sha256(session.encode()).hexdigest()
            need(req_hash not in self.state['requests'],'REQUEST_ALREADY_ATTEMPTED',409)
            need(self.state['reserved']<self.config.total,'GLOBAL_BUDGET_STOP',429)
            next_cost=Decimal(self.state['reservedCost'])+self.config.unit_price
            need(next_cost<=self.config.max_budget,'GLOBAL_COST_STOP',429)
            need(self.state['sessions'].get(sess_hash,0)<self.config.per_session,'SESSION_BUDGET_STOP',429)
            need(self.busy<self.config.concurrency,'OCR_BUSY',429)
            state={**self.state,'requests':self.state['requests']+[req_hash],'sessions':dict(self.state['sessions']),'reserved':self.state['reserved']+1}
            state['reservedCost']=str(next_cost)
            state['sessions'][sess_hash]=state['sessions'].get(sess_hash,0)+1
            temp=self.path.with_suffix('.pending')
            try:
                with open(temp,'w',encoding='utf-8')as f:os.chmod(temp,0o600);json.dump(state,f);f.flush();os.fsync(f.fileno())
                os.replace(temp,self.path)
                fd=os.open(str(self.path.parent),os.O_RDONLY)
                try:os.fsync(fd)
                finally:os.close(fd)
            except OSError:self.poisoned=True;raise OcrError('BUDGET_UNAVAILABLE',503)
            self.state=state;self.rate[ip]=(n+1,at);self.busy+=1
    def release(self):
        with self.lock:self.busy-=1

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise OcrError('PROVIDER_REDIRECT_REJECTED',502)

def google_sync(body,config):
    endpoint=f'https://{config.region}-vision.googleapis.com/v1/images:annotate'
    data=json.dumps({'requests':[{'image':{'content':base64.b64encode(body).decode()},'features':[{'type':'DOCUMENT_TEXT_DETECTION'}]}]}).encode()
    req=urllib.request.Request(endpoint,data,{'Content-Type':'application/json','X-Goog-Api-Key':config.key},method='POST')
    try:
        with urllib.request.build_opener(NoRedirect).open(req,timeout=25)as r:
            data=r.read(8*1024*1024+1);need(len(data)<=8*1024*1024,'PROVIDER_RESPONSE_LIMIT',502);result=json.loads(data)
    except (TimeoutError,socket.timeout):raise OcrError('PROVIDER_TIMEOUT',504)
    except (urllib.error.URLError,ValueError):raise OcrError('PROVIDER_UNAVAILABLE',502)
    return map_google(result,config.region)

def map_google(result,region):
    need(isinstance(result,dict) and isinstance(result.get('responses'),list) and len(result['responses'])==1,'PROVIDER_SCHEMA',502)
    response=result['responses'][0];need('error' not in response,'PROVIDER_REJECTED',502)
    lines=[]
    annotation=response.get('fullTextAnnotation',{})
    def append(parts,page,coords=None,confidence=None):
        need(len(lines)<20000,'PROVIDER_LINE_LIMIT',502)
        lines.append({'id':f'ocrline_{len(lines):08d}','order':len(lines),'text':parts,'page':page,'coordinates':coords,'confidence':confidence})
    # Preserve provider word/symbol hierarchy verbatim as well as explicit break-based lines.
    for page_index,page in enumerate(annotation.get('pages',[]),1):
        for block in page.get('blocks',[]):
            for paragraph in block.get('paragraphs',[]):
                current='';vertices=[];conf=[]
                for word in paragraph.get('words',[]):
                    vertices+=word.get('boundingBox',{}).get('vertices',[])
                    if 'confidence'in word:conf.append(word['confidence'])
                    for symbol in word.get('symbols',[]):
                        current+=symbol.get('text','');br=symbol.get('property',{}).get('detectedBreak',{}).get('type')
                        if br in ('SPACE','SURE_SPACE'):current+=' '
                        elif br in ('EOL_SURE_SPACE','LINE_BREAK','HYPHEN'):
                            if br=='HYPHEN':current+='-'
                            coords=None
                            if vertices:
                                xs=[v.get('x',0)for v in vertices];ys=[v.get('y',0)for v in vertices];coords=[{'x':min(xs),'y':min(ys)},{'x':max(xs),'y':min(ys)},{'x':max(xs),'y':max(ys)},{'x':min(xs),'y':max(ys)}]
                            append(current,page_index,coords,sum(conf)/len(conf)if conf else None);current='';vertices=[];conf=[]
                if current:append(current,page_index,None,sum(conf)/len(conf)if conf else None)
    raw=annotation.get('text',response.get('textAnnotations',[{}])[0].get('description','') if response.get('textAnnotations') else '')
    if not lines:
        for line in raw.splitlines():append(line,None)
    need(isinstance(raw,str) and len(raw)<=2000000,'PROVIDER_TEXT_LIMIT',502)
    return {'version':'ocr-ledger/1','provider':'google-vision-sync','region':region,'rawText':raw,'lines':lines,'providerRaw':response,'mapping':'symbol-breaks/1; line-confidence=mean-word-confidence; null=unavailable'}
