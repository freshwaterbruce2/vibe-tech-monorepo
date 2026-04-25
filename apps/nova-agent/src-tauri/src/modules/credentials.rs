#![allow(dead_code)]
/// Windows Credential Manager integration for secure API key storage
/// 2026 Best Practice: Uses keyring-rs crate for cross-platform credential management
///
/// Security Features:
/// - Enterprise persistence (credentials persist across sessions)
/// - Windows Credential Manager native integration
/// - Thread-safe credential access
/// - Binary secret storage support
use anyhow::{Context, Result};
use keyring::Entry;
use tracing::{debug, info, warn};

/// Service name for Windows Credential Manager (matches app name)
const SERVICE_NAME: &str = "nova-agent";

/// Credential keys used in Windows Credential Manager
pub mod keys {
    pub const DEEPSEEK_API_KEY: &str = "deepseek_api_key";
    pub const GROQ_API_KEY: &str = "groq_api_key";
    pub const OPENROUTER_API_KEY: &str = "openrouter_api_key";
    pub const GOOGLE_API_KEY: &str = "google_api_key";
    pub const KIMI_API_KEY: &str = "kimi_api_key";
}

/// Secure credential store using Windows Credential Manager
///
/// ## Thread Safety
/// The keyring crate handles thread-safety internally, but concurrent
/// modifications to the same credential from different threads may
/// produce unpredictable ordering (Windows limitation).
///
/// ## Persistence
/// By default, credentials have Enterprise persistence, meaning they
/// persist across user sessions and are available on all machines in
/// the same domain (if domain-joined).
pub struct CredentialStore;

impl CredentialStore {
    /// Store an API key securely in Windows Credential Manager
    ///
    /// # Arguments
    /// * `key_name` - Credential identifier (use `keys::*` constants)
    /// * `api_key` - The API key to store securely
    ///
    /// # Security
    /// Uses `set_password()` which stores the key encrypted by Windows.
    /// The credential is only accessible by the current user.
    ///
    /// # Example
    /// ```
    /// use crate::modules::credentials::{CredentialStore, keys};
    ///
    /// CredentialStore::set(keys::DEEPSEEK_API_KEY, "sk-1234...")?;
    /// ```
    pub fn set(key_name: &str, api_key: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key_name).context("Failed to create keyring entry")?;

        entry
            .set_password(api_key)
            .context(format!("Failed to store credential: {}", key_name))?;

        info!("Stored credential securely: {}", key_name);
        Ok(())
    }

    /// Retrieve an API key from Windows Credential Manager
    ///
    /// # Arguments
    /// * `key_name` - Credential identifier (use `keys::*` constants)
    ///
    /// # Returns
    /// * `Ok(Some(String))` - API key found and retrieved
    /// * `Ok(None)` - Credential not found (not yet stored)
    /// * `Err` - System error accessing credential store
    ///
    /// # Example
    /// ```
    /// use crate::modules::credentials::{CredentialStore, keys};
    ///
    /// if let Some(key) = CredentialStore::get(keys::DEEPSEEK_API_KEY)? {
    ///     println!("Using stored API key");
    /// } else {
    ///     println!("API key not found - please configure");
    /// }
    /// ```
    pub fn get(key_name: &str) -> Result<Option<String>> {
        let entry = Entry::new(SERVICE_NAME, key_name).context("Failed to create keyring entry")?;

        match entry.get_password() {
            Ok(password) => {
                debug!("Retrieved credential: {}", key_name);
                Ok(Some(password))
            }
            Err(keyring::Error::NoEntry) => {
                debug!("Credential not found (not yet stored): {}", key_name);
                Ok(None)
            }
            Err(e) => {
                warn!("Failed to retrieve credential {}: {}", key_name, e);
                Err(e).context(format!("Error accessing credential: {}", key_name))
            }
        }
    }

    /// Delete an API key from Windows Credential Manager
    ///
    /// # Arguments
    /// * `key_name` - Credential identifier (use `keys::*` constants)
    ///
    /// # Use Cases
    /// - Removing outdated credentials
    /// - Credential rotation
    /// - Security cleanup
    pub fn delete(key_name: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key_name).context("Failed to create keyring entry")?;

        match entry.delete_password() {
            Ok(()) => {
                info!("Deleted credential: {}", key_name);
                Ok(())
            }
            Err(keyring::Error::NoEntry) => {
                debug!("Credential already deleted or never existed: {}", key_name);
                Ok(()) // Idempotent: not an error if already gone
            }
            Err(e) => {
                warn!("Failed to delete credential {}: {}", key_name, e);
                Err(e).context(format!("Error deleting credential: {}", key_name))
            }
        }
    }

    /// Check if a credential exists without retrieving it
    ///
    /// # Arguments
    /// * `key_name` - Credential identifier (use `keys::*` constants)
    ///
    /// # Returns
    /// * `Ok(true)` - Credential exists
    /// * `Ok(false)` - Credential not found
    /// * `Err` - System error
    pub fn exists(key_name: &str) -> Result<bool> {
        Self::get(key_name).map(|opt| opt.is_some())
    }

    /// Migrate API keys from .env file to Windows Credential Manager
    ///
    /// # Safety
    /// This function reads from .env but does NOT delete the file.
    /// Users should manually delete .env after verifying migration.
    ///
    /// # Environment Variables Supported
    /// - DEEPSEEK_API_KEY
    /// - GROQ_API_KEY
    /// - OPENROUTER_API_KEY
    /// - GOOGLE_API_KEY
    ///
    /// # Example
    /// ```
    /// use crate::modules::credentials::CredentialStore;
    ///
    /// CredentialStore::migrate_from_env()?;
    /// println!("Migration complete - manually delete .env for security");
    /// ```
    pub fn migrate_from_env() -> Result<()> {
        dotenv::dotenv().ok(); // Load .env if exists

        let migrations = vec![
            ("DEEPSEEK_API_KEY", keys::DEEPSEEK_API_KEY),
            ("GROQ_API_KEY", keys::GROQ_API_KEY),
            ("OPENROUTER_API_KEY", keys::OPENROUTER_API_KEY),
            ("GOOGLE_API_KEY", keys::GOOGLE_API_KEY),
            ("KIMI_API_KEY", keys::KIMI_API_KEY),
            ("VITE_KIMI_API_KEY", keys::KIMI_API_KEY), // Also check VITE_ prefix
        ];

        let mut migrated_count = 0;
        let mut skipped_count = 0;

        for (env_var, key_name) in migrations {
            if let Ok(value) = std::env::var(env_var) {
                if !value.is_empty() {
                    // Check if already migrated
                    if Self::exists(key_name)? {
                        info!("Credential {} already exists - skipping", key_name);
                        skipped_count += 1;
                    } else {
                        Self::set(key_name, &value)?;
                        migrated_count += 1;
                        info!(
                            "Migrated {} from .env to Windows Credential Manager",
                            key_name
                        );
                    }
                }
            }
        }

        if migrated_count > 0 {
            info!(
                "✅ Migration complete: {} credentials migrated, {} skipped",
                migrated_count, skipped_count
            );
            info!("⚠️  SECURITY: Manually delete .env file after verifying credentials work");
        } else if skipped_count > 0 {
            info!("All credentials already migrated ({})", skipped_count);
        } else {
            warn!("No credentials found in .env to migrate");
        }

        Ok(())
    }

    /// Get credential with fallback to environment variable (for backward compatibility)
    ///
    /// # Migration Path
    /// 1. Checks Windows Credential Manager first
    /// 2. Falls back to environment variable if not found
    /// 3. Returns None if neither exists
    ///
    /// This allows gradual migration without breaking existing deployments.
    pub fn get_with_fallback(key_name: &str, env_var: &str) -> Result<Option<String>> {
        // Try keyring first
        if let Some(value) = Self::get(key_name)? {
            return Ok(Some(value));
        }

        // Fallback to environment variable
        match std::env::var(env_var) {
            Ok(value) if !value.is_empty() => {
                debug!("Using fallback env var: {}", env_var);
                Ok(Some(value))
            }
            _ => Ok(None),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_and_get() {
        let test_key = "test_api_key_12345";
        let test_value = "sk-test-1234567890";

        // Clean up any existing test credential
        let _ = CredentialStore::delete(test_key);

        // Set credential
        CredentialStore::set(test_key, test_value).expect("Failed to set credential");

        // Get credential
        let retrieved = CredentialStore::get(test_key).expect("Failed to get credential");
        assert_eq!(retrieved, Some(test_value.to_string()));

        // Clean up
        CredentialStore::delete(test_key).expect("Failed to delete credential");

        // Verify deletion
        let after_delete = CredentialStore::get(test_key).expect("Failed to check after delete");
        assert_eq!(after_delete, None);
    }

    #[test]
    fn test_exists() {
        let test_key = "test_exists_key";
        let _ = CredentialStore::delete(test_key); // Clean slate

        // Should not exist initially
        assert!(!CredentialStore::exists(test_key).unwrap());

        // Store credential
        CredentialStore::set(test_key, "test").unwrap();

        // Should exist now
        assert!(CredentialStore::exists(test_key).unwrap());

        // Clean up
        CredentialStore::delete(test_key).unwrap();
    }

    #[test]
    fn test_delete_nonexistent() {
        let test_key = "nonexistent_key_12345";

        // Should not error when deleting nonexistent credential (idempotent)
        CredentialStore::delete(test_key).expect("Delete should be idempotent");
    }
}

// ==========================================
// Tauri Commands
// ==========================================

#[derive(serde::Serialize)]
pub struct ApiKeyStatus {
    pub deepseek_key_set: bool,
    pub groq_key_set: bool,
    pub openrouter_key_set: bool,
    pub google_key_set: bool,
    pub kimi_key_set: bool,
}

#[tauri::command]
pub async fn get_api_key_status() -> Result<ApiKeyStatus, String> {
    Ok(ApiKeyStatus {
        deepseek_key_set: CredentialStore::exists(keys::DEEPSEEK_API_KEY).unwrap_or(false),
        groq_key_set: CredentialStore::exists(keys::GROQ_API_KEY).unwrap_or(false),
        openrouter_key_set: CredentialStore::exists(keys::OPENROUTER_API_KEY).unwrap_or(false),
        google_key_set: CredentialStore::exists(keys::GOOGLE_API_KEY).unwrap_or(false),
        kimi_key_set: CredentialStore::exists(keys::KIMI_API_KEY).unwrap_or(false),
    })
}

#[tauri::command]
pub async fn save_api_keys(
    deepseek_key: Option<String>,
    groq_key: Option<String>,
    openrouter_key: Option<String>,
    google_key: Option<String>,
    kimi_key: Option<String>,
    _state: tauri::State<'_, crate::modules::state::AppState>,
) -> Result<(), String> {
    info!("Saving API keys to credential store");

    if let Some(key) = deepseek_key {
        if !key.trim().is_empty() {
            CredentialStore::set(keys::DEEPSEEK_API_KEY, &key)
                .map_err(|e| format!("Failed to save DeepSeek key: {}", e))?;
        }
    }

    if let Some(key) = groq_key {
        if !key.trim().is_empty() {
            CredentialStore::set(keys::GROQ_API_KEY, &key)
                .map_err(|e| format!("Failed to save Groq key: {}", e))?;
        }
    }

    if let Some(key) = openrouter_key {
        if !key.trim().is_empty() {
            CredentialStore::set(keys::OPENROUTER_API_KEY, &key)
                .map_err(|e| format!("Failed to save OpenRouter key: {}", e))?;
        }
    }

    if let Some(key) = google_key {
        if !key.trim().is_empty() {
            CredentialStore::set(keys::GOOGLE_API_KEY, &key)
                .map_err(|e| format!("Failed to save Google key: {}", e))?;
        }
    }

    if let Some(key) = kimi_key {
        if !key.trim().is_empty() {
            CredentialStore::set(keys::KIMI_API_KEY, &key)
                .map_err(|e| format!("Failed to save Kimi key: {}", e))?;
        }
    }

    // In a real production app, we might also want to update the in-memory Config state here
    // or signal a reload. For now, the next request will pull from env/credentials if we
    // update the retrieval logic to check credentials first (which we should do in state.rs or llm.rs).
    // Note: state::Config::from_env only runs at startup.
    // For immediate effect, we'd need to update the Mutex<Config> if we had one, but Config is read-only State.
    // However, llm.rs calls `call_with_fallback` which reads from `config`.
    // Changes to Keyring won't be picked up by `config` until restart UNLESS we update `llm.rs` to read from Keyring directly
    // or we recreate Config.
    // The previously viewed `credentials.rs` implementation of `get_with_fallback` suggests intended usage.

    Ok(())
}
