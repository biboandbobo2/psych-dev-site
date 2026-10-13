#!/usr/bin/env bash
# Нарезка изменённых мест готового ролика в один короткий клип — для показа правок автору.
#   tools/cut.sh preschool 0:28-0:40 1:42-1:55
# Каждый отрезок берётся с запасом в 1 с по краям; между отрезками — 0,5 с чёрного.
# Результат: <эпизод>/renders/changes.mp4.
set -euo pipefail
ep="$(cd "$(dirname "$0")/.." && pwd)/$1"; shift
src="$ep/$(grep -o 'shortest renders/[^ ]*\.mp4' "$ep/render.sh" | cut -d' ' -f2)"  # финальный файл из render.sh
sec() { awk -F: '{ print (NF == 2 ? $1 * 60 + $2 : $1) }' <<< "$1"; }
list="$ep/renders/parts.txt"; : > "$list"; n=0
for range in "$@"; do
  a="$(sec "${range%-*}")"; b="$(sec "${range#*-}")"
  a="$(awk -v a="$a" 'BEGIN { print (a > 1 ? a - 1 : 0) }')"; b="$(awk -v b="$b" 'BEGIN { print b + 1 }')"
  ffmpeg -hide_banner -loglevel error -y -ss "$a" -to "$b" -i "$src" \
    -vf "tpad=stop_mode=add:stop_duration=0.5:color=black" -af "apad=pad_dur=0.5" \
    -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k "$ep/renders/part-$n.mp4"
  echo "file 'part-$n.mp4'" >> "$list"; n=$((n + 1))
done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$list" -c copy "$ep/renders/changes.mp4"
rm -f "$ep"/renders/part-*.mp4 "$list"
echo "✔ $ep/renders/changes.mp4 (из $(basename "$src"))"
