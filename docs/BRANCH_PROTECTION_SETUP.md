# Branch Protection Setup (main)

Use this guide to enforce PR-only changes into `main` with required review and CI checks.

## 0) Prerequisite
1. In `.github/CODEOWNERS`, replace `@MY_GITHUB_USERNAME` with your real GitHub handle.
2. Make sure CI checks appear in GitHub at least once (open any PR after this branch is pushed).

## 1) Configure branch protection for `main`
1. Open GitHub repository.
2. Go to `Settings` -> `Branches`.
3. In `Branch protection rules`, click `Add rule` (or `Add branch protection rule`).
4. `Branch name pattern`: `main`.

Enable these options:
- `Require a pull request before merging`
- `Require approvals`: `1`
- `Require review from Code Owners`
- `Require conversation resolution before merging`
- `Require status checks to pass before merging`
- `Require branches to be up to date before merging` (recommended)
- `Do not allow bypassing the above settings` (recommended)
- `Include administrators` (recommended, if you also want admin pushes blocked)

Leave disabled:
- `Allow force pushes`
- `Allow deletions`

## 2) Required status checks
Inside `Require status checks to pass before merging`, select:
- `Root Checks` (from CI workflow)
- `Functions Checks` (from CI workflow)

If checks are not visible:
1. Open a PR with this branch.
2. Wait until CI finishes once.
3. Return to branch protection and select checks.

## 3) Merge strategy recommendation
Go to `Settings` -> `General` -> `Pull Requests`:
- Enable `Allow squash merging` (recommended default).
- Optional: disable `Allow merge commits` and `Allow rebase merging` to standardize history.

## 4) Access for second developer
You can invite collaborator manually in GitHub:
- `Settings` -> `Collaborators` -> `Add people`.
- Add: `shaginov.sergo@gmail.com`.

## 5) Expected result
- Direct pushes to `main` are blocked.
- Every change to `main` goes through PR.
- At least one approval is required.
- All review conversations must be resolved.
- CI checks must pass before merge.
