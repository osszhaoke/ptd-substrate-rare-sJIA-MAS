"""Read only the explicitly selected operator secret file. Never log contents."""
import json, os, stat
from pathlib import Path
from .ocr import OcrError, need

FIELDS={'tencentSecretId','tencentSecretKey','trialToken'}
PUBLIC_KEYS={'PTDS_PUBLIC_ORIGIN','PTDS_OCR_PROVIDER','PTDS_OCR_REGION','PTDS_OCR_TOTAL_CALLS','PTDS_OCR_SESSION_CALLS','PTDS_OCR_PER_MINUTE','PTDS_OCR_CONCURRENCY','PTDS_OCR_MAX_UNIT_COST','PTDS_OCR_TOTAL_BUDGET','PTDS_OCR_CURRENCY','PTDS_OCR_BUDGET_NOTE'}

def read_public_config(path):
    try:
        with open(path,'rb')as f:data=f.read(16385)
        need(len(data)<=16384,'PUBLIC_CONFIG_INVALID',503)
        config=json.loads(data)
        need(type(config)is dict and set(config)<=PUBLIC_KEYS and all(type(v)is str and len(v)<=1000 for v in config.values()),'PUBLIC_CONFIG_INVALID',503)
        return config
    except OcrError:raise
    except (OSError,ValueError,UnicodeError):raise OcrError('PUBLIC_CONFIG_UNAVAILABLE_OR_INVALID',503)from None

def read_credentials(path):
    """Caller supplies a new deployment path; there is no default/fallback secret read.

    Every path component is opened without following symlinks; private leaf directory
    and 0600 regular file must belong to this service user. Tests use temporary files.
    """
    target=Path(path)
    need(target.is_absolute() and '..' not in target.parts,'CREDENTIAL_PATH_INVALID',503)
    fd=None;leaf=None
    try:
        fd=os.open('/',os.O_RDONLY|os.O_DIRECTORY)
        for part in target.parts[1:-1]:
            new=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
            os.close(fd);fd=new
        parent=os.fstat(fd)
        need(parent.st_uid==os.geteuid() and stat.S_IMODE(parent.st_mode)==0o700,'CREDENTIAL_DIRECTORY_PERMISSIONS',503)
        leaf=os.open(target.name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=fd)
        info=os.fstat(leaf)
        need(stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==os.geteuid() and stat.S_IMODE(info.st_mode)==0o600,'CREDENTIAL_FILE_PERMISSIONS',503)
        need(0<info.st_size<=4096,'CREDENTIAL_FILE_INVALID',503)
        data=os.read(leaf,4097);need(len(data)<=4096,'CREDENTIAL_FILE_INVALID',503)
        def pairs(rows):
            out={}
            for k,v in rows:
                need(k not in out,'CREDENTIAL_FILE_INVALID',503);out[k]=v
            return out
        secrets=json.loads(data,object_pairs_hook=pairs)
        need(type(secrets)is dict and set(secrets)==FIELDS and all(type(v)is str and 0<len(v)<=512 and v.isascii() and not any(c.isspace()for c in v)for v in secrets.values()),'CREDENTIAL_FILE_INVALID',503)
        return secrets
    except OcrError:raise
    except (OSError,ValueError,UnicodeError):raise OcrError('CREDENTIAL_FILE_UNAVAILABLE_OR_INVALID',503)from None
    finally:
        if leaf is not None:os.close(leaf)
        if fd is not None:os.close(fd)
