use super::checkpoint_digest::{digest_bytes, digest_value};
use super::types::Task;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::process::Command;

pub(crate) fn trusted_evidence(task: &Task) -> Result<(String, Value), String> {
    let metadata = task
        .metadata
        .as_deref()
        .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
        .unwrap_or_else(|| json!({}));
    let project = metadata
        .get("project_path")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let canonical = std::fs::canonicalize(project).unwrap_or_else(|_| PathBuf::from(project));
    let workspace = canonical.to_string_lossy().to_lowercase();
    let definition = execution_definition(task, &metadata);
    let review = review_evidence(&metadata);
    let source = source_evidence(&canonical)?;
    Ok((
        workspace.clone(),
        json!({
            "canonical_path": workspace,
            "project_exists": canonical.is_dir(),
            "task_definition_digest": digest_value(&definition),
            "git_head": source.git_head,
            "dirty_source_digest": source.dirty_digest,
            "review": review,
        }),
    ))
}

fn execution_definition(task: &Task, metadata: &Value) -> Value {
    let mut relevant = metadata.clone();
    if let Some(object) = relevant.as_object_mut() {
        for decision_output in [
            "approved_for_execution",
            "approved_plan_digest",
            "approved_effect_digests",
            "approval_decided_at",
        ] {
            object.remove(decision_output);
        }
    }
    json!({
        "id": task.id,
        "title": task.title,
        "metadata": relevant,
    })
}

fn review_evidence(metadata: &Value) -> Value {
    let path = metadata.get("review_artifact_path").and_then(Value::as_str);
    let bytes = path.and_then(|value| std::fs::read(value).ok());
    let file_metadata = path.and_then(|value| std::fs::metadata(value).ok());
    json!({
        "path": path.map(|value| std::fs::canonicalize(value).unwrap_or_else(|_| value.into()).to_string_lossy().to_lowercase()),
        "content_digest": bytes.as_deref().map(digest_bytes),
        "bytes": file_metadata.as_ref().map(std::fs::Metadata::len),
        "modified_seconds": file_metadata.and_then(|value| value.modified().ok()).and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok()).map(|value| value.as_secs()),
        "version": metadata.get("review_version"),
        "reviewed_at": metadata.get("reviewed_at"),
        "target_path": metadata.get("review_target_path"),
        "evidence_count": metadata.get("review_evidence_count"),
    })
}

struct SourceEvidence {
    git_head: Option<String>,
    dirty_digest: String,
}

fn source_evidence(project: &Path) -> Result<SourceEvidence, String> {
    if !project.is_dir() {
        return Ok(SourceEvidence {
            git_head: None,
            dirty_digest: digest_bytes(b"missing-project"),
        });
    }
    let head = git_output(project, &["rev-parse", "HEAD"]);
    if let Ok(head) = head {
        let mut hasher = blake3::Hasher::new();
        hash_command(
            &mut hasher,
            project,
            &[
                "status",
                "--porcelain=v1",
                "-z",
                "--untracked-files=all",
                "--",
                ".",
            ],
        )?;
        hash_command(
            &mut hasher,
            project,
            &["diff", "--binary", "HEAD", "--", "."],
        )?;
        hash_command(
            &mut hasher,
            project,
            &["diff", "--binary", "--cached", "--", "."],
        )?;
        let untracked = git_output(
            project,
            &[
                "ls-files",
                "--others",
                "--exclude-standard",
                "-z",
                "--",
                ".",
            ],
        )?;
        for relative in untracked
            .split(|byte| *byte == 0)
            .filter(|path| !path.is_empty())
        {
            hasher.update(&(relative.len() as u64).to_le_bytes());
            hasher.update(relative);
            let path = project.join(String::from_utf8_lossy(relative).as_ref());
            let bytes = std::fs::read(&path)
                .map_err(|error| format!("cannot fingerprint {}: {error}", path.display()))?;
            hasher.update(&(bytes.len() as u64).to_le_bytes());
            hasher.update(&bytes);
        }
        return Ok(SourceEvidence {
            git_head: Some(String::from_utf8_lossy(&head).trim().to_string()),
            dirty_digest: format!("blake3:{}", hasher.finalize().to_hex()),
        });
    }
    let mut entries = walkdir::WalkDir::new(project)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| entry.path().to_path_buf());
    let mut hasher = blake3::Hasher::new();
    for entry in entries {
        let relative = entry.path().strip_prefix(project).unwrap_or(entry.path());
        hasher.update(relative.to_string_lossy().as_bytes());
        let bytes = std::fs::read(entry.path()).map_err(|error| error.to_string())?;
        hasher.update(&(bytes.len() as u64).to_le_bytes());
        hasher.update(&bytes);
    }
    Ok(SourceEvidence {
        git_head: None,
        dirty_digest: format!("blake3:{}", hasher.finalize().to_hex()),
    })
}

fn hash_command(hasher: &mut blake3::Hasher, path: &Path, args: &[&str]) -> Result<(), String> {
    let output = git_output(path, args)?;
    hasher.update(&(output.len() as u64).to_le_bytes());
    hasher.update(&output);
    Ok(())
}

fn git_output(path: &Path, args: &[&str]) -> Result<Vec<u8>, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(path)
        .output()
        .map_err(|error| format!("git evidence failed: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(output.stdout)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn approval_outputs_do_not_change_definition_but_inputs_do() {
        let task = Task {
            id: "t".into(),
            title: "title".into(),
            status: "pending".into(),
            created_at: 0,
            updated_at: 0,
            metadata: None,
        };
        let first = execution_definition(
            &task,
            &json!({"description":"one","approved_plan_digest":"old"}),
        );
        let second = execution_definition(
            &task,
            &json!({"description":"one","approved_plan_digest":"new"}),
        );
        let changed = execution_definition(
            &task,
            &json!({"description":"two","approved_plan_digest":"new"}),
        );
        assert_eq!(digest_value(&first), digest_value(&second));
        assert_ne!(digest_value(&first), digest_value(&changed));
    }
}
