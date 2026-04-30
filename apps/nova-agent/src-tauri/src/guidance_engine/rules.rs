mod basic;
mod enhanced;

use super::types::{GuidanceInput, GuidanceItem};

/// Trait for guidance rules
pub trait GuidanceRule {
    #[allow(dead_code)]
    fn name(&self) -> &str;
    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem>;
}

pub(super) fn built_in_rules() -> Vec<Box<dyn GuidanceRule + Send + Sync>> {
    vec![
        Box::new(basic::GitStatusRule),
        Box::new(basic::TaskProgressRule),
        Box::new(basic::DeepWorkRule),
        Box::new(basic::CommitHygieneRule),
        Box::new(basic::ActivityPatternRule),
        Box::new(enhanced::PerformanceRule),
        Box::new(enhanced::SecurityRule),
        Box::new(enhanced::DependencyRule),
        Box::new(enhanced::PredictiveRule),
    ]
}
