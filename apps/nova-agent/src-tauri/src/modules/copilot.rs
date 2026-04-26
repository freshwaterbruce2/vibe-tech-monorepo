#![allow(unused_imports)]
/// Personal Codebase Copilot
///
/// Compatibility facade for the copilot commands used by `main.rs`.
pub(crate) mod commands;
mod database;
mod extractors;
mod indexer;
mod types;

pub use commands::{
    get_copilot_stats_command, get_suggestions, index_codebase_command, search_patterns,
    use_pattern,
};
pub use indexer::index_codebase;
pub use types::{CodePattern, CodeSuggestion, IndexStats};
