#!/bin/sh
set -eu

if [ -n "${APP_DIR:-}" ]; then
  cd "$APP_DIR"
fi

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "==> Installing npm dependencies in ${APP_DIR:-$(pwd)}"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
fi

echo "==> Running: $*"
exec "$@"
