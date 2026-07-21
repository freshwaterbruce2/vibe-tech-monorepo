pub mod activity;
mod checkpoint_cleanup;
mod checkpoint_digest;
mod checkpoint_evidence;
mod checkpoint_reconciliation;
mod checkpoint_storage;
mod checkpoint_transition;
mod checkpoint_types;
pub mod checkpoints;
pub mod connection;
pub mod errors;
pub mod learning;
pub mod memory;
pub mod procedural;
pub mod seed;
pub mod tasks;
pub mod types;

pub use checkpoints::{CheckpointClassification, ResumeCandidate, TaskCheckpoint};
pub use connection::DatabaseService;
pub use types::{Activity, FocusState, LearningEvent, Task};

#[cfg(test)]
mod checkpoint_cleanup_tests;
#[cfg(test)]
mod checkpoint_closure_tests;
#[cfg(test)]
mod checkpoint_transition_tests;
#[cfg(test)]
mod checkpoints_tests;
#[cfg(test)]
mod tests;
