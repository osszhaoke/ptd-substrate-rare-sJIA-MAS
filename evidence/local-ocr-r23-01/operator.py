"""Explicit operator-only loopback OCR adapter. Never imports inherited cloud credentials."""
from contextlib import contextmanager
from datetime import datetime, timezone
import getpass
import json
import os
from pathlib import Path
import secrets
import signal
import shlex
import subprocess
import sys
import time
import warnings

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from deploy.invite_runner import runtime_lease, SetupError
from gateway.ocr import Configuration, Budget, OcrError
from gateway.server import Server
from tools.verify_debt import require_verification

ORIGIN = 'http://127.0.0.1:18791'
HOST, PORT = '127.0.0.1', 18791
PREVIOUS = ROOT / 'runtime/local-acceptance-r23-01/session.json'


def make_local_configuration(secret_id, secret_key, token, origin=ORIGIN):
    if origin != ORIGIN:
        raise SetupError('LOCAL_FIXED_LOOPBACK_ORIGIN_REQUIRED')
    env = json.loads((ROOT / 'deploy/PUBLIC_CONFIG.example.json').read_text())
    # Validate unchanged provider/region/cost/quota/secrets policy first. This
    # explicit operator transport exception is fixed to the loopback endpoint;
    # the public Configuration HTTPS contract itself remains unchanged.
    env['PTDS_PUBLIC_ORIGIN'] = 'https://127.0.0.1:18791'
    config = Configuration(env, {'tencentSecretId': secret_id,
                                'tencentSecretKey': secret_key,
                                'trialToken': token})
    if not config.enabled:
        raise SetupError('OCR_CONFIGURATION_INCOMPLETE')
    config.origin = origin
    return config


def record(status, **extra):
    path = OUT / 'session.json'
    value = {'status': status, 'pid': os.getpid(), 'atUTC': datetime.now(timezone.utc).isoformat(),
             'url': ORIGIN + '/', 'credentialsStored': False, 'publicAccess': False, **extra}
    temp = path.with_suffix('.pending')
    with temp.open('w') as f:
        os.chmod(temp, 0o600)
        json.dump(value, f, indent=2)
        f.write('\n')
    os.replace(temp, path)


def stop_previous():
    previous = json.loads(PREVIOUS.read_text())
    pid = previous['pid']
    result = subprocess.run(['ps', '-p', str(pid), '-o', 'args='], capture_output=True, text=True, timeout=5)
    if result.returncode:
        # Binding the fixed port below still fails closed if another owner exists.
        return False
    snapshot = json.loads((OUT / 'previous-process.json').read_text())
    cwd = subprocess.run(['lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'], capture_output=True, text=True, timeout=5)
    if (pid != snapshot['pid'] or result.stdout.strip() != snapshot['args']
            or shlex.split(result.stdout.strip())[1:] != previous['command'][1:]
            or 'n'+str(ROOT) not in cwd.stdout.splitlines()):
        raise SetupError('PREVIOUS_PROCESS_IDENTITY_MISMATCH')
    os.kill(pid, signal.SIGTERM)
    for _ in range(50):
        result = subprocess.run(['ps', '-p', str(pid), '-o', 'pid='], capture_output=True, timeout=5)
        if result.returncode:
            return True
        time.sleep(0.1)
    raise SetupError('PREVIOUS_PROCESS_DID_NOT_STOP')


def restore_manual():
    out = OUT / 'manual-fallback'
    out.mkdir(exist_ok=True)
    with (out / 'server.log').open('ab') as log:
        child = subprocess.Popen([sys.executable, '-B', '-m', 'gateway.server', '--host', HOST,
                                  '--port', str(PORT), '--runtime', str(out / 'service')],
                                 cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                                 start_new_session=True, env={'PATH': os.defpath, 'LANG': 'en_US.UTF-8'})
    record('OCR_SETUP_FAILED_MANUAL_FALLBACK_STARTED', manualPid=child.pid, ocrEnabled=False)


def main():
    if not sys.stdin.isatty() or not sys.stderr.isatty():
        print('INTERACTIVE_OPERATOR_TERMINAL_REQUIRED')
        return 2
    server = None
    stopped_previous = False
    try:
        status = json.loads((ROOT / 'STATUS.json').read_text())
        require_verification(ROOT, ROOT / status['verificationEvidence'])
        print('仅本机启用腾讯 OCR，不开放公网；沿用原费用账本及额度。')
        print('密钥只在此进程内存使用，不显示、不保存。此窗口需保持打开。')
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            secret_id = getpass.getpass('腾讯 SecretId（隐藏输入，粘贴后回车）: ')
            secret_key = getpass.getpass('腾讯 SecretKey（隐藏输入，粘贴后回车）: ')
        config = make_local_configuration(secret_id, secret_key, secrets.token_urlsafe(32))
        del secret_id, secret_key
        # Only this interactive operator process reads the existing real ledger.
        with runtime_lease(Path.home()) as runtime:
            budget = Budget(runtime / 'ocr-budget-v2.json', config)
            stopped_previous = stop_previous()
            server = Server((HOST, PORT), ROOT / 'web', None, Configuration({}))
            # Publish dependencies before enabling the already validated config.
            server.budget = budget
            from gateway.tencent import tencent_sync
            server.provider = tencent_sync
            server.config = config
            record('SERVING', ocrEnabled=True, staticVersion=status['staticPatch']['staticVersion'])
            print('\n本机在线 OCR 已启用：' + ORIGIN + '/')
            print('在录入页面的“识别试用码”中粘贴下面这一行（不是腾讯密钥）：')
            print(config.token)
            print('刷新页面后选图、勾选同意上传，再点“上传并识别”；核对后由你确认保存。')
            print('不自动上传或试调用。按 Ctrl+C 停止服务；窗口关闭会停用。', flush=True)
            subprocess.run(['open', ORIGIN + '/'], check=True, timeout=10)
            server.serve_forever()
    except (KeyboardInterrupt, EOFError):
        print('\n本机 OCR 已停止；额度和浏览器记录保留。')
        record('STOPPED', ocrEnabled=False)
        return 130
    except (SetupError, OcrError) as error:
        print('OCR未开启：' + (error.code if isinstance(error, OcrError) else str(error)))
        if stopped_previous:
            if server is not None:
                server.server_close()
                server = None
            restore_manual()
        else:
            record('SETUP_STOPPED', ocrEnabled=False)
        return 2
    except Exception:
        # Never format credential/provider/ledger objects or exception messages.
        print('OCR未开启：LOCAL_OCR_SETUP_STOPPED；不要发送密钥，只回报错误码。')
        if stopped_previous:
            if server is not None:
                server.server_close()
                server = None
            restore_manual()
        else:
            record('SETUP_STOPPED', ocrEnabled=False)
        return 2
    finally:
        if server is not None:
            server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
