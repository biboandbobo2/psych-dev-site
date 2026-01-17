# CLEANUP_LOG

Timestamp (UTC): 2026-01-17T09:26:23Z

## Step 0 — Commands executed

- rg --files -g 'AGENTS.md'
  - result: No AGENTS.md found in workspace root.
- command -v jq
  - result: Found: /usr/bin/jq
- gcloud --version
  - result: Google Cloud SDK 543.0.0; bq 2.1.24; core 2025.10.10; gcloud-crc32c 1.0.0; gsutil 5.35
- gcloud auth list
  - result: Active account: biboandbobo2@gmail.com
- gcloud config set project psych-dev-site-prod
  - result: Updated property [core/project].
- gcloud config list
  - result: project=psych-dev-site-prod; account=biboandbobo2@gmail.com
- mkdir -p logs/artifact-registry-cleanup
  - result: Created logs/artifact-registry-cleanup
- gcloud run services list --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_services.json
  - result: Output saved to logs/artifact-registry-cleanup/run_services.json
- gcloud run services describe ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_service_ingestbook.json
  - result: Output saved to logs/artifact-registry-cleanup/run_service_ingestbook.json
- gcloud run revisions list --service=ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_revisions_ingestbook.json
  - result: Output saved to logs/artifact-registry-cleanup/run_revisions_ingestbook.json
- gcloud functions list --v2 --project=psych-dev-site-prod --format=json > logs/artifact-registry-cleanup/functions_v2_list.json
  - result: Output saved to logs/artifact-registry-cleanup/functions_v2_list.json
- gcloud artifacts repositories list --project=psych-dev-site-prod --format=json > logs/artifact-registry-cleanup/artifact_repos.json
  - result: Output saved to logs/artifact-registry-cleanup/artifact_repos.json
- gcloud artifacts docker images list europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json > logs/artifact-registry-cleanup/ar_images_europe-west1.json
  - result: Output saved to logs/artifact-registry-cleanup/ar_images_europe-west1.json
- gcloud artifacts docker images list us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json > logs/artifact-registry-cleanup/ar_images_us-central1.json
  - result: Output saved to logs/artifact-registry-cleanup/ar_images_us-central1.json
- gcloud artifacts repositories delete --help | sed -n "1,120p"
  - result: Checked delete command syntax.
- python3 (build summary and plan)
  - result: Wrote logs/artifact-registry-cleanup/summary.json and ARTIFACT_REGISTRY_CLEANUP_PLAN.md
## Step 1 — us-central1/gcf-artifacts cleanup

Timestamp (UTC): 2026-01-17T09:32:11Z

- gcloud artifacts docker images list us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json > logs/artifact-registry-cleanup/ar_images_us-central1_step1.json
  - result: Listed 6 images; total virtual size 1.22 GiB.
- gcloud artifacts repositories delete gcf-artifacts --location=us-central1 --project=psych-dev-site-prod --quiet
  - result: Deleted repository gcf-artifacts (us-central1).
- gcloud artifacts repositories list --project=psych-dev-site-prod --format=json > logs/artifact-registry-cleanup/artifact_repos_after_step1.json
  - result: us-central1/gcf-artifacts not present.
## Step 2 — Pre-checks (Cloud Run revisions)

Timestamp (UTC): 2026-01-17T09:35:36Z

- gcloud run services describe ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_service_ingestbook_step2.json
  - result: OK
- gcloud run revisions list --service=ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_revisions_ingestbook_step2.json
  - result: OK
- python3 (compute KEEP_LAST_N and candidates)
  - result: 23 candidates found (traffic=0, excluding KEEP_LAST_N=2)
## Step 2 — Deletions (Cloud Run revisions)

Timestamp (UTC): 2026-01-17T09:40:09Z

- gcloud run revisions delete ... (batch loop from logs/artifact-registry-cleanup/revisions_to_delete_step2.txt)
  - result: Command timed out after deleting 7 revisions (ingestbook-00001..00007).
- gcloud run revisions delete ... (batch loop from logs/artifact-registry-cleanup/revisions_to_delete_step2_remaining.txt)
  - result: Deleted 16 revisions (ingestbook-00008..00022).
- gcloud run revisions delete ingestbook-00023-lew --region=europe-west1 --project=psych-dev-site-prod --platform=managed --quiet
  - result: Deleted ingestbook-00023-lew.
- gcloud run revisions list --service=ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_revisions_ingestbook_after_step2b.json
  - result: 2 revisions remain (ingestbook-00025-mof, ingestbook-00024-qex).
## Step 3 — Pre-checks (Artifact Registry orphans)

Timestamp (UTC): 2026-01-17T10:42:59Z

- gcloud run services describe ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_service_ingestbook_step3.json
  - result: OK
- gcloud run revisions list --service=ingestbook --region=europe-west1 --project=psych-dev-site-prod --platform=managed --format=json > logs/artifact-registry-cleanup/run_revisions_ingestbook_step3.json
  - result: OK (2 revisions remain)
- gcloud functions list --v2 --project=psych-dev-site-prod --format=json > logs/artifact-registry-cleanup/functions_v2_list_step3.json
  - result: OK
- gcloud artifacts docker images list europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json > logs/artifact-registry-cleanup/ar_images_europe-west1_step3.json
  - result: OK
- python3 (compute orphans)
  - result: 24 orphan digests (untagged=23, tagged=1)
## Step 3 — Deletions (Artifact Registry digests)

Timestamp (UTC): 2026-01-17T10:50:49Z

- gcloud artifacts repositories list --project=psych-dev-site-prod --format=json > logs/artifact-registry-cleanup/artifact_repos_before_step3.json
  - result: Captured repo sizes before deletes.
- gcloud artifacts docker images delete (untagged orphans batch)
  - result: Partial success then timeout after ~60s; deletions completed for multiple digests (see terminal output).
- gcloud artifacts docker images delete (untagged orphans batch retry)
  - result: PERMISSION_DENIED for delete operations; deletion halted.
- gcloud artifacts docker images list europe-west1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --format=json > logs/artifact-registry-cleanup/ar_images_europe-west1_after_step3_attempt.json
  - result: Inventory after partial delete saved.

Note: Step 3 incomplete due to PERMISSION_DENIED for delete operations.