pub(super) fn timestamp_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Helper to safely parse JSON context from learning events
pub(super) fn parse_context_json(context: &Option<String>) -> Option<serde_json::Value> {
    context.as_ref().and_then(|s| serde_json::from_str(s).ok())
}
