#!/usr/bin/env bash
# Refresh Torvik predictions from this machine and push them, which redeploys the site.
# Torvik blocks GitHub's runners, so scheduled updates run here instead (see README).
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" # cron's PATH is minimal

if [ -n "$(git status --porcelain)" ]; then
  echo "$(date): working tree has local changes; skipping so they aren't committed" >&2
  exit 1
fi

git checkout -q main
git pull -q --ff-only origin main

if ! python3 scripts/refresh-torvik.py; then
  git checkout -q -- public/data/torvik.json
  echo "$(date): Torvik refresh failed; nothing pushed" >&2
  exit 1
fi

git add public/data/torvik.json
git commit -q -m "Refresh Torvik predictions"
git push -q origin main
echo "$(date): pushed refreshed predictions"
