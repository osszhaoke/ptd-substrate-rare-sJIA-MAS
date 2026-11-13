"""Public 24-hour session. Operator credentials are prompted only in their TTY."""
import argparse
from collections import deque
from datetime import datetime, timezone
import fcntl
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit
import warnings

from deploy.invite_runner import runtime_lease, stop_child
from gateway.ocr import Budget, Configuration, OcrError, need
from gateway.server import Handler, Server
from gateway.tencent import tencent_sync

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / 'public_trial/POLICY.json').read_text())


def utc(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat()


class Deadline:
    def __init__(self, seconds, wall=time.time, monotonic=time.monotonic):
        self.wall, self.monotonic = wall, monotonic
        self.started = wall()
        self.expires = self.started + seconds
        self.monotonic_expires = monotonic() + seconds

    def expired(self):
        return self.wall() >= self.expires or self.monotonic() >= self.monotonic_expires


class DeadlineBudget:
    def __init__(self, budget, deadline):
        self.budget, self.deadline = budget, deadline

    def reserve(self, *args):
        need(not self.deadline.expired(), 'TRIAL_EXPIRED', 410)
        return self.budget.reserve(*args)

    def release(self):
        return self.budget.release()


class PublicHandler(Handler):
    def admitted(self):
        if self.server.deadline.expired():
            self.close_connection = True
            self.send(410, {'error': 'TRIAL_EXPIRED', 'message': '本次24小时测试已结束。'})
            return False
        return True

    def do_GET(self):
        if not self.admitted():
            return
        path = urlsplit(self.path).path
        if path == '/api/ocr/config':
            config = self.server.config
            return self.send(200, {**config.public(), 'publicTrial': config.enabled,
                                   'expiresAt': utc(self.server.deadline.expires)})
        if path in ('/health', '/trial-status'):
            return self.send(200, {'status': 'ok', 'version': 'h5-sjia-mas-r19',
                                  'mode': 'public-24h-r01',
                                  'ocrEnabled': self.server.config.enabled,
                                  'expiresAt': utc(self.server.deadline.expires)})
        return super().do_GET()

    def do_POST(self):
        if not self.admitted():
            return
        # Public mode was explicitly approved. This is not identity verification.
        # Keep the original Origin, image, reservation, limits and request-ID checks.
        config = self.server.config
        if (self.path == '/api/ocr' and config.enabled
                and self.headers.get('Origin') == config.origin):
            del self.headers['Authorization']
            self.headers['Authorization'] = 'Bearer ' + config.token
        return super().do_POST()


class PublicServer(Server):
    def __init__(self, address, root, deadline):
        self.deadline = deadline
        super().__init__(address, root, None, Configuration({}))
        self.RequestHandlerClass = PublicHandler

    def enable_ocr(self, config, budget, provider=tencent_sync):
        # A one-way disabled -> enabled publication: install dependencies first.
        # No requests can reach a budget/provider while config.enabled is false.
        need(not self.config.enabled, 'OCR_ALREADY_ENABLED', 409)
        def checked_provider(body, current):
            need(not self.deadline.expired(), 'TRIAL_EXPIRED', 410)
            return provider(body, current)
        self.provider = checked_provider
        self.budget = DeadlineBudget(budget, self.deadline)
        self.config = config


def configuration(origin, secret_id, secret_key):
    env = json.loads((ROOT / 'deploy/PUBLIC_CONFIG.example.json').read_text())
    env['PTDS_PUBLIC_ORIGIN'] = origin
    config = Configuration(env, {'tencentSecretId': secret_id,
                                'tencentSecretKey': secret_key,
                                'trialToken': secrets.token_urlsafe(32)})
    need(config.enabled, 'OCR_CONFIGURATION_INCOMPLETE', 503)
    return config


def connector_command(binary, port):
    return ([binary, 'tunnel', '--config', '/dev/null', '--origincert', '/dev/null',
             '--no-autoupdate', '--metrics', '127.0.0.1:0', '--loglevel', 'info',
             '--management-diagnostics=false', '--grace-period', '1s',
             '--url', f'http://127.0.0.1:{port}', '--no-chunked-encoding'],
            {'PATH': '/usr/bin:/bin:/usr/sbin:/sbin'})


def verify_release():
    proof = json.loads((ROOT / 'PUBLIC_SOURCE_MANIFEST.json').read_text())
    required = {p.relative_to(ROOT).as_posix()
                for folder in ('web', 'gateway', 'public_trial')
                for p in (ROOT / folder).rglob('*')
                if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc'}
    listed = {e['path'] for e in proof['files']}
    need(required <= listed, 'PUBLIC_MANIFEST_MISSING_FILES', 503)
    for item in proof['files']:
        p = ROOT / item['path']
        need(p.resolve() == p and p.is_file(), 'PUBLIC_FILE_LINKED_OR_MISSING', 503)
        need(hashlib.sha256(p.read_bytes()).hexdigest() == item['sha256'],
             'PUBLIC_BYTES_CHANGED', 503)


def state_file(runtime, data):
    target = runtime / 'session.json'
    temporary = runtime / 'session.pending'
    with temporary.open('w') as f:
        os.chmod(temporary, 0o600)
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temporary, target)


def start_connector(binary, port, stop):
    command, env = connector_command(binary, port)
    child = subprocess.Popen(command, env=env, stdin=subprocess.DEVNULL,
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                             text=True, bufsize=1)
    found = threading.Event()
    state = {'url': None, 'connected': False, 'events': deque(maxlen=12)}
    def read():
        for line in child.stdout:
            match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com\b', line)
            if match and not state['url']:
                state['url'] = match[0]
                state['deadline'] = Deadline(POLICY['lifetimeSeconds'])
                found.set()
            if 'Registered tunnel connection' in line:
                state['connected'] = True
            if ' ERR ' in line or 'failed' in line.lower():
                # Connector has no credentials. Never capture HTTP debug headers.
                state['events'].append(line.strip()[:1000])
    threading.Thread(target=read, daemon=True).start()
    until = time.monotonic() + POLICY['connectorStartupSeconds']
    while not found.wait(0.25):
        if child.poll() is not None or stop.is_set() or time.monotonic() >= until:
            stop_child(child)
            raise RuntimeError('QUICK_TUNNEL_URL_UNAVAILABLE ' + json.dumps(list(state['events'])))
    return child, state


def watch_session(deadline, child, stop):
    while not stop.wait(0.25):
        if deadline.expired() or child.poll() is not None:
            stop.set()
            return


def operator_ocr(server, origin, stop):
    try:
        print('\n扫码页面已启动。要启用在线识别，请在这里输入腾讯密钥；不会显示或保存。', flush=True)
        print('这不是Cloudflare账号登录，不需要隧道Token或试用码。', flush=True)
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            secret_id = getpass.getpass('腾讯 SecretId（隐藏输入）: ')
            secret_key = getpass.getpass('腾讯 SecretKey（隐藏输入）: ')
        config = configuration(origin, secret_id, secret_key)
        del secret_id, secret_key
        # Only the operator's process reads the existing real budget, never the agent.
        with runtime_lease(Path.home()) as runtime:
            budget = Budget(runtime / 'ocr-budget-v2.json', config)
            need(not stop.is_set() and not server.deadline.expired(), 'TRIAL_EXPIRED', 410)
            server.enable_ocr(config, budget)
            print('\n在线识别已开启。测试者不需要输入试用码，刷新页面即可。', flush=True)
            stop.wait()
    except (KeyboardInterrupt, EOFError):
        print('\n未启用在线识别，页面仍可手填。', flush=True)
    except OcrError as error:
        print('\nOCR未开启：' + error.code + '；页面仍可手填。', flush=True)
    except Exception:
        print('\nOCR未开启：LOCAL_OCR_SETUP_FAILED；页面仍可手填。', flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', action='store_true')
    args = parser.parse_args()
    if not args.start:
        parser.print_help()
        return 0
    if not sys.stdin.isatty() or not sys.stderr.isatty():
        print('INTERACTIVE_OPERATOR_TERMINAL_REQUIRED')
        return 2
    runtime = ROOT / 'runtime'
    runtime.mkdir(mode=0o700, exist_ok=True)
    lock = (runtime / 'public-session.lock').open('a')
    os.chmod(runtime / 'public-session.lock', 0o600)
    child = server = None
    stop = threading.Event()
    data = None
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        need(not (runtime / 'session.json').exists(), 'SESSION_ALREADY_USED_NO_AUTOMATIC_EXTENSION', 409)
        verify_release()
        binary = shutil.which('cloudflared')
        need(bool(binary), 'CLOUDFLARED_NOT_INSTALLED', 503)
        signal.signal(signal.SIGTERM, lambda *_: stop.set())
        child, connector = start_connector(binary, POLICY['loopbackPort'], stop)
        deadline = connector['deadline']
        data = {'url': connector['url'], 'startedAt': utc(deadline.started),
                'expiresAt': utc(deadline.expires), 'lifetimeSeconds': POLICY['lifetimeSeconds'],
                'pid': os.getpid(), 'state': 'STARTING', 'credentialsStored': False}
        state_file(runtime, data)
        server = PublicServer(('127.0.0.1', POLICY['loopbackPort']), ROOT / 'web', deadline)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        # Start the watchdog before rendering QR or waiting for operator input.
        threading.Thread(target=watch_session, args=(deadline, child, stop), daemon=True).start()
        subprocess.run([str(ROOT / 'tools/bin/public-qr'), connector['url'],
                        str(ROOT / 'share/PTDS-扫码试用-24小时.png')], check=True, timeout=30)
        data['state'] = 'SERVING'
        state_file(runtime, data)
        print('测试网址：' + connector['url'], flush=True)
        print('自动截止时间（UTC）：' + data['expiresAt'], flush=True)
        print('二维码已保存到share文件夹。此窗口须保持打开，电脑须保持联网。', flush=True)
        threading.Thread(target=operator_ocr, args=(server, connector['url'], stop), daemon=True).start()
        while not stop.wait(0.5):
            pass
    except KeyboardInterrupt:
        print('\n提供者已停止本次测试。', flush=True)
    except OcrError as error:
        print(error.code, flush=True)
        return 2
    except Exception as error:
        # No credential objects or provider responses are formatted here.
        print('PUBLIC_START_STOPPED ' + type(error).__name__, flush=True)
        return 2
    finally:
        stop.set()
        stop_child(child)
        if server is not None:
            server.shutdown()
            server.server_close()
        if data is not None:
            data['state'] = 'EXPIRED' if deadline.expired() else 'STOPPED'
            state_file(runtime, data)
        lock.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
