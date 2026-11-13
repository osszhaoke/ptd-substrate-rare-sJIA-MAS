#!/bin/zsh
set -eu
cd -- "${0:A:h}/../.."
exec python3 -B evidence/r30-public01/operator_bootstrap.py
