//! Guidance Engine for Nova Agent
//!
//! Analyzes context (tasks, git status, activity) to generate personalized guidance.

use crate::guidance_types::{
    GuidanceCategory, GuidanceInput, GuidanceResponse, GuidanceRule,
};
use crate::guidance_rules_core::{
    ActivityPatternRule, CommitHygieneRule, DeepWorkRule, GitStatusRule, TaskProgressRule,
};
use crate::guidance_rules_enhanced::{
    DependencyRule, PerformanceRule, PredictiveRule, SecurityRule,
};
use tracing::{debug, info};

pub struct GuidanceEngine {
    rules: Vec<Box<dyn GuidanceRule + Send + Sync>>,
}

impl GuidanceEngine {
    pub fn new() -> Self {
        let mut engine = Self { rules: Vec::new() };

        // Core rules
        engine.register_rule(Box::new(GitStatusRule));
        engine.register_rule(Box::new(TaskProgressRule));
        engine.register_rule(Box::new(DeepWorkRule));
        engine.register_rule(Box::new(CommitHygieneRule));
        engine.register_rule(Box::new(ActivityPatternRule));

        // Enhanced rules (Phase 1 - 2026-01-16)
        engine.register_rule(Box::new(PerformanceRule));
        engine.register_rule(Box::new(SecurityRule));
        engine.register_rule(Box::new(DependencyRule));
        engine.register_rule(Box::new(PredictiveRule));

        info!("GuidanceEngine initialized with {} rules", engine.rules.len());
        engine
    }

    pub fn register_rule(&mut self, rule: Box<dyn GuidanceRule + Send + Sync>) {
        self.rules.push(rule);
    }

    pub fn generate(&self, input: &GuidanceInput) -> GuidanceResponse {
        debug!("Generating guidance from {} rules", self.rules.len());

        let mut next_steps = Vec::new();
        let mut doing_right = Vec::new();
        let mut at_risk = Vec::new();

        for rule in &self.rules {
            let items = rule.evaluate(input);
            for item in items {
                match item.category {
                    GuidanceCategory::NextSteps => next_steps.push(item),
                    GuidanceCategory::DoingRight => doing_right.push(item),
                    GuidanceCategory::AtRisk => at_risk.push(item),
                }
            }
        }

        next_steps.sort_by(|a, b| b.priority.cmp(&a.priority));
        at_risk.sort_by(|a, b| b.priority.cmp(&a.priority));

        let context_summary = self.summarize_context(input);
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        GuidanceResponse {
            next_steps,
            doing_right,
            at_risk,
            generated_at: now,
            context_summary,
        }
    }

    fn summarize_context(&self, input: &GuidanceInput) -> String {
        let mut parts = Vec::new();

        if let Some(project) = &input.context.current_project {
            parts.push(format!("Project: {} ({})", project.name, project.project_type));
        }

        if let Some(git) = &input.context.git_status {
            parts.push(format!("Branch: {}", git.branch));
            if !git.modified_files.is_empty() {
                parts.push(format!("{} modified files", git.modified_files.len()));
            }
        }

        let in_progress = input.tasks.iter().filter(|t| t.status == "in_progress").count();
        if in_progress > 0 {
            parts.push(format!("{} tasks in progress", in_progress));
        }

        parts.push(format!("{} min deep work", input.context.deep_work_minutes));
        parts.join(" | ")
    }
}

impl Default for GuidanceEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_guidance_engine_creation() {
        let engine = GuidanceEngine::new();
        assert!(!engine.rules.is_empty());
        assert_eq!(engine.rules.len(), 9); // 5 core + 4 enhanced
    }
}
