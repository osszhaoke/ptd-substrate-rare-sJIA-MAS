#!/bin/zsh
set -eu
cd -- "${0:A:h}"
print '打开 http://127.0.0.1:18791/ ；记录按此地址留在浏览器。Ctrl+C停止本次服务。'
exec python3 -m gateway.server --port 18791 --runtime runtime/local
