#!/bin/zsh
set -e
cd -- "${0:A:h}"
exec python3 -B -m deploy.invite_runner --start
