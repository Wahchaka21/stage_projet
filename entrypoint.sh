#!/bin/sh
set -eu

if [ -n "${APP_DIR:-}" ]; then
  cd "$APP_DIR"
fi

if [ ! -d node_modules ]; then
  echo "==> Installing npm dependencies in ${APP_DIR:-$(pwd)}"
  npm ci
fi

echo "==> Running: $*"
exec "$@"