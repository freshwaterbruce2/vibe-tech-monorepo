use super::*;
use std::{
    process::Command,
    sync::atomic::{AtomicU64, Ordering},
};

static TEST_SEQUENCE: AtomicU64 = AtomicU64::new(1);

struct TestArea {
    base: PathBuf,
    workspace: PathBuf,
}

impl TestArea {
    fn new() -> Self {
        let id = TEST_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let base = PathBuf::from(r"V:\monorepo\.nx\tmp\vcs-native-mutation-tests")
            .join(format!("{}-{id}", std::process::id()));
        let workspace = base.join("workspace");
        fs::create_dir_all(&workspace).unwrap();
        Self { base, workspace }
    }

    fn target(&self, relative: &str) -> PathBuf {
        self.workspace.join(relative)
    }
}

impl Drop for TestArea {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.base);
    }
}

fn request(
    area: &TestArea,
    target: &Path,
    change_type: MutationChangeType,
    expected_state: ExpectedMutationState,
    new_content: Option<&str>,
) -> WorkspaceMutationRequest {
    let id = TEST_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    WorkspaceMutationRequest {
        proposal_id: format!("proposal_test_{id}"),
        proposal_hash: sha256(format!("proposal-{id}").as_bytes()),
        task_id: format!("task-{id}"),
        step_id: format!("step-{id}"),
        action_type: "write_file".to_string(),
        workspace_root: display_path(&area.workspace),
        target_path: display_path(target),
        change_type,
        expected_state,
        new_content: new_content.map(str::to_string),
    }
}

fn assert_no_transaction_files(area: &TestArea) {
    let entries = fs::read_dir(&area.workspace)
        .unwrap()
        .flatten()
        .collect::<Vec<_>>();
    assert!(!entries.iter().any(|entry| entry
        .file_name()
        .to_string_lossy()
        .starts_with(".vcs-mutation-")));
}

#[test]
fn creates_modifies_deletes_and_creates_directory_with_readback() {
    let area = TestArea::new();
    let target = area.target("index.ts");
    let create = request(
        &area,
        &target,
        MutationChangeType::Create,
        ExpectedMutationState::Missing,
        Some("old\r\n"),
    );
    let create_result = apply_workspace_mutation_inner(create).unwrap();
    assert_eq!(fs::read(&target).unwrap(), b"old\r\n");
    assert_eq!(create_result.replacement_strategy, "atomic_create");

    let modify = request(
        &area,
        &target,
        MutationChangeType::Modify,
        ExpectedMutationState::File {
            sha256: sha256(b"old\r\n"),
        },
        Some("new \u{2713}\n"),
    );
    let modify_result = apply_workspace_mutation_inner(modify).unwrap();
    assert_eq!(fs::read_to_string(&target).unwrap(), "new \u{2713}\n");
    assert_eq!(
        modify_result.replacement_strategy,
        "atomic_replace_with_verified_backup"
    );

    let directory = area.target("src");
    let mkdir = request(
        &area,
        &directory,
        MutationChangeType::CreateDirectory,
        ExpectedMutationState::Missing,
        None,
    );
    assert_eq!(
        apply_workspace_mutation_inner(mkdir)
            .unwrap()
            .resulting_state,
        ValidatedFileState::Directory
    );

    let delete = request(
        &area,
        &target,
        MutationChangeType::Delete,
        ExpectedMutationState::File {
            sha256: sha256("new \u{2713}\n".as_bytes()),
        },
        None,
    );
    assert_eq!(
        apply_workspace_mutation_inner(delete)
            .unwrap()
            .resulting_state,
        ValidatedFileState::Missing
    );
    assert!(!target.exists());
    assert_no_transaction_files(&area);
}

#[test]
fn changed_hash_is_rejected_without_mutation_and_proposal_cannot_replay() {
    let area = TestArea::new();
    let target = area.target("index.ts");
    fs::write(&target, "actual").unwrap();
    let mutation = request(
        &area,
        &target,
        MutationChangeType::Modify,
        ExpectedMutationState::File {
            sha256: sha256(b"expected"),
        },
        Some("replacement"),
    );
    let replay = mutation.clone();
    assert!(apply_workspace_mutation_inner(mutation)
        .unwrap_err()
        .contains("TARGET_CHANGED"));
    assert!(apply_workspace_mutation_inner(replay)
        .unwrap_err()
        .contains("PROPOSAL_REPLAY"));
    assert_eq!(fs::read_to_string(target).unwrap(), "actual");
    assert_no_transaction_files(&area);
}

#[test]
fn rejects_unc_device_traversal_ads_foreign_drive_and_prefix_collision() {
    assert!(parse_normal_drive_path("target", r"\\server\share\x").is_err());
    assert!(parse_normal_drive_path("target", r"\\?\V:\monorepo\x").is_err());
    assert!(parse_normal_drive_path("target", r"V:\monorepo\..\x").is_err());
    assert!(parse_normal_drive_path("target", r"V:\monorepo\x.txt:secret").is_err());

    let area = TestArea::new();
    let sibling = area.base.join("workspace-prefix-collision").join("x.ts");
    fs::create_dir_all(sibling.parent().unwrap()).unwrap();
    let collision = request(
        &area,
        &sibling,
        MutationChangeType::Create,
        ExpectedMutationState::Missing,
        Some("x"),
    );
    assert!(validate_paths(&collision)
        .unwrap_err()
        .contains("OUTSIDE_WORKSPACE"));
    let foreign = request(
        &area,
        Path::new(r"D:\data\x.ts"),
        MutationChangeType::Create,
        ExpectedMutationState::Missing,
        Some("x"),
    );
    assert!(validate_paths(&foreign)
        .unwrap_err()
        .contains("FOREIGN_DRIVE"));
}

#[test]
fn rejects_junction_escape() {
    let area = TestArea::new();
    let outside = area.base.join("outside");
    let junction = area.target("escape");
    fs::create_dir_all(&outside).unwrap();
    let linked = std::os::windows::fs::symlink_dir(&outside, &junction).is_ok()
        || Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(&junction)
            .arg(&outside)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false);
    assert!(linked, "test requires a temporary symlink or junction");
    let mutation = request(
        &area,
        &junction.join("x.ts"),
        MutationChangeType::Create,
        ExpectedMutationState::Missing,
        Some("x"),
    );
    assert!(validate_paths(&mutation)
        .unwrap_err()
        .contains("REPARSE_POINT_REJECTED"));
    assert!(!outside.join("x.ts").exists());
}

#[test]
fn holds_ancestor_directories_stable_for_the_transaction() {
    let area = TestArea::new();
    let source = area.target("src");
    let moved = area.target("src-moved");
    fs::create_dir_all(&source).unwrap();
    let mutation = request(
        &area,
        &source.join("index.ts"),
        MutationChangeType::Create,
        ExpectedMutationState::Missing,
        Some("x"),
    );

    let paths = validate_paths(&mutation).unwrap();
    assert!(fs::rename(&source, &moved).is_err());
    drop(paths);
    fs::rename(&source, &moved).unwrap();
}
