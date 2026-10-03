#!/usr/bin/env bash
# Обложка YouTube: снимок композиции cover/ → cover/cover-youtube.jpg (1280×720, < 2 МБ)
set -euo pipefail
cd "$(dirname "$0")"
rm -rf cover/snapshots
npx --yes hyperframes@0.8.78 snapshot cover --at 1 >/dev/null
ffmpeg -hide_banner -loglevel error -y -i cover/snapshots/frame-00-at-1s.png -vf scale=1280:720:flags=lanczos -q:v 2 cover/cover-youtube.jpg
rm -rf cover/snapshots
echo "✔ cover/cover-youtube.jpg"
