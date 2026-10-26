#!/usr/bin/env bash
# Parallel: one-command setup + run for macOS / Linux.
# Usage: ./run.sh            (first run installs everything, builds the dataset and trains models)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
# Another copy of Parallel on these ports would silently answer instead of this one.
for port in 8787 5180; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    echo "Port $port is already in use (another Parallel or dev server?). Stop it and run this script again."
    command -v lsof >/dev/null && lsof -nP -iTCP:"$port" -sTCP:LISTEN
    exit 1
  fi
done
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  echo "→ Creating Python virtual environment"
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
if [ ! -f models/LATEST ] || [ ! -d "models/$(cat models/LATEST 2>/dev/null)" ]; then
  echo "→ Generating the synthetic dataset (60 users × 30 days) and training models (~1 min)"
  python -m ml.dataset --users 60 --days 30
  python -m ml.train
fi
echo "→ Starting API on http://127.0.0.1:8787"
python -m uvicorn app.main:app --port 8787 &
API_PID=$!
trap "kill $API_PID 2>/dev/null" EXIT
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
echo "→ Starting web app on http://localhost:5180"
npm run dev -- --port 5180 --strictPort
