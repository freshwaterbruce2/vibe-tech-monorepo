# OpenRouter Model Selection Guide - 2026

**Last Updated:** January 7, 2026
**Purpose:** Help you choose the best AI model for your specific use case

---

## Quick Decision Tree

```
Need AI for...
├─ Coding/Development
│  ├─ Best Quality → Claude Opus 4.5 ($$$)
│  ├─ Balanced → Claude Sonnet 4.5 ($$)
│  └─ Free → Devstral 2 (FREE ⭐)
│
├─ Math/Logic/Reasoning
│  ├─ Best Quality → GPT-5.2 ($$$)
│  ├─ Balanced → DeepSeek V3.2 ($$)
│  └─ Free → DeepSeek R1 (FREE ⭐)
│
├─ Vision/Multimodal
│  ├─ Best Quality → Gemini 3 Pro ($$$)
│  ├─ Fast → Gemini Flash 2.0 ($)
│  └─ Free → Nemotron Nano 2 VL (FREE)
│
└─ General Chat/Writing
   ├─ Best Overall → GPT-5.2 or Claude Opus 4.5 ($$$)
   ├─ Balanced → Claude Sonnet 4.5 ($$)
   └─ Free → MiMo-V2-Flash (FREE ⭐)
```

---

## Model Comparison Matrix (January 2026)

### Top Tier Models

| Model | Release | Best For | Benchmarks | Cost/1M Tokens | Notes |
|-------|---------|----------|------------|----------------|-------|
| **Claude Opus 4.5** | Nov 2025 | Coding, Safety | 80.9% SWE-bench<br>4.7% injection | $15-30 | Industry-leading security |
| **GPT-5.2** | Dec 2025 | Math, Logic | 100% AIME 2025<br>52.9% ARC-AGI | $20-40 | Best reasoning model |
| **Gemini 3 Pro** | Nov 2025 | Multimodal | 1M token context | $10-25 | Overall benchmark leader |

### Medium Tier Models

| Model | Best For | Cost/1M Tokens | Notes |
|-------|----------|----------------|-------|
| **Claude Sonnet 4.5** | General coding | $3-15 | Best balanced option |
| **Gemini Flash 2.0** | Fast responses | $0.50-2 (often FREE) | Fastest time-to-first-token |
| **Llama 4 Maverick** | Open source | FREE-$1 | Customizable |
| **DeepSeek V3.2** | Reasoning | $2-8 | Advanced reasoning |

### Free Tier Models (Zero Cost!)

| Model | Parameters | Best For | Performance | Notes |
|-------|-----------|----------|-------------|-------|
| **MiMo-V2-Flash** ⭐ | 309B | General tasks | #1 on SWE-bench (open) | Comparable to Sonnet 4.5 |
| **DeepSeek R1** ⭐ | - | Reasoning, coding | Competitive with paid | Excellent value |
| **Devstral 2** ⭐ | 123B | Agentic coding | State-of-the-art coding | Specialist model |
| **Gemini Flash 2.0** | - | Fast responses | High quality | May rate-limit |
| **Llama 3.3 70B** | 70B | Multilingual | Strong dialogue | Meta open source |
| **Nemotron Nano 2 VL** | 12B | Vision + video | Good multimodal | NVIDIA model |

---

## Detailed Use Case Recommendations

### 1. Software Development & Coding

#### Production Code Generation

```typescript
// Best: Claude Opus 4.5 (80.9% SWE-bench)
model: 'anthropic/claude-opus-4.5'
// Why: Industry-leading code quality, best debugging

// Budget: Devstral 2 (FREE)
model: 'mistralai/devstral-2:free'
// Why: State-of-the-art coding, 123B params, agentic workflows
```

#### Code Review & Analysis

```typescript
// Best: Claude Sonnet 4.5
model: 'anthropic/claude-sonnet-4.5'
// Why: Balanced speed/quality for iterative review

// Budget: MiMo-V2-Flash (FREE)
model: 'mimo/mimo-v2-flash:free'
// Why: 309B params, excellent code understanding
```

#### Quick Code Completion

```typescript
// Best: Gemini Flash 2.0
model: 'google/gemini-flash-2.0'
// Why: Fastest time-to-first-token, often free
```

---

### 2. Mathematical & Logical Reasoning

#### Complex Math Problems

```typescript
// Best: GPT-5.2 (100% AIME 2025)
model: 'openai/gpt-5.2'
// Why: Unmatched mathematical reasoning

// Budget: DeepSeek R1 (FREE)
model: 'deepseek/deepseek-r1'
// Why: Strong reasoning, competitive with paid models
```

#### Logic Puzzles & Abstract Reasoning

```typescript
// Best: GPT-5.2 (52.9% ARC-AGI-2)
model: 'openai/gpt-5.2'
// Why: Leading abstract problem-solving

// Budget: DeepSeek V3.2
model: 'deepseek/deepseek-v3.2'
// Why: Advanced reasoning at lower cost
```

---

### 3. Multimodal Tasks (Vision + Text)

#### Image Understanding & Analysis

```typescript
// Best: Gemini 3 Pro
model: 'google/gemini-3-pro'
// Why: Overall benchmark leader, 1M token context

// Budget: Gemini Flash 2.0 (often FREE)
model: 'google/gemini-flash-2.0:free'
// Why: Fast, high quality, usually free tier
```

#### Video & Document Understanding

```typescript
// Best: Gemini 3 Pro
model: 'google/gemini-3-pro'
// Why: Best for complex multimodal tasks

// Budget: Nemotron Nano 2 VL (FREE)
model: 'nvidia/nemotron-nano-2-vl:free'
// Why: 12B params, designed for video/docs
```

---

### 4. General Chat & Writing

#### Creative Writing

```typescript
// Best: GPT-5.2
model: 'openai/gpt-5.2'
// Why: Most creative, best narrative flow

// Budget: Claude Sonnet 4.5
model: 'anthropic/claude-sonnet-4.5'
// Why: Strong writing, better value
```

#### Customer Support Chatbots

```typescript
// Best: Claude Sonnet 4.5
model: 'anthropic/claude-sonnet-4.5'
// Why: Safe, helpful, good personality

// Budget: MiMo-V2-Flash (FREE)
model: 'mimo/mimo-v2-flash:free'
// Why: 309B params, conversational, zero cost
```

#### Long-Context Processing (>100k tokens)

```typescript
// Best: Gemini 3 Pro (1M token context!)
model: 'google/gemini-3-pro'
// Why: Handles entire codebases, long documents

// Budget: Claude Sonnet 4.5 (200k context)
model: 'anthropic/claude-sonnet-4.5'
// Why: Good long-context at lower cost
```

---

## Cost Optimization Strategies

### Strategy 1: Free Tier First, Paid When Needed

```typescript
// Start with free models for development
const devModel = 'mimo/mimo-v2-flash:free';

// Upgrade to paid for production
const prodModel = 'anthropic/claude-opus-4.5';

// Use environment variable
const model = process.env.NODE_ENV === 'production'
  ? prodModel
  : devModel;
```

### Strategy 2: Auto Router for Best Value

```typescript
// Let OpenRouter choose the best model
model: 'openrouter/auto'

// OpenRouter analyzes your prompt and selects:
// - Free models when possible
// - Paid models when quality matters
// - Best model for specific task type
```

### Strategy 3: Task-Specific Model Selection

```typescript
function selectModel(taskType: string) {
  switch (taskType) {
    case 'code':
      return 'mistralai/devstral-2:free'; // FREE coding
    case 'math':
      return 'deepseek/deepseek-r1'; // FREE reasoning
    case 'vision':
      return 'google/gemini-flash-2.0:free'; // FREE vision
    case 'production':
      return 'anthropic/claude-opus-4.5'; // Best quality
    default:
      return 'mimo/mimo-v2-flash:free'; // FREE general
  }
}
```

---

## Performance Benchmarks (January 2026)

### Coding Performance (SWE-bench)

1. **Claude Opus 4.5:** 80.9% ⭐ BEST
2. **Claude Sonnet 4.5:** ~75%
3. **MiMo-V2-Flash (FREE):** ~70% (best open-source)
4. **Devstral 2 (FREE):** ~68%
5. **GPT-5.2:** ~65%

### Mathematical Reasoning (AIME 2025)

1. **GPT-5.2:** 100% ⭐ BEST
2. **Claude Opus 4.5:** ~95%
3. **DeepSeek R1 (FREE):** ~90%
4. **Gemini 3 Pro:** ~88%

### Security (Prompt Injection Resistance)

1. **Claude Opus 4.5:** 4.7% ⭐ BEST
2. **Claude Sonnet 4.5:** ~8%
3. **Gemini 3 Pro:** 12.5%
4. **GPT-5.2:** 21.9%

---

## Free Tier Comparison (Best Value Models)

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **MiMo-V2-Flash** | 309B params, #1 open SWE-bench | Rate limits | General tasks, coding |
| **DeepSeek R1** | Strong reasoning, coding | Less creative writing | Logic, math, coding |
| **Devstral 2** | 123B params, agentic | Narrow use case | Coding workflows |
| **Gemini Flash 2.0** | Fast, multimodal | Peak hour limits | Quick responses |
| **Llama 3.3 70B** | Multilingual, open | Older model | Dialogue, languages |

---

## Real-World Usage Examples

### Example 1: vibe-justice (Legal AI)

```typescript
// Use case: Legal document analysis
// Volume: 100-500 requests/day
// Budget: $50/month max

// Strategy: Free for research, paid for client work
const model = isClientWork
  ? 'anthropic/claude-opus-4.5'    // Best quality for clients
  : 'deepseek/deepseek-r1';        // FREE for internal research

// Result: ~$30/month spend, 70% free tier
```

### Example 2: nova-agent (Code Assistant)

```typescript
// Use case: Code generation and debugging
// Volume: 1000+ requests/day
// Budget: $100/month max

// Strategy: Free coding model, paid for complex tasks
function selectModelForTask(complexity: number) {
  if (complexity > 0.8) {
    return 'anthropic/claude-opus-4.5';  // Complex refactoring
  } else if (complexity > 0.5) {
    return 'anthropic/claude-sonnet-4.5'; // Medium tasks
  } else {
    return 'mistralai/devstral-2:free';   // Simple tasks (FREE)
  }
}

// Result: ~$60/month spend, 80% free tier
```

### Example 3: vibe-tutor (Educational PWA)

```typescript
// Use case: Homework help, explanations
// Volume: 50-200 requests/day
// Budget: Minimize costs

// Strategy: 100% free tier
const model = 'mimo/mimo-v2-flash:free';  // Best free general model

// Fallback for rate limits
const fallbackModel = 'deepseek/deepseek-r1';  // Also free

// Result: $0/month spend, 100% free tier ⭐
```

---

## Rate Limits & Availability

### Free Tier Limitations

**All Free Models:**

- 50 requests/day maximum (OpenRouter limit)
- 20 requests/minute peak
- Failed requests count toward quota
- May face rate limiting during peak hours (9 AM - 5 PM PST)

**Best Practices:**

```typescript
// Implement retry logic for free models
async function callWithRetry(model: string, prompt: string) {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.chat({ model, messages: [{ role: 'user', content: prompt }] });
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - wait and retry
        await sleep(2000 * (i + 1));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Security Considerations

### For Sensitive Data (PII, Medical, Financial)

**DO NOT USE FREE MODELS:**

- Free models log prompts/outputs for training
- Privacy not guaranteed

**Use Paid Models:**

```typescript
// Sensitive data → paid models only
const SECURE_MODELS = [
  'anthropic/claude-opus-4.5',    // Best security (4.7% injection)
  'anthropic/claude-sonnet-4.5',  // Good security (~8% injection)
];

if (containsPII(data)) {
  model = SECURE_MODELS[0];  // Use Claude for PII
}
```

---

## Migration Path: Old Models → 2026 Models

| Old Model (2024-2025) | New Model (2026) | Why Upgrade |
|----------------------|------------------|-------------|
| `claude-3.5-sonnet` | `claude-sonnet-4.5` | Better performance, lower cost |
| `claude-3-opus` | `claude-opus-4.5` | 2x faster, better security |
| `gpt-4-turbo` | `gpt-5.2` | 100% AIME, better reasoning |
| `gemini-pro` | `gemini-3-pro` | 1M context, better multimodal |
| `llama-3-70b` | `llama-3.3-70b` or `llama-4-maverick` | Better dialogue, multilingual |

---

## Sources & Further Reading

- [OpenRouter Models](https://openrouter.ai/models) - Full model list
- [OpenRouter Pricing](https://openrouter.ai/pricing) - Current pricing
- [State of AI Report](https://openrouter.ai/state-of-ai) - Usage trends
- [ChatGPT vs Claude vs Gemini 2026](https://wezom.com/blog/chatgpt-vs-claude-vs-gemini-best-ai-model-in-2026) - Model comparison
- [January 2026 Top AI Models](https://www.thepromptbuddy.com/prompts/january-2026-s-top-ai-models-the-most-powerful-systems-compared) - Latest benchmarks
- [Free AI Models on OpenRouter](https://openrouter.ai/collections/free-models) - Free tier options

---

## Recommended Default Configuration

```typescript
// config/ai-models.ts

export const AI_MODELS = {
  // Production (best quality)
  PRODUCTION: {
    coding: 'anthropic/claude-opus-4.5',
    reasoning: 'openai/gpt-5.2',
    multimodal: 'google/gemini-3-pro',
    general: 'anthropic/claude-sonnet-4.5',
  },

  // Development (free tier)
  DEVELOPMENT: {
    coding: 'mistralai/devstral-2:free',
    reasoning: 'deepseek/deepseek-r1',
    multimodal: 'google/gemini-flash-2.0:free',
    general: 'mimo/mimo-v2-flash:free',
  },

  // Balanced (cost-effective)
  BALANCED: {
    coding: 'anthropic/claude-sonnet-4.5',
    reasoning: 'deepseek/deepseek-v3.2',
    multimodal: 'google/gemini-flash-2.0',
    general: 'anthropic/claude-sonnet-4.5',
  },
};

// Auto-select based on environment
export const getDefaultModel = (taskType: string) => {
  const tier = process.env.AI_TIER || 'DEVELOPMENT';
  return AI_MODELS[tier][taskType];
};
```

---

**Last Updated:** January 7, 2026
**Model Benchmarks:** January 2026 data
**Next Update:** Quarterly (April 2026)

---

*Guide maintained by VibeTech Development Team*
*OpenRouter Integration v1.0.0*
