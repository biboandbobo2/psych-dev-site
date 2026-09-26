#!/usr/bin/env bash
# Полная пересборка ролика: музыка → видео (HyperFrames) → сведение и финальное кодирование.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p renders

SF="${SOUNDFONT:-/usr/share/sounds/sf3/MuseScore_General_Full.sf3}"
HF="${HYPERFRAMES:-npx --yes hyperframes@0.8.78}"
PRE="atrim=0:190,asetpts=N/SR/TB,afade=t=in:st=0:d=0.05,afade=t=out:st=186.5:d=3.5,highpass=f=30"

echo "▶ Музыка: партитура → MIDI → WAV"
(cd music && python3 compose.py)
fluidsynth -ni -q -g 0.6 -r 48000 \
  -o synth.reverb.active=1 -o synth.reverb.room-size=0.72 -o synth.reverb.damp=0.35 \
  -o synth.reverb.width=0.9 -o synth.reverb.level=0.6 -o synth.chorus.active=0 \
  -F renders/music_raw.wav "$SF" music/infancy.mid

echo "▶ Музыка: нормализация громкости к −18 LUFS (два прохода, линейно)"
read -r MI MTP MLRA MTH OFF < <(ffmpeg -hide_banner -nostats -i renders/music_raw.wav \
  -af "$PRE,loudnorm=I=-18:TP=-2:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/{/,/}/p' |
  python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
ffmpeg -hide_banner -loglevel error -y -i renders/music_raw.wav \
  -af "$PRE,loudnorm=I=-18:TP=-2:LRA=11:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$OFF:linear=true" \
  -ar 48000 -c:a pcm_s24le renders/music_master.wav

echo "▶ Видео: рендер HyperFrames (1920×1080, 30 fps)"
$HF render . -o renders/video.mp4 --fps 30 --quality high --workers 4

echo "▶ Сведение и финальное кодирование (H.264 + AAC, faststart)"
ffmpeg -hide_banner -loglevel error -y -i renders/video.mp4 -i renders/music_master.wav \
  -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 18 -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart -shortest renders/infancy-first-year.mp4
ffmpeg -hide_banner -loglevel error -y -ss 11 -i renders/infancy-first-year.mp4 -frames:v 1 renders/poster.png
echo "✔ Готово: renders/infancy-first-year.mp4 (+ обложка renders/poster.png)"
