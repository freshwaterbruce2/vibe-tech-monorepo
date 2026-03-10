// Hallucination Detection Validator for NOVA Agent
// Prevents models from claiming file operations without tool execution
// Version 1.0 - January 4, 2026

#![allow(dead_code)]
use regex::Regex;
use tracing::warn;

/// Patterns that indicate file operation claims
const HALLUCINATION_PATTERNS: &[&str] = &[
    r"(?i)✅.*created",
    r"(?i)✅.*file.*successfully",
    r"(?i)✅.*wrote.*lines",
    r"(?i)successfully\s+wrote\s+to",
    r"(?i)file\s+created\s+successfully",
    r"(?i)created.*at\s+C:\\",
    r"(?i)saved.*to\s+C:\\",
    r"(?i)written\s+to\s+C:\\",
    r"(?i)mode:\s*rewrite",
    r"(?i)lines\s+written:",
    r"(?i)content:\s+\d+\s+lines",
];

/// Check if response contains hallucination patterns
pub fn contains_hallucination_indicators(text: &str) -> bool {
    for pattern in HALLUCINATION_PATTERNS {
        if let Ok(re) = Regex::new(pattern) {
            if re.is_match(text) {
                return true;
            }
        }
    }
    false
}

/// Validate response against tool calls
pub fn validate_response(
    response: &str,
    tool_calls_made: usize,
) -> Result<String, String> {
    // If no hallucination indicators, response is safe
    if !contains_hallucination_indicators(response) {
        return Ok(response.to_string());
    }

    // If hallucination indicators found but tools were called, it's valid
    if tool_calls_made > 0 {
        return Ok(response.to_string());
    }

    // HALLUCINATION DETECTED: Claims file ops without tool calls
    warn!("🚨 HALLUCINATION DETECTED: Response claims file operations without tool execution");
    warn!("Response preview: {}", &response[..response.len().min(200)]);

    // Return error instead of hallucinated response
    Err(format!(
        "⚠️ HALLUCINATION BLOCKED: The AI model claimed to perform file operations \
        without actually calling the required tools. This is a known issue with some models.\n\n\
        Please try again with a more explicit instruction like:\n\
        'Use write_file() to create [filename] with [content], then show me the result.'\n\n\
        Model used: Check NOVA settings to see which model is active.\n\
        Suggestion: Try enabling a paid model (DeepSeek Speciale or Claude Sonnet) for better reliability."
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detects_hallucination() {
        let fake_response = "✅ Created C:\\dev\\test.txt - Lines written: 10";
        assert!(contains_hallucination_indicators(fake_response));
    }

    #[test]
    fn test_allows_normal_response() {
        let normal = "I can help you create that file. Let me call the write_file tool.";
        assert!(!contains_hallucination_indicators(normal));
    }

    #[test]
    fn test_validates_with_tool_calls() {
        let response = "✅ File created successfully at C:\\dev\\test.txt";
        let result = validate_response(response, 1);
        assert!(result.is_ok());
    }

    #[test]
    fn test_blocks_without_tool_calls() {
        let response = "✅ File created successfully at C:\\dev\\test.txt";
        let result = validate_response(response, 0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("HALLUCINATION BLOCKED"));
    }
}
