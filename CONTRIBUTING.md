# Contributing

## Branches
Create all work in feature branches from `main`:
- `feature/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`

Do not push directly to `main`. Use Pull Requests only.

## Pull Requests
Each PR should be focused and include:
- clear summary of what changed and why;
- local verification steps;
- screenshots/video for UI changes;
- risk and rollback notes;
- linked issue/task (`Closes #...` when applicable).

PR must pass required CI checks and receive required approvals before merge.

## Local setup and checks
Use Node and npm versions compatible with project config (`.nvmrc`, `package.json` engines).

Main app:
```bash
npm ci
npm run dev
npm run lint
npm run test -- --run
npm run build
```

Functions (when changed):
```bash
cd functions
npm ci
npm run test
npm run build
```

## Commit style
Keep commits small and descriptive. A simple format is enough:
- `feat: add X`
- `fix: correct Y`
- `chore: update Z`

Avoid mixing unrelated changes in one commit.

## Vercel previews
- Every PR should produce a Vercel Preview Deployment for validation.
- Merges to `main` trigger Production deployment.
- Do not introduce secrets in code or PR descriptions.
