use super::types::CodePattern;

pub(super) fn extract_patterns(content: &str, language: &str, file_path: &str) -> Vec<CodePattern> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let mut patterns = Vec::new();

    match language {
        "typescript" | "javascript" => {
            patterns.extend(extract_ts_patterns(content, language, file_path, now));
        }
        "rust" => {
            patterns.extend(extract_rust_patterns(content, file_path, now));
        }
        "python" => {
            patterns.extend(extract_python_patterns(content, file_path, now));
        }
        _ => {}
    }

    patterns
}

fn extract_ts_patterns(
    content: &str,
    language: &str,
    file_path: &str,
    timestamp: i64,
) -> Vec<CodePattern> {
    let mut patterns = Vec::new();

    let imports = content
        .lines()
        .filter(|line| line.trim().starts_with("import "))
        .map(|line| line.trim().to_string())
        .collect::<Vec<_>>()
        .join(", ");

    let imports_opt = if imports.is_empty() {
        None
    } else {
        Some(imports)
    };

    for line in content.lines() {
        let trimmed = line.trim();

        if let Some(name) = extract_function_name(trimmed) {
            let snippet = get_code_snippet(content, trimmed, 10);

            patterns.push(CodePattern {
                id: 0,
                pattern_type: "function".to_string(),
                name: name.to_string(),
                code_snippet: snippet,
                file_path: file_path.to_string(),
                language: language.to_string(),
                imports: imports_opt.clone(),
                usage_count: 0,
                last_used: None,
                tags: None,
                created_at: timestamp,
            });
        }

        if trimmed.contains("export") && (trimmed.contains("const") || trimmed.contains("function"))
        {
            if let Some(name) = extract_component_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 15);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "component".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: language.to_string(),
                    imports: imports_opt.clone(),
                    usage_count: 0,
                    last_used: None,
                    tags: Some("react".to_string()),
                    created_at: timestamp,
                });
            }
        }

        if trimmed.contains("use") && trimmed.contains('=') {
            if let Some(name) = extract_hook_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 12);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "hook".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: language.to_string(),
                    imports: imports_opt.clone(),
                    usage_count: 0,
                    last_used: None,
                    tags: Some("react,hook".to_string()),
                    created_at: timestamp,
                });
            }
        }
    }

    patterns
}

fn extract_rust_patterns(content: &str, file_path: &str, timestamp: i64) -> Vec<CodePattern> {
    let mut patterns = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("pub fn ") || trimmed.starts_with("fn ") {
            if let Some(name) = extract_rust_function_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 15);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "function".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "rust".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }

        if trimmed.starts_with("pub struct ") || trimmed.starts_with("struct ") {
            if let Some(name) = extract_rust_struct_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 10);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "struct".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "rust".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }
    }

    patterns
}

fn extract_python_patterns(content: &str, file_path: &str, timestamp: i64) -> Vec<CodePattern> {
    let mut patterns = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("def ") {
            if let Some(name) = extract_python_function_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 12);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "function".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "python".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }

        if trimmed.starts_with("class ") {
            if let Some(name) = extract_python_class_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 15);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "class".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "python".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }
    }

    patterns
}

fn get_code_snippet(content: &str, start_line: &str, max_lines: usize) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let start_idx = lines.iter().position(|&l| l.trim() == start_line);

    if let Some(idx) = start_idx {
        let end_idx = (idx + max_lines).min(lines.len());
        lines[idx..end_idx].join("\n")
    } else {
        start_line.to_string()
    }
}

fn extract_function_name(line: &str) -> Option<String> {
    if line.starts_with("function ") {
        line.split_whitespace()
            .nth(1)
            .and_then(|s| s.split('(').next())
            .map(|s| s.to_string())
    } else if line.contains("const ") && line.contains('=') {
        line.split("const ")
            .nth(1)
            .and_then(|s| s.split('=').next())
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

fn extract_component_name(line: &str) -> Option<String> {
    if line.contains("export") && line.contains("const") {
        line.split("const ")
            .nth(1)
            .and_then(|s| s.split('=').next())
            .map(|s| s.trim().to_string())
    } else if line.contains("export function") {
        line.split("function ")
            .nth(1)
            .and_then(|s| s.split('(').next())
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

fn extract_hook_name(line: &str) -> Option<String> {
    if line.contains("const use") || line.contains("export const use") {
        line.split("const ")
            .nth(1)
            .and_then(|s| s.split('=').next())
            .and_then(|s| {
                let name = s.trim();
                if name.starts_with("use") {
                    Some(name.to_string())
                } else {
                    None
                }
            })
    } else {
        None
    }
}

fn extract_rust_function_name(line: &str) -> Option<String> {
    line.split("fn ")
        .nth(1)
        .and_then(|s| s.split('(').next())
        .map(|s| s.trim().to_string())
}

fn extract_rust_struct_name(line: &str) -> Option<String> {
    line.split("struct ")
        .nth(1)
        .and_then(|s| s.split_whitespace().next())
        .map(|s| s.trim().to_string())
}

fn extract_python_function_name(line: &str) -> Option<String> {
    line.split("def ")
        .nth(1)
        .and_then(|s| s.split('(').next())
        .map(|s| s.trim().to_string())
}

fn extract_python_class_name(line: &str) -> Option<String> {
    line.split("class ")
        .nth(1)
        .and_then(|s| s.split(':').next())
        .and_then(|s| s.split('(').next())
        .map(|s| s.trim().to_string())
}
