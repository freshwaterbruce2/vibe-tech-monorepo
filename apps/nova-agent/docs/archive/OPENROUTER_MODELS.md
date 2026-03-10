// OPENROUTER MODEL CONFIGURATION
// Updated: January 4, 2026
// Verified model IDs from <https://openrouter.ai/collections/free-models>

use crate::modules::state::Config;

/// OpenRouter model cascade configuration
/// Tries free models first, falls back to paid only if all free models fail
pub struct OpenRouterConfig {
    pub api_key: String,
    pub base_url: String,
    pub free_models: Vec<ModelConfig>,
    pub paid_models: Vec<ModelConfig>,
}

pub struct ModelConfig {
    pub name: &'static str,
    pub model_id: &'static str,
    pub supports_tools: bool,
    pub context_window: usize,
    pub description: &'static str,
}

impl OpenRouterConfig {
    pub fn from_env(config: &Config) -> Self {
        Self {
            api_key: config.openrouter_api_key.clone(),
            base_url: config.openrouter_base_url.clone(),
            free_models: get_free_models(),
            paid_models: get_paid_models(),
        }
    }
}

/// Free models - try these first (zero cost)
fn get_free_models() -> Vec<ModelConfig> {
    vec![
        // Tier 1: Best free agentic models
        ModelConfig {
            name: "MiMo-V2-Flash",
            model_id: "xiaomi/mimo-v2-flash:free",
            supports_tools: true,
            context_window: 256_000,
            description: "#1 on SWE-bench, rivals Claude Sonnet 4.5, best free model"
        },
        ModelConfig {
            name: "Devstral-2",
            model_id: "mistralai/devstral-2512:free",
            supports_tools: true,
            context_window: 256_000,
            description: "Agentic coding specialist by Mistral AI"
        },
        ModelConfig {
            name: "KAT-Coder-Pro",
            model_id: "kwaipilot/kat-coder-pro:free",
            supports_tools: true,
            context_window: 256_000,
            description: "73.4% SWE-bench solve rate, agentic coding"
        },
        
        // Tier 2: Free reasoning models
        ModelConfig {
            name: "DeepSeek-R1T2-Chimera",
            model_id: "tngtech/deepseek-r1t2-chimera:free",
            supports_tools: false,
            context_window: 164_000,
            description: "Fast reasoning, 20% faster than R1"
        },
        ModelConfig {
            name: "DeepSeek-R1-0528",
            model_id: "deepseek/deepseek-r1-0528:free",
            supports_tools: false,
            context_window: 164_000,
            description: "Full reasoning model, rivals OpenAI o1"
        },
        ModelConfig {
            name: "DeepSeek-V3.1-Nex-N1",
            model_id: "nex-agi/deepseek-v3.1-nex-n1:free",
            supports_tools: true,
            context_window: 131_000,
            description: "Agent autonomy and tool use focus"
        },
        
        // Tier 3: Free general purpose
        ModelConfig {
            name: "GPT-OSS-120B",
            model_id: "openai/gpt-oss-120b:free",
            supports_tools: true,
            context_window: 131_000,
            description: "OpenAI open-weight MoE model"
        },
        ModelConfig {
            name: "Llama-3.3-70B",
            model_id: "meta-llama/llama-3.3-70b-instruct:free",
            supports_tools: true,
            context_window: 131_000,
            description: "Meta's latest multilingual model"
        },
        ModelConfig {
            name: "Gemma-3-27B",
            model_id: "google/gemma-3-27b-it:free",
            supports_tools: true,
            context_window: 131_000,
            description: "Google multimodal, 140 languages"
        },
    ]
}

/// Paid models - use only if free models exhausted or for critical tasks
fn get_paid_models() -> Vec<ModelConfig> {
    vec![
        // Premium tier - best performance
        ModelConfig {
            name: "Claude-Sonnet-4.5",
            model_id: "anthropic/claude-sonnet-4.5",
            supports_tools: true,
            context_window: 200_000,
            description: "Best overall for coding/reasoning ($3/$15 per 1M)"
        },
        ModelConfig {
            name: "GPT-5",
            model_id: "openai/gpt-5",
            supports_tools: true,
            context_window: 128_000,
            description: "Latest GPT flagship ($5/$15 per 1M)"
        },
        
        // Value tier - good performance, low cost
        ModelConfig {
            name: "DeepSeek-V3.2-Speciale",
            model_id: "deepseek/deepseek-v3.2-speciale",
            supports_tools: true,
            context_window: 131_000,
            description: "Beats GPT-5 on reasoning, ultra cheap ($0.27/$0.41 per 1M)"
        },
        ModelConfig {
            name: "Claude-Haiku-4.5",
            model_id: "anthropic/claude-haiku-4.5",
            supports_tools: true,
            context_window: 200_000,
            description: "Fast and cheap ($0.25/$1.25 per 1M)"
        },
        ModelConfig {
            name: "Gemini-2.5-Flash",
            model_id: "google/gemini-2.5-flash",
            supports_tools: true,
            context_window: 1_000_000,
            description: "Very cheap, massive context ($0.075/$0.30 per 1M)"
        },
    ]
}

/// Get recommended model for specific use case
pub fn get_recommended_model(use_case: UseCase) -> &'static str {
    match use_case {
        UseCase::AgenticCoding => "xiaomi/mimo-v2-flash:free",
        UseCase::Reasoning => "deepseek/deepseek-r1-0528:free",
        UseCase::ToolUse => "nex-agi/deepseek-v3.1-nex-n1:free",
        UseCase::FastResponse => "meta-llama/llama-3.3-70b-instruct:free",
        UseCase::LongContext => "google/gemma-3-27b-it:free",
        UseCase::Premium => "anthropic/claude-sonnet-4.5",
        UseCase::CostEffective => "deepseek/deepseek-v3.2-speciale",
    }
}

pub enum UseCase {
    AgenticCoding,
    Reasoning,
    ToolUse,
    FastResponse,
    LongContext,
    Premium,
    CostEffective,
}
