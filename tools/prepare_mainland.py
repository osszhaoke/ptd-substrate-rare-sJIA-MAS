"""Operator runs this interactively ON THE TARGET SERVER. No cloud API or deployment."""
import argparse,getpass,json,os,re,secrets,sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]

def prepare(output,origin,material):
    parsed=urlsplit(origin)
    if not(parsed.scheme=='https'and parsed.hostname and not parsed.username and not parsed.password and not parsed.path and not parsed.query and not parsed.fragment and parsed.port in(None,443)):
        raise ValueError('ORIGIN_MUST_BE_EXACT_HTTPS_HOST_WITHOUT_TRAILING_SLASH')
    if not re.fullmatch(r'[A-Za-z0-9.-]+',parsed.hostname)or any(not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?',label)for label in parsed.hostname.split('.')):
        raise ValueError('INVALID_HOST')
    if set(material)!={'tencentSecretId','tencentSecretKey','trialToken'}or not all(type(v)is str and 0<len(v)<=512 and v.isascii()and not any(c.isspace()for c in v)for v in material.values())or len(material['trialToken'])<32:
        raise ValueError('INVALID_CREDENTIALS')
    output=Path(output).absolute()
    if output!=output.resolve():raise ValueError('SYMLINK_OUTPUT_REJECTED')
    # No overwrite, permission repair, key migration or automatic service start.
    for relative in ['config/h5-r02.json','secrets/h5-r02.json','config/Caddyfile']:
        if(output/relative).exists()or(output/relative).is_symlink():raise ValueError('OUTPUT_EXISTS')
    made=[]
    def private_dir(path):
        if not path.exists():path.mkdir(mode=0o700,parents=True);made.append(str(path))
        info=path.stat()
        if path.is_symlink()or info.st_uid!=os.geteuid()or info.st_mode&0o777!=0o700:raise ValueError('OUTPUT_DIRECTORY_NOT_PRIVATE')
    private_dir(output)
    for folder in ['config','secrets','runtime','runtime/h5-r02']:private_dir(output/folder)
    public=json.loads((ROOT/'deploy/PUBLIC_CONFIG.example.json').read_text());public['PTDS_PUBLIC_ORIGIN']=origin
    caddy=f'''{parsed.hostname} {{
    request_body {{
        max_size 8388608
    }}
    reverse_proxy 127.0.0.1:18791
}}
'''
    def write(path,value):
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
        with os.fdopen(fd,'w')as stream:stream.write(value);stream.flush();os.fsync(stream.fileno())
    write(output/'secrets/h5-r02.json',json.dumps(material))
    write(output/'config/h5-r02.json',json.dumps(public,ensure_ascii=False,indent=2))
    write(output/'config/Caddyfile',caddy)
    return {'publicConfig':str(output/'config/h5-r02.json'),'secretFile':str(output/'secrets/h5-r02.json'),'runtime':str(output/'runtime/h5-r02'),'caddyfile':str(output/'config/Caddyfile'),'servicesStarted':False,'cloudCalls':0}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);parser.add_argument('--origin',required=True);args=parser.parse_args()
    if not sys.stdin.isatty()or not sys.stderr.isatty():raise SystemExit('RUN_INTERACTIVELY_ON_TARGET_SERVER_NO_PIPED_SECRETS')
    secret_id=getpass.getpass('腾讯 SecretId（隐藏输入）: ')
    secret_key=getpass.getpass('腾讯 SecretKey（隐藏输入）: ')
    try:result=prepare(args.output,args.origin,{'tencentSecretId':secret_id,'tencentSecretKey':secret_key,'trialToken':secrets.token_urlsafe(32)})
    except (ValueError,OSError):raise SystemExit('PREPARATION_FAILED_NO_OVERWRITE_INSPECT_OUTPUT_LOCALLY')from None
    print(json.dumps(result,ensure_ascii=False,indent=2))
    print('访问码与凭据已存秘密文件，不在终端打印。由本人在服务器本地查看访问码。未安装、启动、购买或发布任何服务。')
if __name__=='__main__':main()
