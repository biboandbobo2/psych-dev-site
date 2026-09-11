"""Rebuild licensed responsive assets from the reviewed manifest (requires Pillow).

Usage: python3 scripts/iconography/prepare-images.py --cache /tmp/iconography-images
Sources are never fetched by the client. A changed source hash requires editorial review.
"""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cache', type=Path, required=True)
args = parser.parse_args()
args.cache.mkdir(parents=True, exist_ok=True)
manifest = json.loads((REPO / 'scripts/iconography/media-manifest.json').read_text())
for item in manifest:
    if item['license'] not in ['CC0', 'Общественное достояние (PD-Art)', 'CC BY-SA 4.0']:
        raise ValueError(f"Unreviewed license: {item['id']}")
    source = args.cache / (item['id'] + '.jpg')
    if not source.exists():
        request = urllib.request.Request(item['url'], headers={'User-Agent': 'AcademyIconography/1.0 educational asset preparation'})
        with urllib.request.urlopen(request, timeout=60) as response:
            content = response.read(40 * 1024 * 1024 + 1)
        if len(content) > 40 * 1024 * 1024:
            raise ValueError('Source exceeds the 40 MiB editorial limit')
        if hashlib.sha256(content).hexdigest() != item['sha256']:
            raise ValueError(f"Source changed: {item['id']}. Review before updating the manifest.")
        source.write_bytes(content)
    if hashlib.sha256(source.read_bytes()).hexdigest() != item['sha256']:
        raise ValueError(f"Cached source hash mismatch: {item['id']}")
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    for width in item['widths']:
        if width > image.width:
            raise ValueError('Do not upscale catalogue assets')
        resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        resized.save(REPO / f"public/iconography/images/{item['id']}-{width}.webp", quality=83, method=6)
    print(f"Prepared {item['id']}")
