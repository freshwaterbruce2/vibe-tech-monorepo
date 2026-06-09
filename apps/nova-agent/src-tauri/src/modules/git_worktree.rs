use std::path::{Path, PathBuf};
use std::process::Command;
use tracing::{error, info};

pub fn create_worktree(repo_path: &Path, subtask_id: &str) -> Result<(PathBuf, String), String> {
    // 1. Define branch name: nova-subtask-<id>
    let branch_name = format!("nova-subtask-{}", subtask_id);
    
    // 2. Define worktree path: D:\nova-worktrees\<id>
    let worktree_path = PathBuf::from("D:\\nova-worktrees").join(subtask_id);

    // Make sure parent directory and worktree path exists
    if let Err(e) = std::fs::create_dir_all(&worktree_path) {
        return Err(format!("Failed to create worktree directory: {}", e));
    }

    info!(
        "Creating Git worktree at {} on branch {}",
        worktree_path.display(),
        branch_name
    );

    // Execute: git worktree add <path> -b <branch_name>
    let output = Command::new("git")
        .current_dir(repo_path)
        .arg("worktree")
        .arg("add")
        .arg(&worktree_path)
        .arg("-b")
        .arg(&branch_name)
        .output()
        .map_err(|e| format!("Failed to execute git worktree add: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("git worktree add failed: {}", stderr);
        return Err(format!("git worktree add failed: {}", stderr));
    }

    Ok((worktree_path, branch_name))
}

pub fn commit_worktree_changes(worktree_path: &Path, message: &str) -> Result<(), String> {
    info!("Committing changes in worktree: {}", worktree_path.display());

    // git add .
    let output_add = Command::new("git")
        .current_dir(worktree_path)
        .arg("add")
        .arg(".")
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !output_add.status.success() {
        let stderr = String::from_utf8_lossy(&output_add.stderr);
        return Err(format!("git add failed: {}", stderr));
    }

    // git commit -m "<message>"
    let output_commit = Command::new("git")
        .current_dir(worktree_path)
        .arg("commit")
        .arg("-m")
        .arg(message)
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    // Note: if there are no changes, commit might return non-zero. We ignore this or log it.
    if !output_commit.status.success() {
        let stderr = String::from_utf8_lossy(&output_commit.stderr);
        info!("git commit finished: {}", stderr);
    }

    Ok(())
}

pub fn merge_worktree_branch(repo_path: &Path, branch_name: &str) -> Result<(), String> {
    info!(
        "Merging branch {} into primary repository at {}",
        branch_name,
        repo_path.display()
    );

    let output = Command::new("git")
        .current_dir(repo_path)
        .arg("merge")
        .arg(branch_name)
        .output()
        .map_err(|e| format!("Failed to run git merge: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("git merge failed: {}", stderr);
        return Err(format!("git merge failed: {}", stderr));
    }

    Ok(())
}

pub fn remove_worktree(repo_path: &Path, worktree_path: &Path, branch_name: &str) -> Result<(), String> {
    info!(
        "Removing worktree at {} and branch {}",
        worktree_path.display(),
        branch_name
    );

    // git worktree remove <path> --force
    let output_remove = Command::new("git")
        .current_dir(repo_path)
        .arg("worktree")
        .arg("remove")
        .arg(worktree_path)
        .arg("--force")
        .output()
        .map_err(|e| format!("Failed to run git worktree remove: {}", e))?;

    if !output_remove.status.success() {
        let stderr = String::from_utf8_lossy(&output_remove.stderr);
        error!("git worktree remove failed: {}", stderr);
    }

    // git branch -D <branch_name>
    let output_branch = Command::new("git")
        .current_dir(repo_path)
        .arg("branch")
        .arg("-D")
        .arg(branch_name)
        .output()
        .map_err(|e| format!("Failed to delete git branch {}: {}", branch_name, e))?;

    if !output_branch.status.success() {
        let stderr = String::from_utf8_lossy(&output_branch.stderr);
        error!("git branch -D failed: {}", stderr);
    }

    // Clean up directory if anything left
    let _ = std::fs::remove_dir_all(worktree_path);

    Ok(())
}
