"""Operator-only, one approved absolute-deadline background launch. No product changes."""
import argparse
from contextlib import ExitStack, contextmanager
from datetime import datetime
import fcntl
import getpass
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import stat
import subprocess
import sys
import threading
import time
import warnings

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from public_trial.server import (Deadline, PublicServer, configuration, start_connector,
                                 state_file, utc, verify_release, watch_session)
from deploy.invite_runner import runtime_lease, stop_child
from gateway.ocr import Budget, OcrError, need
from tools.verify_debt import require_verification

TARGET = datetime.fromisoformat('2026-11-09T23:59:00+08:00').timestamp()
STATE = ROOT / 'runtime/alpha-01-r02'
QR = ROOT / 'share/PTDS-Alpha-0.1-扫码内测.png'


def absolute_deadline(target, wall=time.time, monotonic=time.monotonic):
    remaining, monotonic_start = target - wall(), monotonic()
    need(remaining > 0, 'APPROVED_DEADLINE_PASSED', 410)
    deadline = Deadline(remaining, wall, monotonic)
    deadline.expires = target
    deadline.monotonic_expires = monotonic_start + remaining
    return deadline


@contextmanager
def owner(path):
    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(fd)
        need(stat.S_ISREG(info.st_mode) and stat.S_IMODE(info.st_mode) == 0o600
             and info.st_uid == os.geteuid() and info.st_nlink == 1, 'PUBLIC_LOCK_UNSAFE', 503)
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        os.close(fd)


def spawn_worker(command, payload):
    # Credentials cross one anonymous pipe; no argv, environment or file transport.
    child = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL, start_new_session=True)
    try:
        child.stdin.write(json.dumps(payload).encode())
        child.stdin.close()
    except BaseException:
        stop_child(child)
        raise
    return child


def serve(payload, *, state_dir=STATE, target=TARGET, port=18795, qr=QR,
          lock_path=ROOT / 'runtime/public-session.lock'):
    stop = threading.Event()
    data = {'pid': os.getpid(), 'state': 'STARTING', 'expiresAt': utc(target),
            'credentialsStored': False, 'ocrEnabled': False,
            'operatorSourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    child = server = None
    server_thread = None
    with owner(lock_path):
        state_dir.mkdir(mode=0o700, exist_ok=False)
        state_file(state_dir, data)
        def requested_stop(signum, _):
            data['stopReason'] = 'OPERATOR_SIGNAL_' + str(signum)
            stop.set()
        for signum in (signal.SIGTERM, signal.SIGINT):
            signal.signal(signum, requested_stop)
        signal.signal(signal.SIGHUP, signal.SIG_IGN)
        with ExitStack() as leases:
            try:
                deadline = absolute_deadline(target)
                # Bind the one approved port before making it publicly reachable.
                server = PublicServer(('127.0.0.1', port), ROOT / 'web', deadline)
                server_thread = threading.Thread(target=server.serve_forever, daemon=True)
                server_thread.start()
                child, connector = start_connector(shutil.which('cloudflared'), server.server_port, stop)
                data.update(url=connector['url'], startedAt=utc(deadline.started))
                state_file(state_dir, data)
                threading.Thread(target=watch_session, args=(deadline, child, stop), daemon=True).start()
                if payload.get('secretId') and payload.get('secretKey'):
                    try:
                        config = configuration(connector['url'], payload.pop('secretId'), payload.pop('secretKey'))
                        runtime = leases.enter_context(runtime_lease(Path.home()))
                        budget = Budget(runtime / 'ocr-budget-v2.json', config)
                        need(not stop.is_set() and not deadline.expired(), 'TRIAL_EXPIRED', 410)
                        server.enable_ocr(config, budget)
                        data['ocrEnabled'] = True
                    except OcrError as error:
                        data['ocrSetupError'] = error.code
                    except Exception as error:
                        data['ocrSetupError'] = 'LOCAL_OCR_SETUP_' + type(error).__name__
                payload.clear()
                subprocess.run([str(ROOT / 'tools/bin/public-qr'), connector['url'], str(qr)],
                               check=True, timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                need(not stop.is_set() and not deadline.expired(), 'TRIAL_EXPIRED', 410)
                data['state'] = 'SERVING'
                state_file(state_dir, data)
                stop.wait()
                data['stopReason'] = ('DEADLINE' if deadline.expired() else
                                      data.get('stopReason', 'CONNECTOR_EXIT'))
            except BaseException as error:
                data['failureType'] = type(error).__name__
                if isinstance(error, OcrError):
                    data['errorCode'] = error.code
            finally:
                payload.clear()
                stop.set()
                if child is not None:
                    data['connectorExitCodeBeforeCleanup'] = child.poll()
                stop_child(child)
                if server is not None:
                    if server_thread is not None:
                        server.shutdown()
                        server_thread.join(timeout=5)
                    server.server_close()
                data['state'] = 'EXPIRED' if data.get('stopReason') == 'DEADLINE' or time.time() >= target else 'STOPPED'
                data['stoppedAt'] = utc(time.time())
                state_file(state_dir, data)
    return data


def main():
    parser = argparse.ArgumentParser();parser.add_argument('--worker', action='store_true');args = parser.parse_args()
    verify_release()
    require_verification(ROOT, ROOT / 'evidence/r19-verification02/result.json')
    if args.worker:
        payload = json.loads(sys.stdin.buffer.read(16384))
        sys.stdin.close()
        result = serve(payload)
        return 0 if result.get('stopReason') == 'DEADLINE' else 2
    need(sys.stdin.isatty() and sys.stderr.isatty(), 'INTERACTIVE_OPERATOR_TERMINAL_REQUIRED', 503)
    need(not STATE.exists(), 'APPROVED_ATTEMPT_ALREADY_STARTED', 409)
    absolute_deadline(TARGET)
    print('Alpha 0.1 内测：北京时间2026年11月9日23:59自动停止。')
    print('腾讯密钥只在进程内存中使用，不保存；启动成功后可关闭本窗口。')
    with warnings.catch_warnings():
        warnings.simplefilter('error', getpass.GetPassWarning)
        secret_id = getpass.getpass('腾讯 SecretId（隐藏输入；留空则仅手填）: ')
        secret_key = getpass.getpass('腾讯 SecretKey（隐藏输入）: ') if secret_id else ''
    child = spawn_worker([sys.executable, '-B', str(Path(__file__).resolve()), '--worker'],
                         {'secretId': secret_id, 'secretKey': secret_key})
    del secret_id, secret_key
    until = time.monotonic() + 105
    while time.monotonic() < until:
        if (STATE / 'session.json').exists():
            data = json.loads((STATE / 'session.json').read_text())
            if data['state'] == 'SERVING':
                print('\n后台已启动，可以关闭本窗口。')
                print('网址：' + data['url'])
                print('在线识别：' + ('已配置（尚未发起真实识别验收）' if data['ocrEnabled'] else '未开启，可手填'))
                print('截止：北京时间2026年11月9日23:59。')
                return 0
            if data['state'] in ('STOPPED', 'EXPIRED'):
                print('启动未完成：' + data.get('errorCode', data.get('failureType', data['state'])))
                return 2
        if child.poll() is not None:
            print('BACKGROUND_PROCESS_EXITED; 请仅回报此错误码。')
            return 2
        time.sleep(0.25)
    print('STARTUP_PENDING；请先不要转发二维码，检查运行状态。')
    return 2


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (KeyboardInterrupt, EOFError):
        print('\n输入取消，未自动重新启动。')
        raise SystemExit(130)
    except Exception as error:
        print('OPERATOR_START_STOPPED_' + (error.code if isinstance(error, OcrError) else type(error).__name__))
        raise SystemExit(2)
