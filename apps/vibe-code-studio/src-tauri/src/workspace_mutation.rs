use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs::{self, File, Metadata, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
    time::{SystemTime, UNIX_EPOCH},
};

const MAX_PATH_LENGTH: usize = 4096;
const MAX_CONTENT_BYTES: usize = 64 * 1024 * 1024;
const REPARSE_POINT_ATTRIBUTE: u32 = 0x400;

static MUTATION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
static CONSUMED_PROPOSALS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();
static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MutationChangeType {
    Create,
    Modify,
    Delete,
    CreateDirectory,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ExpectedMutationState {
    Missing,
    File { sha256: String },
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ValidatedFileState {
    Missing,
    File { sha256: String, bytes: u64 },
    Directory,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMutationRequest {
    pub proposal_id: String,
    pub proposal_hash: String,
    pub task_id: String,
    pub step_id: String,
    pub action_type: String,
    pub workspace_root: String,
    pub target_path: String,
    pub change_type: MutationChangeType,
    pub expected_state: ExpectedMutationState,
    pub new_content: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMutationResult {
    pub proposal_id: String,
    pub proposal_hash: String,
    pub task_id: String,
    pub step_id: String,
    pub action_type: String,
    pub change_type: MutationChangeType,
    pub canonical_workspace_root: String,
    pub canonical_target_path: String,
    pub prior_state: ValidatedFileState,
    pub resulting_state: ValidatedFileState,
    pub bytes_written: u64,
    pub replacement_strategy: String,
    pub validated: bool,
    pub applied_at_unix_ms: u64,
}

#[derive(Debug)]
struct NormalDrivePath {
    path: PathBuf,
    normalized: String,
    key: String,
    drive: char,
}

#[derive(Debug)]
struct ValidatedPaths {
    workspace_root: PathBuf,
    target: PathBuf,
    parent: PathBuf,
    _directory_guards: Vec<DirectoryGuard>,
}

#[derive(Debug)]
struct DirectoryGuard {
    _handle: File,
}

#[tauri::command]
pub async fn apply_workspace_mutation(
    request: WorkspaceMutationRequest,
) -> Result<WorkspaceMutationResult, String> {
    tauri::async_runtime::spawn_blocking(move || apply_workspace_mutation_inner(request))
        .await
        .map_err(|error| native_error("NATIVE_JOIN_FAILED", error))?
}

pub fn apply_workspace_mutation_inner(
    request: WorkspaceMutationRequest,
) -> Result<WorkspaceMutationResult, String> {
    validate_request(&request)?;
    let _guard = MUTATION_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|_| native_error("MUTATION_LOCK_POISONED", "mutation lock is unavailable"))?;
    consume_proposal(&request.proposal_id)?;

    let paths = validate_paths(&request)?;
    let prior_state = inspect_state(&paths.target)?;
    verify_expected_state(&request.expected_state, &prior_state)?;
    let new_bytes = request
        .new_content
        .as_deref()
        .unwrap_or_default()
        .as_bytes();
    let bytes_written = if request.new_content.is_some() {
        new_bytes.len() as u64
    } else {
        0
    };

    let (resulting_state, strategy) = match &request.change_type {
        MutationChangeType::Create => apply_create(&request, &paths, new_bytes)?,
        MutationChangeType::Modify => apply_modify(&request, &paths, new_bytes)?,
        MutationChangeType::Delete => apply_delete(&request, &paths)?,
        MutationChangeType::CreateDirectory => apply_create_directory(&request, &paths)?,
    };

    Ok(WorkspaceMutationResult {
        proposal_id: request.proposal_id,
        proposal_hash: request.proposal_hash,
        task_id: request.task_id,
        step_id: request.step_id,
        action_type: request.action_type,
        change_type: request.change_type,
        canonical_workspace_root: display_path(&paths.workspace_root),
        canonical_target_path: display_path(&paths.target),
        prior_state,
        resulting_state,
        bytes_written,
        replacement_strategy: strategy.to_string(),
        validated: true,
        applied_at_unix_ms: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
    })
}

fn validate_request(request: &WorkspaceMutationRequest) -> Result<(), String> {
    validate_token("proposalId", &request.proposal_id)?;
    validate_token("taskId", &request.task_id)?;
    validate_token("stepId", &request.step_id)?;
    validate_token("actionType", &request.action_type)?;
    validate_hash("proposalHash", &request.proposal_hash)?;
    if let ExpectedMutationState::File { sha256 } = &request.expected_state {
        validate_hash("expectedState.sha256", sha256)?;
    }
    if request.new_content.as_ref().map_or(0, |value| value.len()) > MAX_CONTENT_BYTES {
        return Err(native_error(
            "CONTENT_TOO_LARGE",
            "approved content exceeds 64 MiB",
        ));
    }
    let valid_shape = matches!(
        (
            &request.change_type,
            &request.expected_state,
            request.new_content.as_ref()
        ),
        (
            MutationChangeType::Create,
            ExpectedMutationState::Missing,
            Some(_)
        ) | (
            MutationChangeType::Modify,
            ExpectedMutationState::File { .. },
            Some(_)
        ) | (
            MutationChangeType::Delete,
            ExpectedMutationState::File { .. },
            None
        ) | (
            MutationChangeType::CreateDirectory,
            ExpectedMutationState::Missing,
            None
        )
    );
    if !valid_shape {
        return Err(native_error(
            "INVALID_OPERATION_STATE",
            "change type, expected state, and approved content do not form a valid mutation",
        ));
    }
    Ok(())
}

fn validate_token(label: &str, value: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > 200 {
        return Err(native_error(
            "INVALID_IDENTITY",
            format!("{label} has an invalid length"),
        ));
    }
    if !value
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || "_-.:".contains(character))
    {
        return Err(native_error(
            "INVALID_IDENTITY",
            format!("{label} contains invalid characters"),
        ));
    }
    Ok(())
}

fn validate_hash(label: &str, value: &str) -> Result<(), String> {
    if value.len() != 64 || !value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(native_error(
            "INVALID_HASH",
            format!("{label} must be a 64-character SHA-256"),
        ));
    }
    Ok(())
}

fn consume_proposal(proposal_id: &str) -> Result<(), String> {
    let mut consumed = CONSUMED_PROPOSALS
        .get_or_init(|| Mutex::new(HashSet::new()))
        .lock()
        .map_err(|_| {
            native_error(
                "REPLAY_GUARD_POISONED",
                "proposal replay guard is unavailable",
            )
        })?;
    if !consumed.insert(proposal_id.to_string()) {
        return Err(native_error(
            "PROPOSAL_REPLAY",
            "native mutation proposal was already consumed",
        ));
    }
    Ok(())
}

fn validate_paths(request: &WorkspaceMutationRequest) -> Result<ValidatedPaths, String> {
    let root = parse_normal_drive_path("workspaceRoot", &request.workspace_root)?;
    let target = parse_normal_drive_path("targetPath", &request.target_path)?;
    if !root.drive.eq_ignore_ascii_case(&target.drive) {
        return Err(native_error(
            "FOREIGN_DRIVE",
            "target path is on a different drive",
        ));
    }
    let root_prefix = format!("{}\\", root.key.trim_end_matches('\\'));
    if target.key == root.key || !target.key.starts_with(&root_prefix) {
        return Err(native_error(
            "OUTSIDE_WORKSPACE",
            "target is not a strict workspace descendant",
        ));
    }
    let directory_guards = lock_directory_chain(&root, &target)?;
    reject_reparse_chain(&root, &target)?;

    let canonical_root = canonicalize_directory(&root.path, "WORKSPACE_NOT_FOUND")?;
    let raw_parent = target
        .path
        .parent()
        .ok_or_else(|| native_error("INVALID_TARGET", "target has no parent"))?;
    let canonical_parent = canonicalize_directory(raw_parent, "PARENT_NOT_FOUND")?;
    let canonical_target = match fs::symlink_metadata(&target.path) {
        Ok(metadata) => {
            reject_reparse_metadata(&metadata, &target.path)?;
            dunce::canonicalize(&target.path)
                .map_err(|error| io_error("TARGET_CANONICALIZE_FAILED", &target.path, error))?
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            canonical_parent.join(target.path.file_name().ok_or_else(|| {
                native_error("INVALID_TARGET", "target has no final path component")
            })?)
        }
        Err(error) => return Err(io_error("TARGET_METADATA_FAILED", &target.path, error)),
    };
    assert_contained(&canonical_root, &canonical_parent, true)?;
    assert_contained(&canonical_root, &canonical_target, false)?;
    Ok(ValidatedPaths {
        workspace_root: canonical_root,
        target: canonical_target,
        parent: canonical_parent,
        _directory_guards: directory_guards,
    })
}

fn lock_directory_chain(
    root: &NormalDrivePath,
    target: &NormalDrivePath,
) -> Result<Vec<DirectoryGuard>, String> {
    let mut guards = Vec::new();
    let mut cursor = root.path.clone();
    guards.push(open_directory_guard(&cursor)?);

    let mut components = target.normalized[root.normalized.len()..]
        .trim_start_matches('\\')
        .split('\\')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    components.pop();
    for component in components {
        cursor.push(component);
        guards.push(open_directory_guard(&cursor)?);
    }
    Ok(guards)
}

#[cfg(windows)]
fn open_directory_guard(path: &Path) -> Result<DirectoryGuard, String> {
    use std::os::windows::fs::OpenOptionsExt;
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OPEN_REPARSE_POINT, FILE_SHARE_READ, FILE_SHARE_WRITE,
    };

    let handle = OpenOptions::new()
        .read(true)
        .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE)
        .custom_flags(FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT)
        .open(path)
        .map_err(|error| io_error("DIRECTORY_GUARD_FAILED", path, error))?;
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| io_error("DIRECTORY_GUARD_METADATA_FAILED", path, error))?;
    reject_reparse_metadata(&metadata, path)?;
    if !metadata.is_dir() {
        return Err(native_error(
            "DIRECTORY_GUARD_FAILED",
            format!("path component is not a directory: {}", path.display()),
        ));
    }
    Ok(DirectoryGuard { _handle: handle })
}

#[cfg(not(windows))]
fn open_directory_guard(path: &Path) -> Result<DirectoryGuard, String> {
    let handle =
        File::open(path).map_err(|error| io_error("DIRECTORY_GUARD_FAILED", path, error))?;
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| io_error("DIRECTORY_GUARD_METADATA_FAILED", path, error))?;
    reject_reparse_metadata(&metadata, path)?;
    if !metadata.is_dir() {
        return Err(native_error(
            "DIRECTORY_GUARD_FAILED",
            format!("path component is not a directory: {}", path.display()),
        ));
    }
    Ok(DirectoryGuard { _handle: handle })
}

fn parse_normal_drive_path(label: &str, raw: &str) -> Result<NormalDrivePath, String> {
    if raw.is_empty() || raw.len() > MAX_PATH_LENGTH || raw.contains('\0') {
        return Err(native_error(
            "INVALID_PATH",
            format!("{label} is empty or too long"),
        ));
    }
    if raw.chars().any(char::is_control) {
        return Err(native_error(
            "INVALID_PATH",
            format!("{label} contains control characters"),
        ));
    }
    let mut normalized = raw.replace('/', "\\");
    if normalized.starts_with("\\\\") {
        return Err(native_error(
            "UNSUPPORTED_PATH_PREFIX",
            format!("{label} cannot be UNC or a device path"),
        ));
    }
    while normalized.contains("\\\\") {
        normalized = normalized.replace("\\\\", "\\");
    }
    while normalized.len() > 3 && normalized.ends_with('\\') {
        normalized.pop();
    }
    let bytes = normalized.as_bytes();
    if bytes.len() < 3 || !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' || bytes[2] != b'\\' {
        return Err(native_error(
            "UNSUPPORTED_PATH_PREFIX",
            format!("{label} must be an absolute normal-drive path"),
        ));
    }
    for component in normalized[3..].split('\\').filter(|part| !part.is_empty()) {
        validate_component(label, component)?;
    }
    Ok(NormalDrivePath {
        path: PathBuf::from(&normalized),
        key: normalized.to_lowercase(),
        drive: normalized.chars().next().unwrap_or_default(),
        normalized,
    })
}

fn validate_component(label: &str, component: &str) -> Result<(), String> {
    if component == "." || component == ".." {
        return Err(native_error(
            "PATH_TRAVERSAL",
            format!("{label} contains traversal"),
        ));
    }
    if component.contains(':') {
        return Err(native_error(
            "ALTERNATE_DATA_STREAM",
            format!("{label} contains an NTFS stream"),
        ));
    }
    if component.ends_with(' ') || component.ends_with('.') {
        return Err(native_error(
            "AMBIGUOUS_PATH",
            format!("{label} contains a trailing space or dot"),
        ));
    }
    let stem = component
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    let numbered_device = |prefix: &str| {
        stem.strip_prefix(prefix)
            .is_some_and(|suffix| suffix.len() == 1 && matches!(suffix.as_bytes()[0], b'1'..=b'9'))
    };
    let reserved = matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL" | "CLOCK$")
        || numbered_device("COM")
        || numbered_device("LPT");
    if reserved {
        return Err(native_error(
            "RESERVED_PATH",
            format!("{label} contains a reserved Windows name"),
        ));
    }
    Ok(())
}

fn reject_reparse_chain(root: &NormalDrivePath, target: &NormalDrivePath) -> Result<(), String> {
    if let Ok(metadata) = fs::symlink_metadata(&root.path) {
        reject_reparse_metadata(&metadata, &root.path)?;
    }
    let suffix = target.normalized[root.normalized.len()..].trim_start_matches('\\');
    let mut cursor = root.path.clone();
    for component in suffix.split('\\').filter(|part| !part.is_empty()) {
        cursor.push(component);
        match fs::symlink_metadata(&cursor) {
            Ok(metadata) => reject_reparse_metadata(&metadata, &cursor)?,
            Err(error) if error.kind() == io::ErrorKind::NotFound => break,
            Err(error) => return Err(io_error("PATH_METADATA_FAILED", &cursor, error)),
        }
    }
    Ok(())
}

fn reject_reparse_metadata(metadata: &Metadata, path: &Path) -> Result<(), String> {
    if metadata_is_reparse(metadata) {
        return Err(native_error(
            "REPARSE_POINT_REJECTED",
            format!("reparse point is not allowed: {}", path.display()),
        ));
    }
    Ok(())
}

#[cfg(windows)]
fn metadata_is_reparse(metadata: &Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    metadata.file_attributes() & REPARSE_POINT_ATTRIBUTE != 0
}

#[cfg(not(windows))]
fn metadata_is_reparse(metadata: &Metadata) -> bool {
    metadata.file_type().is_symlink()
}

fn canonicalize_directory(path: &Path, code: &str) -> Result<PathBuf, String> {
    let canonical = dunce::canonicalize(path).map_err(|error| io_error(code, path, error))?;
    let metadata = fs::metadata(&canonical).map_err(|error| io_error(code, &canonical, error))?;
    if !metadata.is_dir() {
        return Err(native_error(
            code,
            format!("not a directory: {}", canonical.display()),
        ));
    }
    Ok(canonical)
}

fn assert_contained(root: &Path, candidate: &Path, allow_root: bool) -> Result<(), String> {
    let root_key = path_key(root);
    let candidate_key = path_key(candidate);
    if (!allow_root && candidate_key == root_key)
        || (candidate_key != root_key && !candidate_key.starts_with(&format!("{root_key}\\")))
    {
        return Err(native_error(
            "SYMLINK_ESCAPE",
            format!("resolved path escaped workspace: {}", candidate.display()),
        ));
    }
    Ok(())
}

fn inspect_state(path: &Path) -> Result<ValidatedFileState, String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            reject_reparse_metadata(&metadata, path)?;
            if metadata.is_dir() {
                return Ok(ValidatedFileState::Directory);
            }
            if !metadata.is_file() {
                return Err(native_error(
                    "UNSUPPORTED_TARGET_TYPE",
                    format!("unsupported target: {}", path.display()),
                ));
            }
            let bytes =
                fs::read(path).map_err(|error| io_error("TARGET_READ_FAILED", path, error))?;
            Ok(file_state(&bytes))
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(ValidatedFileState::Missing),
        Err(error) => Err(io_error("TARGET_METADATA_FAILED", path, error)),
    }
}

fn verify_expected_state(
    expected: &ExpectedMutationState,
    actual: &ValidatedFileState,
) -> Result<(), String> {
    let matches = match (expected, actual) {
        (ExpectedMutationState::Missing, ValidatedFileState::Missing) => true,
        (
            ExpectedMutationState::File { sha256: expected },
            ValidatedFileState::File { sha256: actual, .. },
        ) => expected.eq_ignore_ascii_case(actual),
        _ => false,
    };
    if !matches {
        return Err(native_error(
            "TARGET_CHANGED",
            format!("expected {expected:?}, found {actual:?}"),
        ));
    }
    Ok(())
}

fn apply_create(
    request: &WorkspaceMutationRequest,
    paths: &ValidatedPaths,
    bytes: &[u8],
) -> Result<(ValidatedFileState, &'static str), String> {
    let mut temp = write_temp(&paths.parent, bytes)?;
    let current = revalidate_paths(request, paths)?;
    verify_expected_state(&request.expected_state, &inspect_state(&current.target)?)?;
    move_no_replace(temp.path(), &current.target)
        .map_err(|error| io_error("ATOMIC_CREATE_FAILED", &current.target, error))?;
    temp.disarm();
    let result = inspect_state(&current.target)?;
    // A foreign process may replace the path immediately after publication.
    // Never delete a mismatching readback: it may no longer be the file that
    // this proposal created.
    verify_new_content(&result, bytes)?;
    Ok((result, "atomic_create"))
}

fn apply_modify(
    request: &WorkspaceMutationRequest,
    paths: &ValidatedPaths,
    bytes: &[u8],
) -> Result<(ValidatedFileState, &'static str), String> {
    let mut temp = write_temp(&paths.parent, bytes)?;
    let backup = unique_missing_path(&paths.parent, "backup")?;
    let current = revalidate_paths(request, paths)?;
    verify_expected_state(&request.expected_state, &inspect_state(&current.target)?)?;
    if let Err(error) = replace_with_backup(&current.target, temp.path(), &backup) {
        recover_backup_after_failed_replace(&current.target, &backup)?;
        return Err(io_error("ATOMIC_REPLACE_FAILED", &current.target, error));
    }
    temp.disarm();

    let backup_state = inspect_state(&backup)?;
    if verify_expected_state(&request.expected_state, &backup_state).is_err() {
        restore_backup(&current.target, &backup, &backup_state)?;
        return Err(native_error(
            "TARGET_CHANGED_DURING_REPLACE",
            "displaced file did not match approved prior hash",
        ));
    }
    let result = inspect_state(&current.target)?;
    if let Err(error) = verify_new_content(&result, bytes) {
        restore_backup(&current.target, &backup, &backup_state)?;
        return Err(error);
    }
    if let Err(error) = fs::remove_file(&backup) {
        restore_backup(&current.target, &backup, &backup_state)?;
        return Err(io_error("BACKUP_CLEANUP_FAILED", &backup, error));
    }
    Ok((result, "atomic_replace_with_verified_backup"))
}

fn apply_delete(
    request: &WorkspaceMutationRequest,
    paths: &ValidatedPaths,
) -> Result<(ValidatedFileState, &'static str), String> {
    let tombstone = unique_missing_path(&paths.parent, "tombstone")?;
    let current = revalidate_paths(request, paths)?;
    verify_expected_state(&request.expected_state, &inspect_state(&current.target)?)?;
    move_no_replace(&current.target, &tombstone)
        .map_err(|error| io_error("DELETE_DETACH_FAILED", &current.target, error))?;
    let detached_state = inspect_state(&tombstone)?;
    if verify_expected_state(&request.expected_state, &detached_state).is_err() {
        restore_detached(&tombstone, &current.target, &detached_state)?;
        return Err(native_error(
            "TARGET_CHANGED_DURING_DELETE",
            "detached file did not match approved prior hash",
        ));
    }
    if let Err(error) = fs::remove_file(&tombstone) {
        restore_detached(&tombstone, &current.target, &detached_state)?;
        return Err(io_error("DELETE_COMMIT_FAILED", &tombstone, error));
    }
    let result = inspect_state(&current.target)?;
    if result != ValidatedFileState::Missing {
        return Err(native_error(
            "DELETE_READBACK_FAILED",
            "target exists after validated deletion",
        ));
    }
    Ok((result, "verified_tombstone_delete"))
}

fn apply_create_directory(
    request: &WorkspaceMutationRequest,
    paths: &ValidatedPaths,
) -> Result<(ValidatedFileState, &'static str), String> {
    let current = revalidate_paths(request, paths)?;
    verify_expected_state(&request.expected_state, &inspect_state(&current.target)?)?;
    fs::create_dir(&current.target)
        .map_err(|error| io_error("DIRECTORY_CREATE_FAILED", &current.target, error))?;
    let result = inspect_state(&current.target)?;
    if result != ValidatedFileState::Directory {
        let _ = fs::remove_dir(&current.target);
        return Err(native_error(
            "DIRECTORY_READBACK_FAILED",
            "created path is not a directory",
        ));
    }
    Ok((result, "exclusive_directory_create"))
}

fn revalidate_paths(
    request: &WorkspaceMutationRequest,
    previous: &ValidatedPaths,
) -> Result<ValidatedPaths, String> {
    let current = validate_paths(request)?;
    if path_key(&current.workspace_root) != path_key(&previous.workspace_root)
        || path_key(&current.target) != path_key(&previous.target)
        || path_key(&current.parent) != path_key(&previous.parent)
    {
        return Err(native_error(
            "PATH_CHANGED",
            "canonical mutation path changed during execution",
        ));
    }
    Ok(current)
}

fn verify_new_content(state: &ValidatedFileState, bytes: &[u8]) -> Result<(), String> {
    if state != &file_state(bytes) {
        return Err(native_error(
            "CONTENT_READBACK_FAILED",
            "written bytes did not match approved content",
        ));
    }
    Ok(())
}

fn write_temp(parent: &Path, bytes: &[u8]) -> Result<CleanupFile, String> {
    for _ in 0..32 {
        let path = unique_path(parent, "temp");
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut file) => {
                if let Err(error) = write_and_sync(&mut file, bytes) {
                    drop(file);
                    let _ = fs::remove_file(&path);
                    return Err(io_error("TEMP_WRITE_FAILED", &path, error));
                }
                return Ok(CleanupFile { path, active: true });
            }
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(io_error("TEMP_CREATE_FAILED", &path, error)),
        }
    }
    Err(native_error(
        "TEMP_NAME_EXHAUSTED",
        "could not reserve a temporary file",
    ))
}

fn write_and_sync(file: &mut File, bytes: &[u8]) -> io::Result<()> {
    file.write_all(bytes)?;
    file.flush()?;
    file.sync_all()
}

fn unique_missing_path(parent: &Path, role: &str) -> Result<PathBuf, String> {
    for _ in 0..32 {
        let path = unique_path(parent, role);
        match fs::symlink_metadata(&path) {
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(path),
            Ok(_) => continue,
            Err(error) => return Err(io_error("TEMP_METADATA_FAILED", &path, error)),
        }
    }
    Err(native_error(
        "TEMP_NAME_EXHAUSTED",
        format!("could not reserve {role} path"),
    ))
}

fn unique_path(parent: &Path, role: &str) -> PathBuf {
    let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    parent.join(format!(
        ".vcs-mutation-{}-{sequence}-{role}",
        std::process::id()
    ))
}

struct CleanupFile {
    path: PathBuf,
    active: bool,
}

impl CleanupFile {
    fn path(&self) -> &Path {
        &self.path
    }
    fn disarm(&mut self) {
        self.active = false;
    }
}

impl Drop for CleanupFile {
    fn drop(&mut self) {
        if self.active {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn recover_backup_after_failed_replace(target: &Path, backup: &Path) -> Result<(), String> {
    if let ValidatedFileState::File { .. } = inspect_state(backup)? {
        let backup_state = inspect_state(backup)?;
        restore_backup(target, backup, &backup_state)?;
    }
    Ok(())
}

fn restore_backup(
    target: &Path,
    backup: &Path,
    expected: &ValidatedFileState,
) -> Result<(), String> {
    if inspect_state(target)? == ValidatedFileState::Missing {
        move_no_replace(backup, target)
            .map_err(|error| io_error("BACKUP_RESTORE_FAILED", target, error))?;
    } else {
        replace_without_backup(target, backup)
            .map_err(|error| io_error("BACKUP_RESTORE_FAILED", target, error))?;
    }
    if &inspect_state(target)? != expected {
        return Err(native_error(
            "BACKUP_RESTORE_INVALID",
            "restored target failed hash validation",
        ));
    }
    Ok(())
}

fn restore_detached(
    tombstone: &Path,
    target: &Path,
    expected: &ValidatedFileState,
) -> Result<(), String> {
    move_no_replace(tombstone, target)
        .map_err(|error| io_error("DELETE_RESTORE_FAILED", target, error))?;
    if &inspect_state(target)? != expected {
        return Err(native_error(
            "DELETE_RESTORE_INVALID",
            "restored delete target failed validation",
        ));
    }
    Ok(())
}

#[cfg(windows)]
fn move_no_replace(source: &Path, destination: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_WRITE_THROUGH};
    let source = source
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let destination = destination
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let result = unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_WRITE_THROUGH,
        )
    };
    if result == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn move_no_replace(source: &Path, destination: &Path) -> io::Result<()> {
    fs::hard_link(source, destination)?;
    fs::remove_file(source)
}

#[cfg(windows)]
fn replace_with_backup(target: &Path, replacement: &Path, backup: &Path) -> io::Result<()> {
    replace_file(target, replacement, Some(backup))
}

#[cfg(not(windows))]
fn replace_with_backup(target: &Path, replacement: &Path, backup: &Path) -> io::Result<()> {
    fs::copy(target, backup)?;
    fs::rename(replacement, target)
}

#[cfg(windows)]
fn replace_without_backup(target: &Path, replacement: &Path) -> io::Result<()> {
    replace_file(target, replacement, None)
}

#[cfg(not(windows))]
fn replace_without_backup(target: &Path, replacement: &Path) -> io::Result<()> {
    fs::rename(replacement, target)
}

#[cfg(windows)]
fn replace_file(target: &Path, replacement: &Path, backup: Option<&Path>) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{ReplaceFileW, REPLACEFILE_WRITE_THROUGH};
    let target = target
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let replacement = replacement
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let backup_wide = backup.map(|path| {
        path.as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<_>>()
    });
    let backup_ptr = backup_wide
        .as_ref()
        .map_or(std::ptr::null(), |path| path.as_ptr());
    let result = unsafe {
        ReplaceFileW(
            target.as_ptr(),
            replacement.as_ptr(),
            backup_ptr,
            REPLACEFILE_WRITE_THROUGH,
            std::ptr::null(),
            std::ptr::null(),
        )
    };
    if result == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

fn file_state(bytes: &[u8]) -> ValidatedFileState {
    ValidatedFileState::File {
        sha256: sha256(bytes),
        bytes: bytes.len() as u64,
    }
}

fn sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn path_key(path: &Path) -> String {
    display_path(path)
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase()
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn native_error(code: &str, message: impl std::fmt::Display) -> String {
    format!("{code}: {message}")
}

fn io_error(code: &str, path: &Path, error: io::Error) -> String {
    native_error(code, format!("{}: {error}", path.display()))
}

#[cfg(all(test, windows))]
#[path = "workspace_mutation_tests.rs"]
mod tests;
