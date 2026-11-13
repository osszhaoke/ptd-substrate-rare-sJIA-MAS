"""Static H5 + optional OCR gateway. No health record API, no body or access logging."""
import argparse, hmac, json, mimetypes, re, socket, threading
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
from .ocr import Configuration,Budget,OcrError,need,dimensions,google_sync,MAX_IMAGE
from .tencent import tencent_sync
from .credentials import read_credentials,read_public_config

CSP="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; worker-src 'self'; manifest-src 'self'"
class Server(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address,root,budget_path,config=None,provider=None):
        self.root=Path(root).resolve();self.config=config or Configuration();self.budget=Budget(budget_path,self.config)if self.config.enabled else None;self.provider=provider or (tencent_sync if self.config.provider=='tencent-general-accurate'else google_sync)
        self.slots=threading.BoundedSemaphore(16)
        super().__init__(address,Handler)
    def process_request(self,request,address):
        if not self.slots.acquire(False):self.shutdown_request(request);return
        try:super().process_request(request,address)
        except BaseException:self.slots.release();raise
    def process_request_thread(self,*args):
        try:super().process_request_thread(*args)
        finally:self.slots.release()
    def handle_error(self,*args):pass  # Never print exception objects containing input.

class Handler(BaseHTTPRequestHandler):
    protocol_version='HTTP/1.0'
    def setup(self):super().setup();self.connection.settimeout(30)
    def log_message(self,*args):pass
    def send(self,status,body,mime='application/json',static=False):
        if not isinstance(body,bytes):body=json.dumps(body,ensure_ascii=False).encode()
        self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-cache'if static else 'no-store');self.send_header('Content-Security-Policy',CSP);self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.send_header('Permissions-Policy','camera=(self), microphone=(), geolocation=()');self.end_headers()
        try:self.wfile.write(body)
        except (BrokenPipeError,ConnectionResetError):pass
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/health':return self.send(200,{'status':'ok','ocrEnabled':self.server.config.enabled,'version':'h5-sjia-mas-r19'})
        if path=='/api/ocr/config':return self.send(200,self.server.config.public())
        if path.startswith('/api/'):return self.send(404,{'error':'NOT_FOUND'})
        try:
            p=(self.server.root/unquote(path).lstrip('/')).resolve()
            if path=='/':p=self.server.root/'index.html'
            if not p.is_relative_to(self.server.root)or p.suffix not in ('.html','.js','.css','.svg','.webmanifest','.png','.jpg')or not p.is_file():return self.send(404,{'error':'NOT_FOUND'})
            mime={'.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json'}.get(p.suffix,mimetypes.guess_type(str(p))[0]or'application/octet-stream')
            return self.send(200,p.read_bytes(),mime,True)
        except (ValueError,OSError):return self.send(404,{'error':'NOT_FOUND'})
    def do_POST(self):
        read_body=False
        try:
            need(self.path=='/api/ocr','NOT_FOUND',404);c=self.server.config;need(c.enabled,'OCR_NOT_CONFIGURED',503)
            request_id=self.headers.get('X-Request-ID','');need(re.fullmatch('[A-Za-z0-9_-]{8,96}',request_id) is not None,'REQUEST_ID_REQUIRED')
            need(not self.headers.get('Transfer-Encoding'),'TRANSFER_ENCODING_REJECTED')
            try:length=int(self.headers.get('Content-Length',''))
            except ValueError:raise OcrError('LENGTH_REQUIRED',411)
            need(0<length<=MAX_IMAGE,'IMAGE_SIZE',413)
            need(length<=c.max_image_bytes,'OCR_IMAGE_SIZE',413);mime=self.headers.get('Content-Type');need(mime in ('image/png','image/jpeg'),'PNG_JPEG_ONLY',415)
            body=self.rfile.read(length);read_body=True;need(len(body)==length,'INCOMPLETE_UPLOAD')
            need(self.headers.get('Origin')==c.origin,'ORIGIN_REJECTED',403)
            auth=self.headers.get('Authorization','');need(hmac.compare_digest(auth,'Bearer '+c.token),'ACCESS_REJECTED',401)
            dimensions(body,mime)
            self.server.budget.reserve(request_id,c.token,self.client_address[0])
            try:ledger=self.server.provider(body,c)
            finally:self.server.budget.release()
            return self.send(200,{'ledger':ledger,'requestId':request_id})
        except OcrError as e:
            # Drain only bounded already-sent bodies so clients can receive the rejection status.
            # No provider reservation is made on any validation/access rejection.
            if not read_body:
                try:
                    n=int(self.headers.get('Content-Length','0'))
                    if 0<n<=MAX_IMAGE:self.connection.settimeout(2);self.rfile.read(n)
                except (ValueError,OSError):pass
            return self.send(e.status,{'error':e.code})
        except (socket.timeout,TimeoutError):return self.send(408,{'error':'UPLOAD_TIMEOUT'})
        except Exception:return self.send(502,{'error':'OCR_FAILED_NO_RETRY'})

def main():
    p=argparse.ArgumentParser();p.add_argument('--host',default='127.0.0.1');p.add_argument('--port',type=int,default=18791);p.add_argument('--runtime',type=Path,required=True);p.add_argument('--secrets-file',type=Path);p.add_argument('--config-file',type=Path);p.add_argument('--check-config',action='store_true');p.add_argument('--require-ocr',action='store_true');args=p.parse_args()
    try:
        config=Configuration(env=read_public_config(args.config_file)if args.config_file else None,secrets=read_credentials(args.secrets_file)if args.secrets_file else None)
        if args.require_ocr:need(config.enabled,'OCR_CONFIGURATION_INCOMPLETE',503)
    except OcrError as error:raise SystemExit(error.code)from None
    if args.check_config:
        print(json.dumps(config.public(),ensure_ascii=False));return
    args.runtime.mkdir(parents=True,exist_ok=True)
    # Lifetime lock prevents multiple processes from independently spending the same ledger.
    import fcntl
    lock=open(args.runtime/'gateway.lock','a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    root=Path(__file__).resolve().parents[1]/'web'
    try:
        server=Server((args.host,args.port),root,args.runtime/'ocr-budget-v2.json',config)
    except OcrError as error:
        raise SystemExit(error.code)from None
    print(json.dumps({'listening':f'http://{args.host}:{args.port}','ocrEnabled':server.config.enabled}),flush=True)
    server.serve_forever()
if __name__=='__main__':main()
