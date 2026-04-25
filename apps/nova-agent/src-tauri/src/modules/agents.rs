use crate::modules::prompts;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub system_prompt_template: String,
    pub capabilities: Vec<String>,
    pub model_config: Option<ModelConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub temperature: f32,
    pub max_tokens: i32,
}

pub struct AgentRegistry {
    agents: HashMap<String, AgentProfile>,
}

impl AgentRegistry {
    pub fn new() -> Self {
        let mut agents = HashMap::new();

        // 1. Nova (Default Generalist)
        agents.insert(
            "nova".to_string(),
            AgentProfile {
                id: "nova".to_string(),
                name: "NOVA".to_string(),
                description: "Neural Omnipresent Virtual Assistant - General purpose AI"
                    .to_string(),
                system_prompt_template: prompts::require_system_prompt("nova-core-v1"),
                capabilities: vec![
                    "general".to_string(),
                    "memory".to_string(),
                    "desktop_control".to_string(),
                ],
                model_config: None, // Use defaults
            },
        );

        // 2. Architect (High-level Planner)
        agents.insert(
            "architect".to_string(),
            AgentProfile {
                id: "architect".to_string(),
                name: "System Architect".to_string(),
                description: "Expert in system design, patterns, and high-level structure."
                    .to_string(),
                system_prompt_template: prompts::require_system_prompt("nova-architect-v1"),
                capabilities: vec!["planning".to_string(), "design".to_string()],
                model_config: Some(ModelConfig {
                    temperature: 0.7, // Higher creativity for design
                    max_tokens: 4096,
                }),
            },
        );

        // 3. Coder (Implementation Specialist)
        agents.insert("coder".to_string(), AgentProfile {
            id: "coder".to_string(),
            name: "Code Specialist".to_string(),
            description: "Expert software engineer focused on correctness, efficiency, and best practices.".to_string(),
            system_prompt_template: prompts::require_system_prompt("nova-engineer-v1"),
            capabilities: vec!["coding".to_string(), "debugging".to_string(), "refactoring".to_string()],
            model_config: Some(ModelConfig {
                temperature: 0.2, // Low partiality for precision
                max_tokens: 8192,
            }),
        });

        Self { agents }
    }

    pub fn get_agent(&self, id: &str) -> Option<&AgentProfile> {
        self.agents.get(id)
    }

    #[allow(dead_code)]
    pub fn list_agents(&self) -> Vec<&AgentProfile> {
        self.agents.values().collect()
    }
}

impl Default for AgentRegistry {
    fn default() -> Self {
        Self::new()
    }
}
