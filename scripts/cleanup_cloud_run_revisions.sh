#!/usr/bin/env bash
set -euo pipefail

PROJECT="psych-dev-site-prod"
KEEP_LAST_N=2
TTL_DAYS=14
EXECUTE=0

usage() {
  cat <<'USAGE'
Usage: cleanup_cloud_run_revisions.sh [--project PROJECT] [--keep-last N] [--ttl-days DAYS] [--execute]

Defaults:
  PROJECT=psych-dev-site-prod
  KEEP_LAST_N=2
  TTL_DAYS=14
  DRY_RUN (no deletions)

Examples:
  ./cleanup_cloud_run_revisions.sh
  ./cleanup_cloud_run_revisions.sh --project my-project --keep-last 2 --ttl-days 14
  ./cleanup_cloud_run_revisions.sh --execute
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --keep-last)
      KEEP_LAST_N="$2"
      shift 2
      ;;
    --ttl-days)
      TTL_DAYS="$2"
      shift 2
      ;;
    --execute)
      EXECUTE=1
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

python3 - "$PROJECT" "$KEEP_LAST_N" "$TTL_DAYS" "$EXECUTE" <<'PY'
import sys
import json
import subprocess
from datetime import datetime, timezone
import re

project = sys.argv[1]
keep_last_n = int(sys.argv[2])
ttl_days = int(sys.argv[3])
execute = bool(int(sys.argv[4]))

if keep_last_n < 1:
    raise SystemExit("KEEP_LAST_N must be >= 1")
if ttl_days < 0:
    raise SystemExit("TTL_DAYS must be >= 0")

now = datetime.now(timezone.utc)


def run_json(cmd):
    res = subprocess.run(cmd, check=True, capture_output=True, text=True)
    if not res.stdout.strip():
        return []
    return json.loads(res.stdout)


def parse_ts(value):
    if not value:
        return None
    if value.endswith('Z'):
        value = value[:-1] + '+00:00'
    match = re.match(r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.(\d+))?([+-]\d{2}:\d{2})$', value)
    if match:
        base_ts = match.group(1)
        frac = match.group(3) or ''
        tz = match.group(4)
        if frac:
            frac = (frac + '000000')[:6]
            value = f"{base_ts}.{frac}{tz}"
        else:
            value = f"{base_ts}{tz}"
    return datetime.fromisoformat(value)


def age_days(created):
    if not created:
        return None
    return (now - created).total_seconds() / 86400


services = run_json([
    "gcloud", "run", "services", "list",
    "--project", project,
    "--platform=managed",
    "--format=json",
])

if not services:
    print("No Cloud Run services found.")
    raise SystemExit(0)

print(f"Project: {project}")
print(f"KEEP_LAST_N={keep_last_n}, TTL_DAYS={ttl_days}, EXECUTE={execute}")

all_candidates = []

for svc in services:
    name = svc.get("metadata", {}).get("name")
    labels = svc.get("metadata", {}).get("labels", {})
    region = labels.get("cloud.googleapis.com/location")
    if not name or not region:
        print(f"Skip service with missing name/region: name={name}, region={region}")
        continue

    desc = run_json([
        "gcloud", "run", "services", "describe", name,
        "--project", project,
        "--platform=managed",
        "--region", region,
        "--format=json",
    ])

    revs = run_json([
        "gcloud", "run", "revisions", "list",
        "--service", name,
        "--project", project,
        "--region", region,
        "--format=json",
    ])

    traffic_map = {}
    latest_ready = desc.get("status", {}).get("latestReadyRevisionName")
    for entry in desc.get("status", {}).get("traffic", []) or []:
        rev_name = entry.get("revisionName")
        if not rev_name and entry.get("latestRevision") and latest_ready:
            rev_name = latest_ready
        if rev_name:
            traffic_map[rev_name] = entry.get("percent", 0)

    rows = []
    for rev in revs:
        rev_name = rev.get("metadata", {}).get("name")
        created = parse_ts(rev.get("metadata", {}).get("creationTimestamp"))
        traffic = traffic_map.get(rev_name, 0)
        rows.append({
            "revision": rev_name,
            "created": created,
            "traffic": traffic,
        })

    rows_sorted = sorted(
        rows,
        key=lambda r: r["created"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    keep_last = {r["revision"] for r in rows_sorted[:keep_last_n]}

    candidates = []
    for row in rows:
        if not row["revision"]:
            continue
        if row["revision"] in keep_last:
            continue
        if (row["traffic"] or 0) > 0:
            continue
        if row["created"] is None:
            continue
        if age_days(row["created"]) < ttl_days:
            continue
        candidates.append(row)

    print(f"Service {name} ({region}) candidates: {len(candidates)}")
    for c in sorted(candidates, key=lambda r: r["created"]):
        created_str = c["created"].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        print(f"  - {c['revision']} | created={created_str} | traffic={c['traffic']}")

    for c in candidates:
        all_candidates.append((name, region, c["revision"]))

if not all_candidates:
    print("No candidates to delete.")
    raise SystemExit(0)

if not execute:
    print("DRY_RUN: no deletions executed.")
    raise SystemExit(0)

for svc_name, region, revision in all_candidates:
    print(f"Deleting revision {revision} (service {svc_name}, region {region})")
    subprocess.run([
        "gcloud", "run", "revisions", "delete", revision,
        "--region", region,
        "--project", project,
        "--platform=managed",
        "--quiet",
    ], check=True)

print("Deletion run completed.")
PY
