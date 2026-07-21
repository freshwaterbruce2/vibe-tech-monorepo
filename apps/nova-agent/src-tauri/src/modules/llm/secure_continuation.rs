use serde::{de::DeserializeOwned, Serialize};

const REFERENCE_PREFIX: &str = "continuation:v1:";

pub(super) fn store<T: Serialize>(
    task_id: &str,
    action_id: &str,
    value: &T,
) -> Result<String, String> {
    let plaintext = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    let ciphertext = protect(&plaintext)?;
    let object_id = blake3::hash(format!("{task_id}\0{action_id}").as_bytes()).to_hex();
    let reference = format!("{REFERENCE_PREFIX}{object_id}");
    let mut envelope = blake3::hash(&ciphertext).as_bytes().to_vec();
    envelope.extend_from_slice(&ciphertext);
    write_ciphertext(&reference, &envelope)?;
    Ok(reference)
}

pub(super) fn store_pending<T: Serialize>(
    task_id: &str,
    action_id: &str,
    value: &T,
) -> Result<String, String> {
    let plaintext = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    let ciphertext = protect(&plaintext)?;
    let object_id = blake3::hash(format!("{task_id}\0{action_id}").as_bytes()).to_hex();
    let reference = format!("{REFERENCE_PREFIX}{object_id}");
    let mut envelope = blake3::hash(&ciphertext).as_bytes().to_vec();
    envelope.extend_from_slice(&ciphertext);
    write_ciphertext_if_absent(&reference, &envelope)?;
    Ok(reference)
}

pub(super) fn load<T: DeserializeOwned>(reference: &str) -> Result<T, String> {
    validate_reference(reference)?;
    let envelope = read_ciphertext(reference)?
        .ok_or_else(|| "secure continuation unavailable; fresh re-plan required".to_string())?;
    if envelope.len() < 32 {
        return Err("secure continuation is corrupt; fresh re-plan required".to_string());
    }
    let (expected_digest, ciphertext) = envelope.split_at(32);
    if blake3::hash(ciphertext).as_bytes() != expected_digest {
        return Err("secure continuation is corrupt; fresh re-plan required".to_string());
    }
    let plaintext = unprotect(&ciphertext)?;
    serde_json::from_slice(&plaintext)
        .map_err(|_| "secure continuation is corrupt; fresh re-plan required".to_string())
}

pub(super) fn delete(reference: &str) -> Result<(), String> {
    validate_reference(reference)?;
    delete_ciphertext(reference)
}

fn validate_reference(reference: &str) -> Result<(), String> {
    let object_id = reference
        .strip_prefix(REFERENCE_PREFIX)
        .ok_or_else(|| "invalid continuation reference".to_string())?;
    if object_id.len() != 64 || !object_id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("invalid continuation reference".to_string());
    }
    Ok(())
}

#[cfg(all(windows, not(test)))]
fn continuation_root() -> std::path::PathBuf {
    std::path::PathBuf::from(r"D:\data\nova-agent\task-continuations")
}

#[cfg(all(windows, not(test)))]
fn path_for(reference: &str) -> Result<std::path::PathBuf, String> {
    validate_reference(reference)?;
    let object_id = reference.strip_prefix(REFERENCE_PREFIX).unwrap();
    Ok(continuation_root().join(format!("{object_id}.blob")))
}

#[cfg(all(windows, not(test)))]
fn write_ciphertext(reference: &str, ciphertext: &[u8]) -> Result<(), String> {
    let final_path = path_for(reference)?;
    native_atomic_replace(&final_path, ciphertext)
        .map_err(|_| "secure continuation storage failed; fresh re-plan required".to_string())
}

#[cfg(all(windows, not(test)))]
fn write_ciphertext_if_absent(reference: &str, ciphertext: &[u8]) -> Result<(), String> {
    let path = path_for(reference)?;
    if path.exists() || path.with_extension("blob.bak").exists() {
        return Ok(());
    }
    match native_atomic_replace(&path, ciphertext) {
        Ok(()) => Ok(()),
        Err(_) if path.exists() => Ok(()),
        Err(_) => Err("secure continuation storage failed; fresh re-plan required".to_string()),
    }
}

#[cfg(windows)]
fn native_atomic_replace(final_path: &std::path::Path, ciphertext: &[u8]) -> std::io::Result<()> {
    use std::io::Write;
    let root = final_path.parent().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::Other, "continuation path has no parent")
    })?;
    std::fs::create_dir_all(root)?;
    let nonce = uuid::Uuid::new_v4();
    let temp_path = root.join(format!(".{nonce}.tmp"));
    let backup_path = final_path.with_extension("blob.bak");
    let write_result = (|| {
        let mut file = std::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temp_path)?;
        file.write_all(ciphertext)?;
        file.sync_all()
    })();
    if let Err(error) = write_result {
        let _ = std::fs::remove_file(&temp_path);
        return Err(error);
    }
    let install_result = if final_path.exists() {
        let _ = std::fs::remove_file(&backup_path);
        replace_file_atomic(final_path, &temp_path, &backup_path)
    } else {
        move_file_write_through(&temp_path, final_path)
    };
    if let Err(error) = install_result {
        let _ = std::fs::remove_file(&temp_path);
        return Err(error);
    }
    let _ = std::fs::remove_file(&backup_path);
    Ok(())
}

#[cfg(windows)]
fn replace_file_atomic(
    final_path: &std::path::Path,
    temp_path: &std::path::Path,
    backup_path: &std::path::Path,
) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{ReplaceFileW, REPLACE_FILE_FLAGS};
    let wide = |path: &std::path::Path| {
        path.as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>()
    };
    let final_wide = wide(final_path);
    let temp_wide = wide(temp_path);
    let backup_wide = wide(backup_path);
    let replacement = unsafe {
        ReplaceFileW(
            PCWSTR(final_wide.as_ptr()),
            PCWSTR(temp_wide.as_ptr()),
            PCWSTR(backup_wide.as_ptr()),
            REPLACE_FILE_FLAGS(0),
            None,
            None,
        )
        .map_err(|_| std::io::Error::last_os_error())
    };
    if let Err(error) = replacement {
        if !final_path.exists() && backup_path.exists() {
            move_file_write_through(backup_path, final_path)?;
        }
        return Err(error);
    }
    std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(final_path)?
        .sync_all()
}

#[cfg(windows)]
fn move_file_write_through(
    temp_path: &std::path::Path,
    final_path: &std::path::Path,
) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_WRITE_THROUGH};
    let temp_wide = temp_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let final_wide = final_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    unsafe {
        MoveFileExW(
            PCWSTR(temp_wide.as_ptr()),
            PCWSTR(final_wide.as_ptr()),
            MOVEFILE_WRITE_THROUGH,
        )
        .map_err(|_| std::io::Error::last_os_error())
    }
}

#[cfg(all(windows, not(test)))]
fn read_ciphertext(reference: &str) -> Result<Option<Vec<u8>>, String> {
    let path = path_for(reference)?;
    read_canonical_or_backup(&path)
}

#[cfg(windows)]
fn read_canonical_or_backup(path: &std::path::Path) -> Result<Option<Vec<u8>>, String> {
    match std::fs::read(path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            match std::fs::read(path.with_extension("blob.bak")) {
                Ok(bytes) => Ok(Some(bytes)),
                Err(backup_error) if backup_error.kind() == std::io::ErrorKind::NotFound => {
                    Ok(None)
                }
                Err(_) => {
                    Err("secure continuation recovery failed; fresh re-plan required".to_string())
                }
            }
        }
        Err(_) => Err("secure continuation retrieval failed; fresh re-plan required".to_string()),
    }
}

#[cfg(all(windows, not(test)))]
fn delete_ciphertext(reference: &str) -> Result<(), String> {
    let path = path_for(reference)?;
    delete_canonical_and_backup(&path)
}

#[cfg(windows)]
fn delete_canonical_and_backup(path: &std::path::Path) -> Result<(), String> {
    for candidate in [path.to_path_buf(), path.with_extension("blob.bak")] {
        match std::fs::remove_file(candidate) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(())
}

#[cfg(all(windows, not(test)))]
fn protect(plaintext: &[u8]) -> Result<Vec<u8>, String> {
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: plaintext
            .len()
            .try_into()
            .map_err(|_| "continuation is too large")?,
        pbData: plaintext.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptProtectData(
            &input,
            PCWSTR::null(),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|_| "secure continuation encryption failed".to_string())?;
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(HLOCAL(output.pbData.cast()));
        Ok(bytes)
    }
}

#[cfg(all(windows, not(test)))]
fn unprotect(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: ciphertext
            .len()
            .try_into()
            .map_err(|_| "continuation is too large")?,
        pbData: ciphertext.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|_| "secure continuation decryption failed".to_string())?;
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(HLOCAL(output.pbData.cast()));
        Ok(bytes)
    }
}

#[cfg(all(not(windows), not(test)))]
fn protect(_: &[u8]) -> Result<Vec<u8>, String> {
    Err("secure continuation storage requires Windows DPAPI; fresh re-plan required".to_string())
}

#[cfg(all(not(windows), not(test)))]
fn unprotect(_: &[u8]) -> Result<Vec<u8>, String> {
    Err("secure continuation retrieval requires Windows DPAPI; fresh re-plan required".to_string())
}

#[cfg(all(not(windows), not(test)))]
fn write_ciphertext(_: &str, _: &[u8]) -> Result<(), String> {
    Err("secure continuation storage requires Windows DPAPI; fresh re-plan required".to_string())
}

#[cfg(all(not(windows), not(test)))]
fn write_ciphertext_if_absent(_: &str, _: &[u8]) -> Result<(), String> {
    Err("secure continuation storage requires Windows DPAPI; fresh re-plan required".to_string())
}

#[cfg(all(not(windows), not(test)))]
fn read_ciphertext(_: &str) -> Result<Option<Vec<u8>>, String> {
    Err("secure continuation retrieval requires Windows DPAPI; fresh re-plan required".to_string())
}

#[cfg(all(not(windows), not(test)))]
fn delete_ciphertext(_: &str) -> Result<(), String> {
    Ok(())
}

#[cfg(test)]
fn test_store() -> &'static std::sync::Mutex<std::collections::HashMap<String, Vec<u8>>> {
    static STORE: std::sync::OnceLock<
        std::sync::Mutex<std::collections::HashMap<String, Vec<u8>>>,
    > = std::sync::OnceLock::new();
    STORE.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

#[cfg(test)]
fn protect(plaintext: &[u8]) -> Result<Vec<u8>, String> {
    Ok(plaintext.iter().map(|byte| byte ^ 0xa5).collect())
}

#[cfg(test)]
fn unprotect(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    protect(ciphertext)
}

#[cfg(test)]
fn write_ciphertext(reference: &str, ciphertext: &[u8]) -> Result<(), String> {
    test_store()
        .lock()
        .map_err(|_| "test secure store poisoned".to_string())?
        .insert(reference.to_string(), ciphertext.to_vec());
    Ok(())
}

#[cfg(test)]
fn write_ciphertext_if_absent(reference: &str, ciphertext: &[u8]) -> Result<(), String> {
    test_store()
        .lock()
        .map_err(|_| "test secure store poisoned".to_string())?
        .entry(reference.to_string())
        .or_insert_with(|| ciphertext.to_vec());
    Ok(())
}

#[cfg(test)]
fn read_ciphertext(reference: &str) -> Result<Option<Vec<u8>>, String> {
    Ok(test_store()
        .lock()
        .map_err(|_| "test secure store poisoned".to_string())?
        .get(reference)
        .cloned())
}

#[cfg(test)]
fn delete_ciphertext(reference: &str) -> Result<(), String> {
    test_store()
        .lock()
        .map_err(|_| "test secure store poisoned".to_string())?
        .remove(reference);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Deserialize, PartialEq, Serialize)]
    struct Secret {
        code: String,
    }

    #[test]
    fn encrypted_reference_and_blob_contain_no_plaintext_and_round_trip_large_payload() {
        let value = Secret {
            code: "SECRET_CODE_SENTINEL".repeat(1024),
        };
        let reference = store("task", "action", &value).unwrap();
        let ciphertext = read_ciphertext(&reference).unwrap().unwrap();
        assert!(!reference.contains("SECRET_CODE_SENTINEL"));
        assert!(!String::from_utf8_lossy(&ciphertext).contains("SECRET_CODE_SENTINEL"));
        assert_eq!(load::<Secret>(&reference).unwrap(), value);
        delete(&reference).unwrap();
        assert!(load::<Secret>(&reference).is_err());
    }

    #[test]
    fn pending_write_never_overwrites_a_completed_continuation() {
        let completed = Secret {
            code: "original-result".into(),
        };
        let reference = store("replay", "action", &completed).unwrap();
        let pending = Secret {
            code: "pending".into(),
        };
        assert_eq!(
            store_pending("replay", "action", &pending).unwrap(),
            reference
        );
        assert_eq!(load::<Secret>(&reference).unwrap(), completed);
        delete(&reference).unwrap();
    }

    #[test]
    #[cfg(windows)]
    fn native_atomic_replace_keeps_canonical_old_or_new_and_never_missing() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("continuation.blob");
        native_atomic_replace(&path, b"first-ciphertext").unwrap();
        assert!(path.is_file());
        native_atomic_replace(&path, b"second-ciphertext").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"second-ciphertext");
        let missing = dir.path().join("missing.tmp");
        let backup = path.with_extension("blob.bak");
        assert!(replace_file_atomic(&path, &missing, &backup).is_err());
        assert!(path.is_file());
        assert_eq!(std::fs::read(&path).unwrap(), b"second-ciphertext");
        let _ = std::fs::remove_file(&backup);
        move_file_write_through(&path, &backup).unwrap();
        assert!(!path.exists());
        assert_eq!(
            read_canonical_or_backup(&path).unwrap().unwrap(),
            b"second-ciphertext"
        );
        delete_canonical_and_backup(&path).unwrap();
        assert!(!path.exists());
        assert!(!backup.exists());
    }
}
