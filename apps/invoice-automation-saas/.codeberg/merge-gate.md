# Merge Gate Policy (GitHub Manual Process)

This app uses GitHub branch checks for validation and a **manual merge policy**.

## How it works

- Required checks: `invoice-automation-saas:typecheck`, `invoice-automation-saas:build`
- Optional checks: `invoice-automation-saas:lint`, `invoice-automation-saas:test`
- Merge is manual and happens once checks are green.
- Draft merges are blocked by project branch policy.

## GitHub branch policy

1. Go to repository **Settings → Branches → Branch protection rules**.
2. For `main`, enforce PR checks for:
   - `invoice-automation-saas-pr-checks`
3. Recommend keeping head branch cleanup enabled where supported.

## Daily workflow

1. Open a PR
2. Confirm required checks are green.
3. Merge from GitHub web UI or your preferred Git client.

## Notes

- Dependency update PRs are handled manually using the same required checks.
