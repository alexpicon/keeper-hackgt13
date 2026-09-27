#!/bin/sh
# Author: Alex Picon <alexnpc@me.com>
set -eu
cd "$(dirname "$0")"
exec uv run uvicorn server.main:apps_server --host "${HOST:-127.0.0.1}" --port "${PORT:-8888}" "$@"
