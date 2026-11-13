"""Operator-only foreground invite server. Credentials stay in process memory."""
import argparse
from contextlib import contextmanager
import fcntl
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import stat
import subprocess
import sys
import threading
import time
import warnings

ROOT = Path(__file__).resolve().parents[1]
HOSTNAME = 'try.ptds.ai'
PORT = 18793


class SetupError(Exception):
    pass


def verify_product(root=ROOT):
    proof = json.loads((root / 'SOURCE_MANIFEST.json').read_text())
    required = {p.relative_to(root).as_posix() for folder in ['web', 'gateway', 'deploy']
                for p in (root / folder).rglob('*')
                if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.zip'}
    entries = proof['files']
    listed = {e['path'] for e in entries}
    if proof['version'] != 'h5-sjia-mas-r19' or not required <= listed:
        raise SetupError('PRODUCT_MANIFEST_MISSING_FILES')
    for entry in entries:
        p = root / entry['path']
        if p.resolve() != p or not p.is_file():
            raise SetupError('PRODUCT_FILE_LINKED_OR_MISSING')
        data = p.read_bytes()
        if hashlib.sha256(data).hexdigest() != entry['sha256'] or len(data) != entry['bytes']:
            raise SetupError('PRODUCT_BYTES_CHANGED')


def private_directory(path, shared=False):
    # Never create, chmod or migrate existing data directories for a new quota.
    info = path.lstat()
    mode = stat.S_IMODE(info.st_mode)
    if (not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid()
            or path.resolve() != path or (mode & 0o022 if shared else mode != 0o700)):
        raise SetupError('RUNTIME_DIRECTORY_UNSAFE')


def private_file(path):
    info = path.lstat()
    if (not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600
            or info.st_uid != os.geteuid() or info.st_nlink != 1):
        raise SetupError('RUNTIME_FILE_UNSAFE')


@contextmanager
def runtime_lease(home):
    base = home / '.ptds'
    private_directory(base, shared=True)
    for p in (base / 'runtime', base / 'runtime/h5-r02'):
        private_directory(p)
    runtime = base / 'runtime/h5-r02'
    # Initial local verification already created this ledger. Missing means stop.
    private_file(runtime / 'ocr-budget-v2.json')
    private_file(runtime / 'gateway.lock')
    fd = os.open(runtime / 'gateway.lock', os.O_RDWR | os.O_NOFOLLOW)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SetupError('BUDGET_ALREADY_OWNED') from None
        pending = runtime / 'ocr-budget-v2.pending'
        if pending.exists() or pending.is_symlink():
            raise SetupError('PENDING_LEDGER_REQUIRES_REVIEW')
        yield runtime
    finally:
        os.close(fd)


def make_configuration(secret_id, secret_key, trial_token):
    from gateway.ocr import Configuration
    env = json.loads((ROOT / 'deploy/PUBLIC_CONFIG.example.json').read_text())
    env['PTDS_PUBLIC_ORIGIN'] = 'https://' + HOSTNAME
    config = Configuration(env, {'tencentSecretId': secret_id,
                                'tencentSecretKey': secret_key,
                                'trialToken': trial_token})
    if not config.enabled:
        raise SetupError('OCR_CONFIGURATION_INCOMPLETE')
    return config


def connector_command(binary, token):
    if not isinstance(token, str) or len(token) < 64 or not token.isascii() or any(c.isspace() for c in token):
        raise SetupError('PASTE_TUNNEL_TOKEN_ONLY_NOT_WHOLE_COMMAND')
    # No inherited TUNNEL_*, account environment, or default ~/.cloudflared config.
    env = {'PATH': '/usr/bin:/bin:/usr/sbin:/sbin', 'TUNNEL_TOKEN': token}
    command = [binary, 'tunnel', '--config', '/dev/null', '--origincert', '/dev/null',
               '--no-autoupdate', '--metrics', '127.0.0.1:0', '--loglevel', 'error', 'run']
    return command, env


def stop_child(child):
    if child is not None and child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)


def serve(config, runtime, tunnel_token, binary):
    from gateway.server import Server
    command, env = connector_command(binary, tunnel_token)
    server = Server(('127.0.0.1', PORT), ROOT / 'web', runtime / 'ocr-budget-v2.json', config)
    child = None
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    try:
        thread.start()
        print('本机网关已启动；正在启动你配置的受邀隧道。窗口必须保持打开。')
        print('测试地址：https://' + HOSTNAME)
        print('识别试用码（私下给受邀者，重启会更换）：' + config.token)
        print('腾讯密钥和隧道令牌不写文件。请先做未邀请拒绝、手机蜂窝网及虚构图验收。')
        # Suppress connector logs: never capture auth headers/tokens or request bodies.
        child = subprocess.Popen(command, env=env, stdin=subprocess.DEVNULL,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        while child.poll() is None:
            if not thread.is_alive():
                raise SetupError('LOCAL_SERVER_STOPPED')
            time.sleep(0.5)
        raise SetupError('TUNNEL_EXITED_CHECK_DASHBOARD_WITHOUT_PASTING_TOKEN')
    finally:
        stop_child(child)
        if thread.is_alive():
            server.shutdown()
            thread.join(timeout=5)
        server.server_close()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start', action='store_true', help='operator starts an already configured Access-protected tunnel')
    args = parser.parse_args(argv)
    if not args.start:
        parser.print_help()
        return 0
    if not sys.stdin.isatty() or not sys.stderr.isatty():
        print('INTERACTIVE_TERMINAL_REQUIRED')
        return 2
    try:
        verify_product()
        binary = shutil.which('cloudflared')
        if not binary:
            raise SetupError('CLOUDFLARED_NOT_INSTALLED_NO_AUTO_INSTALL')
        print('先在Cloudflare配好整站Access邮箱允许名单、Protect with Access及本机18793路由。')
        print('本工具不会替你改DNS或访问控制。启动后会按已有隧道配置提供公网服务。')
        with runtime_lease(Path.home()) as runtime:
            with warnings.catch_warnings():
                warnings.simplefilter('error', getpass.GetPassWarning)
                secret_id = getpass.getpass('腾讯 SecretId（隐藏输入）: ')
                secret_key = getpass.getpass('腾讯 SecretKey（隐藏输入）: ')
                tunnel_token = getpass.getpass('Cloudflare 隧道Token（仅token，隐藏输入）: ')
            config = make_configuration(secret_id, secret_key, secrets.token_urlsafe(32))
            del secret_id, secret_key
            serve(config, runtime, tunnel_token, binary)
    except (KeyboardInterrupt, EOFError):
        print('\n已退出本工具；隧道/网关已停止，费用账本保留。')
        return 130
    except getpass.GetPassWarning:
        print('HIDDEN_INPUT_UNAVAILABLE；未启动。')
        return 2
    except SetupError as error:
        print(str(error))
        return 2
    except Exception:
        # No exception objects, repr(config), credentials, provider errors or tracebacks.
        print('START_STOPPED：配置/文件/端口/账本错误，未自动修复或重置；请只回报错误码。')
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
