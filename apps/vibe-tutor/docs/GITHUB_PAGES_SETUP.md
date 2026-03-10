# GitHub Pages Setup for Vibe Tutor Privacy Policy

This repo now includes a workflow that publishes the Vibe Tutor privacy policy to GitHub Pages.

Expected public URL:

`https://freshwaterbruce2.github.io/vibetech/privacy-policy/`

## What the workflow publishes

Source file:

- `apps/vibe-tutor/docs/privacy-policy/index.html`

Published path:

- `/privacy-policy/`

Workflow file:

- `.github/workflows/vibe-tutor-privacy-policy-pages.yml`

## One-time GitHub setup

1. Open the repository:
   `https://github.com/freshwaterbruce2/vibetech`
2. Go to `Settings -> Pages`.
3. Under `Build and deployment`, set:
   `Source -> GitHub Actions`
4. Save.

## How deployment works

The workflow runs when:

- code is pushed to `main` and one of these files changes:
  - `apps/vibe-tutor/docs/privacy-policy/**`
  - `apps/vibe-tutor/public/privacy-policy.html`
  - `apps/vibe-tutor/docs/PRIVACY_POLICY.md`
  - `apps/vibe-tutor/docs/PRIVACY_POLICY_HOSTING.md`
  - `.github/workflows/vibe-tutor-privacy-policy-pages.yml`
- or when you run it manually from the `Actions` tab

## First publish

1. Commit and push the workflow and privacy-policy files to `main`.
2. Open the `Actions` tab.
3. Wait for `Vibe Tutor Privacy Policy Pages` to finish successfully.
4. Open:
   `https://freshwaterbruce2.github.io/vibetech/privacy-policy/`

## Troubleshooting

### 404 after deploy

Check:

- `Settings -> Pages` is set to `GitHub Actions`
- the workflow ran on `main`
- the deploy job succeeded

### Wrong content published

The workflow publishes only:

- `apps/vibe-tutor/docs/privacy-policy/index.html`

If you update the markdown or other HTML copies, keep them in sync with that file.

## Recommended operating rule

Treat these files as the privacy-policy set:

- `apps/vibe-tutor/docs/PRIVACY_POLICY.md`
- `apps/vibe-tutor/public/privacy-policy.html`
- `apps/vibe-tutor/docs/privacy-policy/index.html`

If policy text changes, update all three in the same commit.
