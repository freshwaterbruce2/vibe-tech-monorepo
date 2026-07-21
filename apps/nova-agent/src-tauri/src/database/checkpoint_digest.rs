use super::checkpoint_types::CheckpointContent;
use serde_json::{json, Value};

const CHECKPOINT_SCHEMA_VERSION: i64 = 1;
const MAX_STORED_JSON_BYTES: usize = 16 * 1024;

fn checksum_parts(parts: &[&str]) -> String {
    let mut hasher = blake3::Hasher::new();
    for part in parts {
        hasher.update(&(part.len() as u64).to_le_bytes());
        hasher.update(part.as_bytes());
    }
    format!("blake3:{}", hasher.finalize().to_hex())
}

pub(crate) fn digest_value(value: &Value) -> String {
    digest_bytes(&canonical_json_bytes(value))
}

pub(crate) fn digest_bytes(bytes: &[u8]) -> String {
    format!("blake3:{}", blake3::hash(bytes).to_hex())
}

fn canonical_json_bytes(value: &Value) -> Vec<u8> {
    fn write(value: &Value, output: &mut Vec<u8>) {
        match value {
            Value::Null => output.extend_from_slice(b"null"),
            Value::Bool(flag) => output.extend_from_slice(if *flag { b"true" } else { b"false" }),
            Value::Number(number) => output.extend_from_slice(number.to_string().as_bytes()),
            Value::String(text) => {
                output.extend_from_slice(serde_json::to_string(text).unwrap().as_bytes())
            }
            Value::Array(items) => {
                output.push(b'[');
                for (index, item) in items.iter().enumerate() {
                    if index > 0 {
                        output.push(b',');
                    }
                    write(item, output);
                }
                output.push(b']');
            }
            Value::Object(map) => {
                output.push(b'{');
                let mut keys = map.keys().collect::<Vec<_>>();
                keys.sort();
                for (index, key) in keys.into_iter().enumerate() {
                    if index > 0 {
                        output.push(b',');
                    }
                    output.extend_from_slice(serde_json::to_string(key).unwrap().as_bytes());
                    output.push(b':');
                    write(&map[key], output);
                }
                output.push(b'}');
            }
        }
    }
    let mut output = Vec::new();
    write(value, &mut output);
    output
}

fn redact(value: &Value) -> Value {
    match value {
        Value::Object(map) => Value::Object(
            map.iter()
                .map(|(key, value)| {
                    let lowered = key.to_ascii_lowercase();
                    let sensitive = [
                        "token",
                        "secret",
                        "password",
                        "authorization",
                        "api_key",
                        "code",
                        "arguments",
                        "content",
                    ]
                    .iter()
                    .any(|needle| lowered.contains(needle));
                    (
                        key.clone(),
                        if sensitive {
                            json!("[REDACTED]")
                        } else {
                            redact(value)
                        },
                    )
                })
                .collect(),
        ),
        Value::Array(items) => Value::Array(items.iter().take(100).map(redact).collect()),
        Value::String(text) if text.trim_start().starts_with(['{', '[']) => {
            serde_json::from_str::<Value>(text)
                .map(|parsed| redact(&parsed))
                .unwrap_or_else(|_| json!(text))
        }
        Value::String(text) if text.chars().count() > 2048 => {
            json!(format!(
                "{}...[truncated]",
                text.chars().take(2048).collect::<String>()
            ))
        }
        other => other.clone(),
    }
}

pub(crate) fn bounded_json(value: &Value) -> String {
    let redacted = redact(value);
    let encoded = serde_json::to_string(&redacted).unwrap_or_else(|_| "null".to_string());
    if encoded.len() <= MAX_STORED_JSON_BYTES {
        encoded
    } else {
        serde_json::to_string(&json!({
            "truncated": true,
            "original_bytes": encoded.len(),
        }))
        .expect("static JSON serializes")
    }
}

pub(crate) fn encoded_content(content: &CheckpointContent) -> [String; 8] {
    [
        bounded_json(&content.plan),
        bounded_json(&content.progress),
        bounded_json(&content.tool_results),
        content
            .pending_approval
            .as_ref()
            .map(bounded_json)
            .unwrap_or_default(),
        bounded_json(&content.errors),
        bounded_json(&content.conversation),
        bounded_json(&content.next_action),
        bounded_json(&content.preconditions),
    ]
}

pub(crate) fn content_checksum(content: &CheckpointContent, encoded: &[String; 8]) -> String {
    checksum_parts(&[
        &CHECKPOINT_SCHEMA_VERSION.to_string(),
        &content.state,
        &encoded[0],
        &encoded[1],
        &encoded[2],
        &encoded[3],
        &encoded[4],
        &encoded[5],
        &encoded[6],
        &content.workspace_fingerprint,
        &encoded[7],
    ])
}
