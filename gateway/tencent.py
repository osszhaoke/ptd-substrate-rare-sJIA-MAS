"""Tencent GeneralAccurateOCR, signed TC3-HMAC-SHA256. Standard library only."""
import base64,hashlib,hmac,json,math,socket,time,urllib.error,urllib.request
from datetime import datetime,timezone
from .ocr import OcrError,need,NoRedirect

HOST='ocr.tencentcloudapi.com'
ACTION='GeneralAccurateOCR'
VERSION='2018-11-19'
MAX_ENCODED=10000000  # Conservative decimal 10M, as documented by the provider.
MAX_RESPONSE=8*1024*1024

def signed_headers(payload,secret_id,secret_key,region,timestamp=None,*,host=HOST,service='ocr',action=ACTION,version=VERSION):
    """Sign the exact outgoing bytes. Public official TC3 vector tested separately."""
    timestamp=int(time.time())if timestamp is None else timestamp
    date=datetime.fromtimestamp(timestamp,timezone.utc).strftime('%Y-%m-%d')
    content_type='application/json; charset=utf-8'
    headers=f'content-type:{content_type}\nhost:{host}\nx-tc-action:{action.lower()}\n'
    names='content-type;host;x-tc-action'
    canonical='POST\n/\n\n'+headers+'\n'+names+'\n'+hashlib.sha256(payload).hexdigest()
    scope=f'{date}/{service}/tc3_request'
    string=f'TC3-HMAC-SHA256\n{timestamp}\n{scope}\n'+hashlib.sha256(canonical.encode()).hexdigest()
    def sign(key,msg):return hmac.new(key,msg.encode(),hashlib.sha256).digest()
    key=sign(sign(sign(('TC3'+secret_key).encode(),date),service),'tc3_request')
    signature=hmac.new(key,string.encode(),hashlib.sha256).hexdigest()
    return {'Content-Type':content_type,'Host':host,'X-TC-Action':action,'X-TC-Version':version,'X-TC-Region':region,'X-TC-Timestamp':str(timestamp),
            'Authorization':f'TC3-HMAC-SHA256 Credential={secret_id}/{scope}, SignedHeaders={names}, Signature={signature}'}

def tencent_sync(body,config):
    need(0<len(body)<=config.max_image_bytes,'OCR_IMAGE_SIZE',413)
    encoded=base64.b64encode(body).decode('ascii');need(len(encoded)<=MAX_ENCODED,'PROVIDER_IMAGE_LIMIT',413)
    payload=json.dumps({'ImageBase64':encoded,'ConfigID':'OCR','IsWords':False,'IsPdf':False},separators=(',',':'),ensure_ascii=True).encode()
    headers=signed_headers(payload,config.secret_id,config.secret_key,config.region)
    request=urllib.request.Request('https://'+HOST+'/',payload,headers,method='POST')
    try:
        # A single attempt; no redirect, upload URL or object-store intermediate.
        with urllib.request.build_opener(NoRedirect).open(request,timeout=25)as response:
            data=response.read(MAX_RESPONSE+1);need(len(data)<=MAX_RESPONSE,'PROVIDER_RESPONSE_LIMIT',502)
        result=json.loads(data)
    except (TimeoutError,socket.timeout):raise OcrError('PROVIDER_TIMEOUT',504)from None
    except urllib.error.HTTPError as error:
        error.close();raise OcrError('PROVIDER_UNAVAILABLE',502)from None
    except urllib.error.URLError as error:
        code,status=('PROVIDER_TIMEOUT',504)if isinstance(error.reason,(TimeoutError,socket.timeout))else('PROVIDER_UNAVAILABLE',502)
        raise OcrError(code,status)from None
    except (ValueError,UnicodeError):raise OcrError('PROVIDER_SCHEMA',502)from None
    return map_tencent(result,config.region)

def number(v):return type(v)in(int,float)and math.isfinite(v)

def map_tencent(result,region):
    need(type(result)is dict and type(result.get('Response'))is dict,'PROVIDER_SCHEMA',502)
    raw=result['Response'];need('Error'not in raw,'PROVIDER_REJECTED',502)
    need(type(raw.get('TextDetections'))is list and len(raw['TextDetections'])<=20000,'PROVIDER_SCHEMA',502)
    lines=[]
    for i,row in enumerate(raw['TextDetections']):
        need(type(row)is dict and type(row.get('DetectedText'))is str and len(row['DetectedText'])<=10000,'PROVIDER_SCHEMA',502)
        value=row.get('Confidence');confidence=None
        if value is not None:
            need(number(value)and 0<=value<=100,'PROVIDER_SCHEMA',502);confidence=value/100
        polygon=row.get('Polygon');coordinates=None
        if polygon:
            need(type(polygon)is list and len(polygon)<=16 and all(type(p)is dict and number(p.get('X'))and number(p.get('Y'))for p in polygon),'PROVIDER_SCHEMA',502)
            coordinates=[{'x':p['X'],'y':p['Y']}for p in polygon]
        # API supplies text detections, not a verbatim whole-document string or page.
        # Preserve array order/duplicates and the complete response; do not guess page=1.
        lines.append({'id':f'ocrline_{i:08d}','order':i,'text':row['DetectedText'],'page':None,'coordinates':coordinates,'confidence':confidence})
    text='\n'.join(row['text']for row in lines);need(len(text)<=2000000,'PROVIDER_TEXT_LIMIT',502)
    return {'version':'ocr-ledger/1','provider':'tencent-general-accurate','region':region,'rawText':text,'lines':lines,'providerRaw':result,
            'rawTextMethod':'TextDetections order joined with LF; provider full-document string unavailable',
            'mapping':'tencent-text-detections/1; confidence=provider-percent/100; coordinates=Polygon; missing-page/fields=null',
            'regionMeaning':'requested API region; not a verified exclusive processing-location guarantee'}
