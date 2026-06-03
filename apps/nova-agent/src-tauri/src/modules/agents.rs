use crate::modules::prompts;
use crate::modules::rag;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::Mutex;

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

    #[allow(dead_code)]
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

// --- Semantic Routing & Worktree Scope ---

tokio::task_local! {
    pub static WORKTREE_PATH: std::path::PathBuf;
}

static AGENT_EMBEDDINGS: OnceLock<Mutex<HashMap<String, Vec<f32>>>> = OnceLock::new();

fn get_agent_embeddings() -> &'static Mutex<HashMap<String, Vec<f32>>> {
    AGENT_EMBEDDINGS.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() || v1.is_empty() {
        return 0.0;
    }
    let dot_product: f32 = v1.iter().zip(v2.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = v1.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = v2.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

pub async fn route_prompt(prompt: &str, api_key: &str) -> String {
    // 1. Get embedding for the prompt
    let prompt_vec = match rag::embed(prompt, api_key).await {
        Ok(vec) => vec,
        Err(e) => {
            tracing::warn!("Failed to embed prompt for routing: {}. Falling back to default 'nova'.", e);
            return "nova".to_string();
        }
    };

    // 2. Ensure agent embeddings are cached
    let cache_guard_mutex = get_agent_embeddings();
    let mut cache_guard = cache_guard_mutex.lock().await;
    
    let agent_descriptions = vec![
        ("nova", "Neural Omnipresent Virtual Assistant - General purpose AI helper, desktop control, memory search, general queries."),
        ("architect", "Expert in system design, planning, software architecture, databases, schemas, and high-level structure."),
        ("coder", "Expert software engineer focused on correctness, efficiency, refactoring, debugging, coding, and implementation."),
    ];

    for (id, desc) in &agent_descriptions {
        if !cache_guard.contains_key(*id) {
            match rag::embed(desc, api_key).await {
                Ok(vec) => {
                    cache_guard.insert(id.to_string(), vec);
                }
                Err(e) => {
                    tracing::warn!("Failed to embed agent '{}' description: {}", id, e);
                }
            }
        }
    }

    // 3. Compute cosine similarity for each cached agent
    let mut best_agent = "nova".to_string();
    let mut best_similarity = 0.0f32;
    let threshold = 0.40f32; // Cosine similarity threshold

    for (id, _) in &agent_descriptions {
        if let Some(agent_vec) = cache_guard.get(*id) {
            let sim = cosine_similarity(&prompt_vec, agent_vec);
            tracing::info!("Semantic Routing: Agent '{}' similarity = {}", id, sim);
            if sim > best_similarity {
                best_similarity = sim;
                best_agent = id.to_string();
            }
        }
    }

    tracing::info!("Semantic Routing selected: '{}' (similarity = {})", best_agent, best_similarity);
    
    if best_similarity >= threshold {
        best_agent
    } else {
        tracing::info!("Highest similarity {} below threshold {}. Falling back to 'nova'.", best_similarity, threshold);
        "nova".to_string()
    }
}

