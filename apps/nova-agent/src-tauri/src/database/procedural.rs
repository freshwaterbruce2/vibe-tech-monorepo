use crate::database::connection::DatabaseService;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};

/// A procedural memory pattern: a normalized signature of a task or
/// tool-call sequence, with running success/frequency stats.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProceduralPattern {
    pub id: i64,
    pub pattern: String,
    pub context: String,
    pub frequency: u32,
    pub success_rate: f64,
    pub last_used: i64,
    pub metadata: Option<String>,
}

impl DatabaseService {
    /// Idempotent - safe to call on every startup.
    pub fn create_procedural_table(&self) -> rusqlite::Result<()> {
        self.learning_db.execute(
            "CREATE TABLE IF NOT EXISTS procedural_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT NOT NULL UNIQUE,
                context TEXT NOT NULL,
                frequency INTEGER NOT NULL DEFAULT 1,
                success_rate REAL NOT NULL DEFAULT 1.0,
                last_used INTEGER NOT NULL,
                metadata TEXT
            )",
            [],
        )?;
        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_procedural_frequency \
             ON procedural_memory (frequency DESC)",
            [],
        )?;
        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_procedural_last_used \
             ON procedural_memory (last_used)",
            [],
        )?;
        Ok(())
    }

    /// Record an outcome for a pattern. Inserts on first sight, otherwise
    /// updates the running success-rate average and increments frequency.
    ///
    /// success_rate uses an incremental mean:
    ///   new = old + (sample - old) / (frequency + 1)
    /// where sample is 1.0 on success, 0.0 on failure.
    pub fn record_procedural_outcome(
        &self,
        pattern: &str,
        context: &str,
        success: bool,
        metadata: Option<&str>,
    ) -> rusqlite::Result<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        let sample = if success { 1.0 } else { 0.0 };

        self.learning_db.execute(
            "INSERT INTO procedural_memory (pattern, context, frequency, success_rate, last_used, metadata)
             VALUES (?1, ?2, 1, ?3, ?4, ?5)
             ON CONFLICT(pattern) DO UPDATE SET
                success_rate = success_rate + ((?3 - success_rate) / (frequency + 1)),
                frequency = frequency + 1,
                last_used = ?4,
                metadata = COALESCE(?5, metadata),
                context = ?2",
            params![pattern, context, sample, now, metadata],
        )?;
        Ok(())
    }

    /// Recall the top-N most successful patterns whose pattern or context
    /// contains `query` (case-insensitive substring match). Ordered by a
    /// composite score that rewards both success-rate and frequency.
    ///
    /// Patterns with frequency=1 (one-shot wins or losses) are filtered out
    /// to avoid noise - recall only kicks in once a pattern has repeated.
    pub fn recall_procedural_similar(
        &self,
        query: &str,
        limit: u32,
    ) -> rusqlite::Result<Vec<ProceduralPattern>> {
        let needle = format!("%{}%", query.to_lowercase());
        let mut stmt = self.learning_db.prepare(
            "SELECT id, pattern, context, frequency, success_rate, last_used, metadata
             FROM procedural_memory
             WHERE frequency >= 2
               AND (LOWER(pattern) LIKE ?1 OR LOWER(context) LIKE ?1)
             ORDER BY (success_rate * MIN(frequency, 10) / 10.0) DESC,
                      frequency DESC
             LIMIT ?2",
        )?;

        let rows = stmt.query_map(params![needle, limit], |row| {
            Ok(ProceduralPattern {
                id: row.get(0)?,
                pattern: row.get(1)?,
                context: row.get(2)?,
                frequency: row.get::<_, i64>(3)? as u32,
                success_rate: row.get(4)?,
                last_used: row.get(5)?,
                metadata: row.get(6)?,
            })
        })?;

        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Look up a single pattern by exact key.
    #[allow(dead_code)]
    pub fn get_procedural_pattern(
        &self,
        pattern: &str,
    ) -> rusqlite::Result<Option<ProceduralPattern>> {
        self.learning_db
            .query_row(
                "SELECT id, pattern, context, frequency, success_rate, last_used, metadata
                 FROM procedural_memory WHERE pattern = ?1",
                params![pattern],
                |row| {
                    Ok(ProceduralPattern {
                        id: row.get(0)?,
                        pattern: row.get(1)?,
                        context: row.get(2)?,
                        frequency: row.get::<_, i64>(3)? as u32,
                        success_rate: row.get(4)?,
                        last_used: row.get(5)?,
                        metadata: row.get(6)?,
                    })
                },
            )
            .optional()
    }

    /// Delete patterns with frequency below threshold (decay).
    #[allow(dead_code)]
    pub fn prune_procedural(&self, frequency_threshold: u32) -> rusqlite::Result<u32> {
        let changed = self.learning_db.execute(
            "DELETE FROM procedural_memory WHERE frequency < ?1",
            params![frequency_threshold],
        )?;
        Ok(changed as u32)
    }

    /// Total pattern count (for diagnostics).
    #[allow(dead_code)]
    pub fn count_procedural(&self) -> rusqlite::Result<u32> {
        let n: i64 =
            self.learning_db
                .query_row("SELECT COUNT(*) FROM procedural_memory", [], |row| {
                    row.get(0)
                })?;
        Ok(n as u32)
    }
}

/// Normalize a free-form task description into a stable pattern signature.
///
/// Strategy: lowercase, strip absolute paths and quoted strings, collapse
/// numbers and IDs to placeholders, keep first 8 significant tokens.
/// Two semantically similar tasks should produce the same signature.
pub fn signature_for_task(title: &str, description: &str) -> String {
    let combined = format!("{} {}", title, description).to_lowercase();
    let mut tokens: Vec<String> = Vec::new();

    for raw in combined.split_whitespace() {
        let t = raw.trim_matches(|c: char| !c.is_alphanumeric());
        if t.is_empty() {
            continue;
        }
        // Drop absolute paths and quoted file names - they carry per-task noise.
        if t.contains('\\') || t.contains('/') {
            tokens.push("<path>".to_string());
            continue;
        }
        // Numbers and ID-like tokens become placeholders so similar patterns merge.
        if t.chars().all(|c| c.is_ascii_digit()) {
            tokens.push("<n>".to_string());
            continue;
        }
        if t.len() > 24 && t.chars().any(|c| c.is_ascii_digit()) {
            tokens.push("<id>".to_string());
            continue;
        }
        // Drop trivial stopwords so they don't dominate recall.
        if matches!(
            t,
            "the" | "a" | "an" | "to" | "of" | "in" | "on" | "for" | "and" | "or" | "is"
        ) {
            continue;
        }
        tokens.push(t.to_string());
        if tokens.len() >= 8 {
            break;
        }
    }

    if tokens.is_empty() {
        return "empty".to_string();
    }
    tokens.join("-")
}

/// Build a sequence signature from an ordered list of tool-call names.
/// Used when wiring procedural memory directly to the tool-call loop.
#[allow(dead_code)]
pub fn signature_for_tool_sequence(tool_names: &[&str]) -> String {
    if tool_names.is_empty() {
        return "empty".to_string();
    }
    tool_names.join("->")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_in_memory_service() -> DatabaseService {
        // For unit tests we need a DatabaseService backed by in-memory SQLite.
        // The production constructor enforces a D:\ path, so we hand-build one
        // using the same shape but in-memory connections. This depends on
        // DatabaseService's fields being pub(crate), which they are.
        use rusqlite::Connection;
        DatabaseService {
            tasks_db: Connection::open_in_memory().unwrap(),
            learning_db: Connection::open_in_memory().unwrap(),
            activity_db: Connection::open_in_memory().unwrap(),
            retry_config: crate::database::types::RetryConfig::default(),
        }
    }

    #[test]
    fn signature_collapses_paths_and_numbers() {
        let a = signature_for_task("Refactor auth", "Update auth flow in C:\\dev\\apps\\foo");
        let b = signature_for_task("Refactor auth", "Update auth flow in C:\\dev\\apps\\bar");
        assert_eq!(a, b, "paths should normalize to <path>");

        let c = signature_for_task("Bug fix #1234", "Fix retry on attempt 5");
        let d = signature_for_task("Bug fix #5678", "Fix retry on attempt 9");
        assert_eq!(c, d, "numbers should collapse to <n>");
    }

    #[test]
    fn signature_for_empty_input_is_stable() {
        assert_eq!(signature_for_task("", ""), "empty");
        assert_eq!(signature_for_tool_sequence(&[]), "empty");
    }

    #[test]
    fn record_then_recall_returns_pattern_after_two_uses() {
        let svc = make_in_memory_service();
        svc.create_procedural_table().unwrap();

        // First sighting: should be ignored by recall (frequency=1 filter).
        svc.record_procedural_outcome("p1", "ctx-foo", true, None)
            .unwrap();
        let first = svc.recall_procedural_similar("foo", 5).unwrap();
        assert!(
            first.is_empty(),
            "single-use patterns should not be recalled"
        );

        // Second sighting: now eligible.
        svc.record_procedural_outcome("p1", "ctx-foo", true, None)
            .unwrap();
        let second = svc.recall_procedural_similar("foo", 5).unwrap();
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].frequency, 2);
        assert!((second[0].success_rate - 1.0).abs() < 1e-6);
    }

    #[test]
    fn success_rate_averages_incrementally() {
        let svc = make_in_memory_service();
        svc.create_procedural_table().unwrap();

        // Two successes, then one failure: expected rate = approximately 0.6667.
        svc.record_procedural_outcome("p1", "c", true, None)
            .unwrap();
        svc.record_procedural_outcome("p1", "c", true, None)
            .unwrap();
        svc.record_procedural_outcome("p1", "c", false, None)
            .unwrap();

        let pat = svc.get_procedural_pattern("p1").unwrap().unwrap();
        assert_eq!(pat.frequency, 3);
        assert!(
            (pat.success_rate - 2.0 / 3.0).abs() < 1e-6,
            "expected ~0.6667, got {}",
            pat.success_rate
        );
    }

    #[test]
    fn recall_ranks_by_success_then_frequency() {
        let svc = make_in_memory_service();
        svc.create_procedural_table().unwrap();

        // p_high: 100% success, 3 uses
        svc.record_procedural_outcome("p_high", "ctx-tag", true, None)
            .unwrap();
        svc.record_procedural_outcome("p_high", "ctx-tag", true, None)
            .unwrap();
        svc.record_procedural_outcome("p_high", "ctx-tag", true, None)
            .unwrap();

        // p_low: 50% success, 4 uses
        svc.record_procedural_outcome("p_low", "ctx-tag", true, None)
            .unwrap();
        svc.record_procedural_outcome("p_low", "ctx-tag", false, None)
            .unwrap();
        svc.record_procedural_outcome("p_low", "ctx-tag", true, None)
            .unwrap();
        svc.record_procedural_outcome("p_low", "ctx-tag", false, None)
            .unwrap();

        let results = svc.recall_procedural_similar("ctx-tag", 5).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(
            results[0].pattern, "p_high",
            "high-success pattern should rank first"
        );
    }

    #[test]
    fn recall_filters_by_substring_in_pattern_or_context() {
        let svc = make_in_memory_service();
        svc.create_procedural_table().unwrap();

        svc.record_procedural_outcome("refactor-x", "auth", true, None)
            .unwrap();
        svc.record_procedural_outcome("refactor-x", "auth", true, None)
            .unwrap();
        svc.record_procedural_outcome("build-y", "ci", true, None)
            .unwrap();
        svc.record_procedural_outcome("build-y", "ci", true, None)
            .unwrap();

        let auth = svc.recall_procedural_similar("auth", 5).unwrap();
        assert_eq!(auth.len(), 1);
        assert_eq!(auth[0].pattern, "refactor-x");

        let by_pattern = svc.recall_procedural_similar("build", 5).unwrap();
        assert_eq!(by_pattern.len(), 1);
        assert_eq!(by_pattern[0].pattern, "build-y");
    }

    #[test]
    fn metadata_is_preserved_and_overwritten() {
        let svc = make_in_memory_service();
        svc.create_procedural_table().unwrap();

        svc.record_procedural_outcome("p", "c", true, Some("first"))
            .unwrap();
        svc.record_procedural_outcome("p", "c", true, Some("second"))
            .unwrap();
        let pat = svc.get_procedural_pattern("p").unwrap().unwrap();
        assert_eq!(pat.metadata.as_deref(), Some("second"));

        // Passing None preserves the previous metadata via COALESCE.
        svc.record_procedural_outcome("p", "c", true, None).unwrap();
        let pat = svc.get_procedural_pattern("p").unwrap().unwrap();
        assert_eq!(pat.metadata.as_deref(), Some("second"));
    }

    #[test]
    fn prune_removes_low_frequency() {
        let svc = make_in_memory_service();
        svc.create_procedural_table().unwrap();

        svc.record_procedural_outcome("p_one", "c", true, None)
            .unwrap();
        svc.record_procedural_outcome("p_two", "c", true, None)
            .unwrap();
        svc.record_procedural_outcome("p_two", "c", true, None)
            .unwrap();

        let removed = svc.prune_procedural(2).unwrap();
        assert_eq!(removed, 1);
        assert_eq!(svc.count_procedural().unwrap(), 1);
    }
}
