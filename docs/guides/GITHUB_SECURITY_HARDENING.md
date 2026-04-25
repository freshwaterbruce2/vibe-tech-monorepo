# GitHub Repository Security Hardening Guide

> **Repository**: github.com/freshwaterbruce2/vibe-tech-monorepo (private)
> **Created**: March 10, 2026
> **Based on**: 2026 GitHub security best practices

This guide covers every setting to configure after creating the GitHub repo.

---

## Step 0: Create Repo and Push

```powershell
# If repo doesn't exist yet:
gh repo create freshwaterbruce2/vibe-tech-monorepo --private --source=. --push

# If repo exists, set remote and push:
git remote set-url origin https://github.com/freshwaterbruce2/vibe-tech-monorepo.git
git push -u origin main
```

---

## Step 1: Branch Protection Rulesets (NOT Legacy Rules)

**Location**: Settings > Rules > Rulesets > New ruleset > New branch ruleset

GitHub rulesets are the modern replacement for legacy branch protection rules. They're more flexible, support org-level policies, and can target multiple branches.

### Create Ruleset: "Protect main"

| Setting | Value |
|---------|-------|
| **Ruleset name** | `Protect main` |
| **Enforcement** | `Active` |
| **Target branches** | `main` |

### Rules to enable:

- **Restrict deletions**: ON
- **Require linear history**: ON (keeps git history clean)
- **Require a pull request before merging**:
  - Required approvals: `0` (solo dev; set to 1+ for teams)
  - Dismiss stale PR approvals: ON
  - Require review from CODEOWNERS: ON
  - Require conversation resolution: ON
- **Require status checks to pass**:
  - Require branches to be up to date: ON
  - Add these status checks:
    - `Quality Gates`
    - `Build`
- **Block force pushes**: ON
- **Require signed commits**: ON (recommended but optional for solo)

---

## Step 2: Secret Scanning + Push Protection

**Location**: Settings > Code security and analysis

| Setting | Action |
|---------|--------|
| **Dependency graph** | Enable |
| **Dependabot alerts** | Enable |
| **Dependabot security updates** | Enable |
| **Secret scanning** | Enable |
| **Push protection** | Enable |

Push protection blocks commits that contain detected secrets (API keys, tokens, passwords) before they reach GitHub. This is your most important defense against credential leaks.

---

## Step 3: Code Scanning (CodeQL)

**Location**: Settings > Code security and analysis > Code scanning

- Click **Set up** > **Default**
- CodeQL will auto-detect languages (JavaScript/TypeScript)
- Runs on every PR and weekly on main

This performs static analysis to find security vulnerabilities like SQL injection, XSS, command injection, etc.

---

## Step 4: Actions Security

**Location**: Settings > Actions > General

| Setting | Value |
|---------|-------|
| **Actions permissions** | `Allow owner actions and select non-owner actions` |
| **Allow specified actions** | `actions/checkout@*, actions/setup-node@*, pnpm/action-setup@*` |
| **Fork PR workflows** | `Require approval for first-time contributors` |
| **Workflow permissions** | `Read repository contents and packages permissions` (read-only default) |

### Why this matters:
- Restricting allowed actions prevents supply chain attacks from malicious third-party actions
- Read-only default `GITHUB_TOKEN` means even if a workflow is compromised, it can't push code or modify releases
- Jobs that need write access explicitly declare `permissions: contents: write` (already done in ci.yml)

---

## Step 5: General Security Settings

**Location**: Settings > General

| Setting | Value |
|---------|-------|
| **Visibility** | Private |
| **Features > Wikis** | OFF (not needed) |
| **Features > Projects** | ON or OFF (your preference) |
| **Pull Requests > Allow merge commits** | ON |
| **Pull Requests > Allow squash merging** | ON |
| **Pull Requests > Allow rebase merging** | OFF (prevents history rewriting) |
| **Pull Requests > Auto-merge** | OFF (require manual merge) |
| **Pull Requests > Auto-delete head branches** | ON (cleanup after merge) |

---

## Step 6: Copilot / AI Settings

**Location**: Settings > Copilot (or Code security)

| Setting | Value |
|---------|-------|
| **Allow GitHub to use code for Copilot training** | OFF |
| **Copilot in PRs** | Your preference |

For a private repo with trading system code, disable Copilot training to keep your code out of AI training data.

---

## Step 7: Personal Account Security

**Location**: github.com > Settings (your profile)

| Setting | Action |
|---------|--------|
| **Two-factor authentication** | Enable (TOTP or security key) |
| **Sessions** | Review active sessions regularly |
| **Personal access tokens** | Use fine-grained tokens (NOT classic) |
| **SSH keys** | Use ed25519 keys |

### Fine-Grained PAT Settings

When creating tokens for CI/CD or local tooling:
- Set **expiration** (90 days max recommended)
- Scope to **specific repositories** only
- Grant **minimum permissions** needed
- Never use classic tokens (they have org-wide access)

---

## Step 8: Notifications

**Location**: github.com > Settings > Notifications

Enable email notifications for:
- Dependabot alerts (security vulnerabilities)
- Secret scanning alerts
- Actions failures
- PR reviews

---

## What Was Already Done (in ci.yml)

These security measures are already applied in `.github/workflows/ci.yml`:

1. **SHA-pinned actions** - All actions use full 40-char commit SHAs instead of tags
   - `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5` (v4.3.1)
   - `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` (v4.4.0)
   - `pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda` (v4.1.0)

2. **Least-privilege permissions** - Top-level `permissions: contents: read`
   - Only `release` and `self-heal` jobs elevate to `contents: write`

3. **Concurrency control** - Cancels redundant workflow runs on same branch

4. **Self-heal restricted** - Only runs on `develop`, never auto-pushes to `main`

5. **Frozen lockfile** - `pnpm install --frozen-lockfile` prevents dependency tampering

## What Was Already Created

| File | Purpose |
|------|---------|
| `.github/SECURITY.md` | Security policy and vulnerability reporting |
| `.github/CODEOWNERS` | Mandatory review for CI, security, and trading code |
| `.github/dependabot.yml` | Automated dependency vulnerability monitoring |

---

## Threat Model Summary

| Threat | Mitigation |
|--------|-----------|
| Supply chain attack via Actions | SHA-pinned actions, restricted allowed actions |
| Malicious PR injecting code | Branch protection, required status checks, CODEOWNERS |
| Credential leak | Secret scanning + push protection |
| Dependency vulnerability | Dependabot alerts + security updates |
| Code vulnerability (XSS, injection) | CodeQL code scanning |
| Unauthorized force push | Branch ruleset blocks force pushes |
| Token over-privilege | Read-only GITHUB_TOKEN default, fine-grained PATs |
| AI training data leak | Copilot training disabled |
| Compromised workflow | Self-heal restricted to develop only |

---

## Maintenance

- **Weekly**: Review Dependabot PRs, check Actions logs
- **Monthly**: Rotate any PATs, review active sessions
- **Quarterly**: Update pinned action SHAs to latest releases, review rulesets
