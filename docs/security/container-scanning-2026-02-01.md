# Container Scanning Summary (2026-02-01)

Project: psych-dev-site-prod
Source: Artifact Registry auto scanning (not On-Demand Scanning)
Collected: 2026-02-01 (UTC)

Note: `gcloud artifacts docker images list-vulnerabilities` is for On-Demand Scanning only. For auto scanning results, use:
`gcloud artifacts docker images describe <IMAGE>@<DIGEST> --show-package-vulnerability --format=json`

## Image summary

| Image (digest) | Last scan time (UTC) | Top severity | Counts (CRITICAL/HIGH/MEDIUM/LOW/MINIMAL) |
|---|---|---|---|
| europe-west1-docker.pkg.dev/.../ingest_book@sha256:af07... | none | NONE | 0/0/0/0/0 |
| us-central1-docker.pkg.dev/.../send_feedback/cache@sha256:042e... | 2026-02-01T17:26:01.158766603Z | HIGH | 0/9/1/2/0 |
| us-central1-docker.pkg.dev/.../send_feedback@sha256:a54d... | 2026-02-01T16:42:35.598398337Z | HIGH | 0/15/131/45/2 |
| us-central1-docker.pkg.dev/.../toggle_user_disabled/cache@sha256:24f8... | 2026-02-01T20:11:06.465333890Z | HIGH | 0/9/1/2/0 |
| us-central1-docker.pkg.dev/.../toggle_user_disabled@sha256:55e4... | 2026-02-01T15:52:58.960339490Z | HIGH | 0/15/131/45/2 |

## Top HIGH findings (sample)

send_feedback/cache@sha256:042e...
- CVE-2025-15284 (qs, NPM) fix: 6.14.1
- CVE-2025-64756 (glob, NPM) fix: 10.5.0
- CVE-2025-66031 (node-forge, NPM) fix: 1.3.2
- CVE-2026-23745 (tar, NPM) fix: 7.5.3
- CVE-2025-65945 (jws, NPM) fix: 3.2.3

send_feedback@sha256:a54d...
- CVE-2025-4674 (go stdlib, GO_STDLIB) fix: 1.23.11
- CVE-2025-12816 (node-forge, NPM) fix: 1.3.2
- CVE-2025-64756 (glob, NPM) fix: 10.5.0
- CVE-2025-61729 (go stdlib, GO_STDLIB) fix: 1.24.11
- CVE-2025-61723 (go stdlib, GO_STDLIB) fix: 1.24.8

toggle_user_disabled/cache@sha256:24f8...
- CVE-2025-64756 (glob, NPM) fix: 10.5.0
- CVE-2026-23745 (tar, NPM) fix: 7.5.3
- CVE-2025-65945 (jws, NPM) fix: 3.2.3
- CVE-2025-66031 (node-forge, NPM) fix: 1.3.2
- CVE-2026-24842 (tar, NPM) fix: 7.5.7

toggle_user_disabled@sha256:55e4...
- CVE-2025-58187 (go stdlib, GO_STDLIB) fix: 1.24.9
- CVE-2026-23950 (tar, NPM) fix: 7.5.4
- CVE-2025-15284 (qs, NPM) fix: 6.14.1
- CVE-2025-61723 (go stdlib, GO_STDLIB) fix: 1.24.8
- CVE-2026-24842 (tar, NPM) fix: 7.5.7

## Reproduce (examples)

- List recent images:
  `gcloud artifacts docker images list us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts --include-tags --sort-by=~UPDATE_TIME --limit=50`

- Describe with vulnerabilities:
  `gcloud artifacts docker images describe us-central1-docker.pkg.dev/psych-dev-site-prod/gcf-artifacts/send_feedback@sha256:a54d... --show-package-vulnerability --format=json`
