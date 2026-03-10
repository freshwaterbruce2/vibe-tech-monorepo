# API Credential Migration Guide

**Date:** January 7, 2026
**Priority:** HIGH (Security Best Practice)
**Estimated Time:** 5 minutes

## Overview

NOVA Agent now uses **Windows Credential Manager** for secure API key storage (2026 security best practice). This guide explains how to migrate from `.env` file storage to the secure credential store.

## Why Migrate?

### Security Risks of .env Files

- ❌ **Plaintext storage** - API keys visible to anyone with file access
- ❌ **Accidental git commits** - Easy to leak credentials to version control
- ❌ **File permissions** - Difficult to manage access control
- ❌ **Backup exposure** - Keys copied to backup locations

### Benefits of Windows Credential Manager

- ✅ **Encrypted storage** - Windows encrypts all credentials automatically
- ✅ **User-level access** - Only your Windows account can access
- ✅ **Enterprise persistence** - Credentials sync across domain-joined machines
- ✅ **No accidental leaks** - Never committed to git or backups
- ✅ **OS-managed security** - Windows handles encryption keys and updates

## Migration Options

Choose your preferred migration method:

### Option 1: Automatic Migration (Recommended)

**One-Click Migration via Tauri Command**

```typescript
// Frontend TypeScript code
import { invoke } from '@tauri-apps/api/core';

async function migrateCredentials() {
  try {
    const result = await invoke('migrate_credentials_from_env');
    console.log(result);  // "Migration complete. Please verify credentials work, then delete .env file."
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
```

**Steps:**

1. Open NOVA Agent
2. Go to Settings → Security
3. Click "Migrate Credentials from .env"
4. Verify the migration succeeded
5. Test API functionality (chat, code generation)
6. **Manually delete `.env` file** (IMPORTANT!)

### Option 2: Manual Migration (PowerShell)

**For advanced users or automation scenarios**

```powershell
# Navigate to NOVA Agent directory
cd C:\dev\apps\nova-agent\src-tauri

# Build the project (if not already built)
cargo build --release

# Run migration command
cargo run --release -- migrate

# Or use the Rust REPL to call the function directly
```

### Option 3: Individual Key Migration (UI)

**Manually set each credential through the UI**

```typescript
import { invoke } from '@tauri-apps/api/core';

// Set individual credentials
await invoke('set_api_credential', {
  keyName: 'deepseek_api_key',
  apiKey: 'sk-your-deepseek-key-here'
});

await invoke('set_api_credential', {
  keyName: 'groq_api_key',
  apiKey: 'gsk_your-groq-key-here'
});

// Repeat for openrouter_api_key, google_api_key
```

## Verification Steps

### 1. Check Credential Status

```typescript
import { invoke } from '@tauri-apps/api/core';

async function checkCredentialStatus() {
  const status = await invoke('get_api_credential_status');
  console.log(status);
  // {
  //   "deepseek": true,   // Stored securely
  //   "groq": true,
  //   "openrouter": false, // Not yet set
  //   "google": true
  // }
}
```

### 2. Test API Functionality

After migration, test each API provider:

- **DeepSeek**: Send a chat message
- **Groq**: Generate code
- **OpenRouter**: Query alternative models
- **Google**: Use Gemini features

### 3. Verify Windows Credential Manager

**Manual Verification (Advanced)**

1. Press `Win + R`
2. Type `control /name Microsoft.CredentialManager`
3. Click "Windows Credentials"
4. Look for entries starting with `nova-agent:`
   - `nova-agent:deepseek_api_key`
   - `nova-agent:groq_api_key`
   - `nova-agent:openrouter_api_key`
   - `nova-agent:google_api_key`

## Backward Compatibility

NOVA Agent maintains **backward compatibility** during migration:

### Fallback Behavior

```rust
// Rust backend logic
fn get_api_key(key_name: &str, env_var: &str) -> Option<String> {
    // 1. Try Windows Credential Manager first
    if let Ok(Some(key)) = CredentialStore::get(key_name) {
        return Some(key);  // Secure storage wins
    }

    // 2. Fallback to .env file
    if let Ok(key) = std::env::var(env_var) {
        return Some(key);  // Legacy support
    }

    // 3. No credential found
    None
}
```

**This means:**

- Migrated credentials take priority
- `.env` still works if credentials not migrated
- Gradual migration possible (migrate one key at a time)
- No downtime during migration

## Security Recommendations

### Immediate Actions (After Migration)

1. **Delete `.env` file**

   ```powershell
   cd C:\dev\apps\nova-agent
   Remove-Item .env -Confirm
   ```

2. **Add `.env` to `.gitignore`** (already done)

   ```gitignore
   # .gitignore (already configured)
   .env
   .env.local
   .env.*.local
   ```

3. **Verify no credentials in git history**

   ```powershell
   git log --all --full-history -- .env
   # If .env appears, consider git-filter-repo to remove it
   ```

### Long-Term Security

1. **Rotate API keys** after migration (optional but recommended)
2. **Enable 2FA** on API provider accounts
3. **Monitor API usage** for unauthorized access
4. **Regular key rotation** (every 90 days)

## Troubleshooting

### Issue: "Failed to access credential store"

**Cause:** Windows Credential Manager not accessible

**Solutions:**

```powershell
# Check Windows Credential Manager service
Get-Service VaultSvc | Select-Object Status, StartType
# Should show: Status=Running, StartType=Automatic

# Restart service if stopped
Start-Service VaultSvc

# Check user permissions
whoami
# Should be local administrator or user with credential access
```

### Issue: "Migration succeeded but APIs still failing"

**Cause:** Typo in migrated credentials or network issues

**Solutions:**

1. **Re-enter credentials manually**

   ```typescript
   await invoke('set_api_credential', {
     keyName: 'deepseek_api_key',
     apiKey: 'sk-correct-key-here'
   });
   ```

2. **Check API provider status** (DeepSeek, Groq, OpenRouter, Google)

3. **Verify network connectivity**

   ```powershell
   Test-NetConnection api.deepseek.com -Port 443
   ```

### Issue: "Credentials exist but NOVA doesn't use them"

**Cause:** Rebuild required after credential migration

**Solution:**

```powershell
cd C:\dev\apps\nova-agent
pnpm run build:frontend
cargo build --release
pnpm run dev  # or pnpm run start
```

### Issue: "Want to revert to .env"

**Cause:** Preference for file-based config or credential manager issues

**Solution:**

```rust
// Temporarily disable credential manager (not recommended)
// Edit src-tauri/src/modules/state.rs:
let deepseek_api_key = env::var("DEEPSEEK_API_KEY").unwrap_or_default();
// Remove CredentialStore::get_with_fallback() calls
```

**Better approach:** Fix credential manager issues instead of reverting

## API Key Reference

### Supported Credential Keys

| Credential Name | Environment Variable | API Provider |
|-----------------|---------------------|--------------|
| `deepseek_api_key` | `DEEPSEEK_API_KEY` | DeepSeek (primary model) |
| `groq_api_key` | `GROQ_API_KEY` | Groq (fast inference) |
| `openrouter_api_key` | `OPENROUTER_API_KEY` | OpenRouter (model marketplace) |
| `google_api_key` | `GOOGLE_API_KEY` | Google Gemini 2.0 Flash |

### Credential Format Validation

```typescript
const API_KEY_PATTERNS = {
  deepseek: /^sk-[a-zA-Z0-9]{32,}$/,
  groq: /^gsk_[a-zA-Z0-9]{32,}$/,
  openrouter: /^sk-or-v1-[a-zA-Z0-9]{64}$/,
  google: /^AIza[a-zA-Z0-9_-]{35}$/,
};

function validateApiKey(provider: string, key: string): boolean {
  const pattern = API_KEY_PATTERNS[provider];
  return pattern ? pattern.test(key) : false;
}
```

## Advanced Usage

### Programmatic Credential Management

```typescript
import { invoke } from '@tauri-apps/api/core';

// Check all credential statuses
const status = await invoke('get_api_credential_status');

// Set new credential
await invoke('set_api_credential', {
  keyName: 'deepseek_api_key',
  apiKey: 'sk-new-rotated-key'
});

// Delete credential (for rotation or cleanup)
await invoke('delete_api_credential', {
  keyName: 'old_api_key'
});
```

### Credential Rotation Script

```powershell
# credential_rotation.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$Provider,

    [Parameter(Mandatory=$true)]
    [string]$NewApiKey
)

# Map provider to credential key
$keyMap = @{
    "deepseek" = "deepseek_api_key"
    "groq" = "groq_api_key"
    "openrouter" = "openrouter_api_key"
    "google" = "google_api_key"
}

$keyName = $keyMap[$Provider]

# Delete old credential
cmdkey /delete:"nova-agent:$keyName"

# Set new credential (via NOVA Agent UI or Tauri command)
Write-Host "Old credential deleted. Set new credential via NOVA Agent UI."
```

## Resources

### Documentation

- [keyring-rs crate documentation](https://docs.rs/keyring)
- [Windows Credential Manager docs](https://docs.rs/keyring/latest/x86_64-pc-windows-msvc/keyring/windows/index.html)
- [NOVA Agent CLAUDE.md](../CLAUDE.md)
- [Verification Report](./VERIFICATION_REPORT_2026.md)

### Related Files

- **Backend Module:** `src-tauri/src/modules/credentials.rs`
- **State Management:** `src-tauri/src/modules/state.rs`
- **Main Entry:** `src-tauri/src/main.rs` (Tauri commands)
- **Frontend UI:** `src/pages/Settings.tsx` (credential management page)

## Support

### Questions or Issues?

1. **Check logs**

   ```powershell
   Get-Content D:\logs\nova-agent.log -Tail 50
   ```

2. **Enable debug logging**

   ```toml
   # Cargo.toml or RUST_LOG environment variable
   RUST_LOG=nova_agent::modules::credentials=debug
   ```

3. **Report issues**
   - GitHub Issues (if open source)
   - Internal bug tracker (if private)

---

**Last Updated:** January 7, 2026
**Version:** 1.0.0
**Status:** Production-Ready

**⚠️ SECURITY REMINDER:** Always delete `.env` file after successful migration to prevent credential leaks.
