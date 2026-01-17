# Cloud Run revision cleanup scripts

These scripts remove Cloud Run revisions with **traffic=0** that are **older than a TTL**, while keeping the last N revisions for rollback.
Default mode is DRY_RUN; use --execute / -Execute to delete.

## Prerequisites
- gcloud CLI installed and authenticated.
- Permissions to list and delete Cloud Run revisions.
- Project set or provided via --project / -Project.

## Bash (macOS/Linux)

Dry run:
```bash
./scripts/cleanup_cloud_run_revisions.sh
```

Execute (deletes):
```bash
./scripts/cleanup_cloud_run_revisions.sh --execute
```

Override defaults:
```bash
./scripts/cleanup_cloud_run_revisions.sh \
  --project psych-dev-site-prod \
  --keep-last 2 \
  --ttl-days 14
```

## PowerShell (Windows)

Dry run:
```powershell
./scripts/cleanup_cloud_run_revisions.ps1
```

Execute (deletes):
```powershell
./scripts/cleanup_cloud_run_revisions.ps1 -Execute
```

Override defaults:
```powershell
./scripts/cleanup_cloud_run_revisions.ps1 -Project psych-dev-site-prod -KeepLastN 2 -TtlDays 14
```

## Variables to change
- PROJECT / Project
- KEEP_LAST_N / KeepLastN
- TTL_DAYS / TtlDays

## Notes
- Revisions with traffic > 0 are never deleted.
- The last KEEP_LAST_N revisions are always kept.
- For automation, run the script with --execute on a schedule.

## GitHub Actions (optional)
The workflow expects a secret named `GCP_SA_KEY` containing a service account JSON.
The service account needs permissions to list and delete Cloud Run revisions.
