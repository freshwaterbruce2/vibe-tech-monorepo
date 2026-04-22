//! Security posture tests for vibe-justice Tauri config.
//! Each test maps 1:1 to a CRITICAL/HIGH finding from the 2026-04-21 review.
//! Run with: `cargo test --test security`

use std::fs;

fn read_json(rel: &str) -> serde_json::Value {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(rel);
    serde_json::from_str(&fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!("failed to read {}: {}", path.display(), e)
    }))
    .unwrap_or_else(|e| panic!("invalid JSON in {}: {}", path.display(), e))
}

#[test]
fn csp_does_not_allow_unsafe_inline_scripts() {
    // CRITICAL #12: script-src 'unsafe-inline' negates XSS protection.
    let conf = read_json("tauri.conf.json");
    let csp = conf
        .pointer("/app/security/csp")
        .or_else(|| conf.pointer("/tauri/security/csp"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let inline_in_scripts = csp.split(';').any(|directive| {
        let t = directive.trim();
        t.starts_with("script-src") && t.contains("'unsafe-inline'")
    });
    assert!(
        !inline_in_scripts,
        "CRITICAL: script-src permits 'unsafe-inline' — CSP: {}",
        csp
    );
}

#[test]
fn csp_declares_object_and_frame_ancestors_none() {
    let conf = read_json("tauri.conf.json");
    let csp = conf
        .pointer("/app/security/csp")
        .or_else(|| conf.pointer("/tauri/security/csp"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    assert!(csp.contains("object-src 'none'"), "CSP missing object-src 'none'");
    assert!(csp.contains("frame-ancestors 'none'"), "CSP missing frame-ancestors 'none'");
}

#[test]
fn capabilities_do_not_grant_global_shell_execute() {
    // CRITICAL #11: shell:allow-execute with no scope = arbitrary command execution.
    let cap = read_json("capabilities/default.json");
    let perms = cap
        .pointer("/permissions")
        .and_then(|v| v.as_array())
        .expect("capabilities/default.json must have /permissions array");
    let has_execute = perms.iter().any(|p| match p {
        serde_json::Value::String(s) => s == "shell:allow-execute",
        serde_json::Value::Object(o) => {
            o.get("identifier").and_then(|v| v.as_str()) == Some("shell:allow-execute")
        }
        _ => false,
    });
    assert!(
        !has_execute,
        "CRITICAL: shell:allow-execute granted without scope"
    );
}

#[test]
fn fs_scope_excludes_databases_dir() {
    // HIGH: D:/databases is backend-only; frontend must route DB I/O through the API.
    let raw = fs::read_to_string(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("capabilities/default.json"),
    )
    .unwrap();
    assert!(
        !raw.contains("D:/databases") && !raw.contains("D:\\\\databases"),
        "HIGH: fs scope must not expose D:/databases"
    );
}
