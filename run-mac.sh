#!/bin/bash
# Dev launcher for macOS. Backend needs root for BPF capture + psutil.net_connections.
cd "$(dirname "$0")"
sudo -v || exit 1
(cd frontend && exec node_modules/.bin/vite) &
FE=$!
trap 'kill $FE 2>/dev/null' EXIT INT TERM
cd backend && sudo ../.venv/bin/python run_backend.py
