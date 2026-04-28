#![allow(unused_imports)]
//! Guidance Engine for Nova Agent
//!
//! Analyzes context (tasks, git status, activity) to generate personalized guidance:
//! - NextSteps: Suggested actions based on current state
//! - DoingRight: Positive reinforcement for good practices
//! - AtRisk: Warnings about potential issues

mod engine;
mod rules;
mod types;
mod utils;

pub use engine::GuidanceEngine;
pub use rules::GuidanceRule;
pub use types::{
    GuidanceAction, GuidanceCategory, GuidanceInput, GuidanceItem, GuidancePriority,
    GuidanceResponse,
};
