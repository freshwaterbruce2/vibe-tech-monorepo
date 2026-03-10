# pnpm Hoisting Fix

**Date:** 2026-01-25
**Issue:** 40 separate node_modules directories despite hoisting enabled
**Wasted Space:** ~1.4GB in duplicated dependencies

---

## Current Configuration

`.npmrc` already has the correct settings:
```ini
node-linker=hoisted
shamefully-hoist=true
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
public-hoist-pattern[]=*typescript*
public-hoist-pattern[]=@nx/*
public-hoist-pattern[]=nx
```

---

## The Problem

pnpm hoisting only applies to **new installations**. Existing node_modules and pnpm-lock.yaml maintain the old structure.

**Evidence:**
- Root: 2,369 packages
- Apps: 31-54 packages each (should be 0-5)
- Packages: Similar duplication

---

## Solution Steps

### Step 1: Backup Current State

```powershell
# Create D:\ snapshot before making changes
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Before pnpm hoisting fix" -Tag "pre-hoisting-fix"
```

### Step 2: Clean Everything

```bash
# Remove all node_modules directories
pnpm clean  # If you have this script
# OR
find . -name "node_modules" -type d -prune -exec rm -rf {} +

# Remove pnpm lockfile
rm pnpm-lock.yaml

# Clear pnpm cache (optional, but recommended)
pnpm store prune
```

### Step 3: Reinstall with Hoisting

```bash
# Fresh install with hoisting enabled
pnpm install --force

# Verify hoisting worked
find apps/ -name "node_modules" -type d -maxdepth 2 | wc -l
# Should be 0 or very few (only apps with conflicting versions)
```

---

## Expected Results

**After reinstall:**
- Root node_modules: ~2,500-3,000 packages (all hoisted)
- App-specific node_modules: 0-5 (only conflicting versions)
- Disk space saved: ~1.2GB
- Build performance: Faster (less I/O)
- Install time: Faster (less duplication)

---

## Verification

```bash
# Count app node_modules
find apps/ -name "node_modules" -type d -maxdepth 2 | wc -l

# Check sizes
du -sh node_modules
du -sh apps/*/node_modules | head -5

# Verify root has most packages
ls node_modules | wc -l  # Should be 2500+
ls apps/nova-agent/node_modules 2>/dev/null | wc -l  # Should be 0 or <5
```

---

## Exceptions

Some apps **may** still have local node_modules if they have:
1. **Native modules** requiring specific compilation (bcrypt, better-sqlite3)
2. **Conflicting versions** with other apps
3. **Peer dependency conflicts**

This is normal and acceptable (usually 0-10 packages).

---

## Alternative: Gradual Fix

If you don't want to nuke everything:

```bash
# Check which apps have the most duplication
for dir in apps/*/; do
  count=$(ls "$dir/node_modules" 2>/dev/null | wc -l)
  if [ $count -gt 0 ]; then
    echo "$count packages in $dir"
  fi
done

# Fix one app at a time
cd apps/nova-agent
rm -rf node_modules
pnpm install
```

---

## Related Documentation

- **pnpm workspaces:** https://pnpm.io/workspaces
- **Hoisting:** https://pnpm.io/npmrc#public-hoist-pattern
- **D:\ Snapshots:** `.claude/rules/d-drive-version-control.md`

---

**Status:** Ready to apply
**Risk:** Low (with D:\ snapshot backup)
**Time:** ~10-15 minutes for full reinstall
