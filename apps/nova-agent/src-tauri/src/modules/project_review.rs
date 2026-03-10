use regex::Regex;
use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};

const DEFAULT_REVIEW_ARTIFACT_DIR: &str = r"D:\databases\nova-agent\reviews";

#[derive(Debug, Clone, Deserialize)]
pub struct ReviewEvidence {
    pub path: String,
}

#[derive(Debug, Clone, Deserialize)]
struct StoredProjectReviewArtifact {
    #[serde(default)]
    reviewed_path: String,
    #[serde(default)]
    reviewed_at: String,
    #[serde(default)]
    review_version: String,
    #[serde(default)]
    artifact_path: String,
    #[serde(default)]
    evidence_count: usize,
    #[serde(default)]
    evidence: Vec<ReviewEvidence>,
}

#[derive(Debug, Clone)]
pub struct ProjectReviewSummary {
    pub artifact_path: String,
    pub reviewed_path: String,
    pub reviewed_at: String,
    pub review_version: String,
    pub evidence_count: usize,
    pub evidence_paths: Vec<String>,
}

fn normalize_path(path: &str) -> String {
    path.trim()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase()
}

pub fn review_artifact_dir() -> PathBuf {
    std::env::var("NOVA_REVIEW_ARTIFACT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(DEFAULT_REVIEW_ARTIFACT_DIR))
}

fn parse_review_artifact_file(path: &Path) -> Result<ProjectReviewSummary, String> {
    let raw = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read review artifact {}: {}", path.display(), e))?;
    let artifact: StoredProjectReviewArtifact = serde_json::from_str(&raw)
        .map_err(|e| format!("Failed to parse review artifact {}: {}", path.display(), e))?;

    let artifact_path = if artifact.artifact_path.trim().is_empty() {
        path.to_string_lossy().to_string()
    } else {
        artifact.artifact_path
    };

    let evidence_paths = artifact.evidence.into_iter().map(|item| item.path).collect::<Vec<_>>();
    let evidence_count = if artifact.evidence_count > 0 {
        artifact.evidence_count
    } else {
        evidence_paths.len()
    };

    Ok(ProjectReviewSummary {
        artifact_path,
        reviewed_path: artifact.reviewed_path,
        reviewed_at: artifact.reviewed_at,
        review_version: artifact.review_version,
        evidence_count,
        evidence_paths,
    })
}

pub fn find_latest_review_for_project(project_path: &str) -> Result<Option<ProjectReviewSummary>, String> {
    let review_dir = review_artifact_dir();
    if !review_dir.exists() {
        return Ok(None);
    }

    let normalized_target = normalize_path(project_path);
    let mut best_match: Option<(std::time::SystemTime, ProjectReviewSummary)> = None;

    for entry in fs::read_dir(&review_dir)
        .map_err(|e| format!("Failed to read review artifact directory {}: {}", review_dir.display(), e))?
    {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }

        let summary = match parse_review_artifact_file(&path) {
            Ok(summary) => summary,
            Err(_) => continue,
        };

        if normalize_path(&summary.reviewed_path) != normalized_target {
            continue;
        }

        let modified = fs::metadata(&path)
            .and_then(|metadata| metadata.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

        match &best_match {
            Some((best_modified, _)) if modified <= *best_modified => {}
            _ => best_match = Some((modified, summary)),
        }
    }

    Ok(best_match.map(|(_, summary)| summary))
}

pub fn validate_review_for_project(
    project_path: &str,
    artifact_path: Option<&str>,
) -> Result<ProjectReviewSummary, String> {
    let review = if let Some(path) = artifact_path {
        let candidate = PathBuf::from(path);
        if !candidate.exists() {
            return Err(format!("Review artifact is missing: {}", candidate.display()));
        }
        parse_review_artifact_file(&candidate)?
    } else {
        find_latest_review_for_project(project_path)?
            .ok_or_else(|| format!("No grounded project review found for {}", project_path))?
    };

    if normalize_path(&review.reviewed_path) != normalize_path(project_path) {
        return Err(format!(
            "Review target mismatch. Expected {}, found {}",
            project_path, review.reviewed_path
        ));
    }

    if review.evidence_count == 0 {
        return Err("Review artifact has no evidence".to_string());
    }

    Ok(review)
}

pub fn collect_missing_path_references(text: &str) -> Vec<String> {
    let path_regex = Regex::new(r"(?i)[A-Z]:\\[A-Za-z0-9 _.\-\\]+").expect("valid path regex");
    let mut missing = Vec::new();

    for capture in path_regex.find_iter(text) {
        let candidate = capture.as_str().trim_matches(|ch: char| ch == '"' || ch == '\'' || ch == ',' || ch == ')');
        if candidate.is_empty() {
            continue;
        }
        if !Path::new(candidate).exists() && !missing.iter().any(|value| value == candidate) {
            missing.push(candidate.to_string());
        }
    }

    missing
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn finds_latest_review_for_matching_project() {
        let review_dir = tempdir().unwrap();
        std::env::set_var("NOVA_REVIEW_ARTIFACT_DIR", review_dir.path());

        let older = review_dir.path().join("older.json");
        let newer = review_dir.path().join("newer.json");

        fs::write(
            &older,
            r#"{
                "reviewed_path": "C:\\dev\\apps\\nova-agent",
                "reviewed_at": "2026-03-09T10:00:00Z",
                "review_version": "v1",
                "evidence_count": 1,
                "evidence": [{ "path": "C:\\dev\\apps\\nova-agent\\package.json" }]
            }"#,
        )
        .unwrap();

        std::thread::sleep(std::time::Duration::from_millis(25));

        fs::write(
            &newer,
            r#"{
                "reviewed_path": "C:\\dev\\apps\\nova-agent",
                "reviewed_at": "2026-03-09T11:00:00Z",
                "review_version": "v1",
                "evidence_count": 2,
                "evidence": [
                    { "path": "C:\\dev\\apps\\nova-agent\\package.json" },
                    { "path": "C:\\dev\\apps\\nova-agent\\project.json" }
                ]
            }"#,
        )
        .unwrap();

        let review = find_latest_review_for_project(r"C:\dev\apps\nova-agent")
            .unwrap()
            .unwrap();

        assert_eq!(review.evidence_count, 2);
        assert!(review.artifact_path.ends_with("newer.json"));
    }

    #[test]
    fn collects_missing_windows_paths_from_text() {
        let missing = collect_missing_path_references(
            r"Review C:\dev\docs\architecture-improvement\AGENT_ASSIGNMENTS.md and C:\definitely-missing\plan.md",
        );

        assert!(!missing.is_empty());
        assert!(missing.iter().any(|value| value.contains("architecture-improvement")));
    }
}
