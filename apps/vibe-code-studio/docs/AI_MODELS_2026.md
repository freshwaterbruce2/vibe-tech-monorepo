# AI Model Mappings - January 3, 2026

**Last Updated:** January 3, 2026  
**File:** `src/services/ai/providers/OpenRouterService.ts`

---

## Overview

Vibe Code Studio now supports the latest state-of-the-art AI models from all major providers as of January 2026. The landscape has shifted significantly with:

- **GPT-5 Series** superseding GPT-4o
- **Claude 4.5** (Opus & Sonnet) releases
- **Gemini 3** Flash Preview (fastest model available)
- **DeepSeek V3.2 & R1** dominating open-weights sector
- **Grok 4** and specialized code variants

---

## Supported Providers & Models

### 1. OpenAI (GPT-5 Era)

The GPT-4o era has been superseded. GPT-5 series is now the flagship.

| User Input | OpenRouter ID | Use Case |
|------------|---------------|----------|
| `gpt-5.2-pro` | `openai/gpt-5.2-pro` | **Best for complex reasoning/agentic tasks** |
| `gpt-5.2` | `openai/gpt-5.2` | Standard flagship (balanced) |
| `gpt-5.1-codex` | `openai/gpt-5.1-codex-max` | **Best for coding** (massive context) |
| `gpt-5-mini` | `openai/gpt-5-mini` | Fast/cheap (replaces gpt-4o-mini) |
| `gpt-4o` | `openai/gpt-4o` | Legacy stable model |

**Common Aliases:**

- `gpt-5` → `gpt-5.2` (flagship)
- `gpt-5-codex` → `gpt-5.1-codex-max`

**Recommended for:**

- **Reasoning tasks:** `gpt-5.2-pro`
- **Coding:** `gpt-5.1-codex-max`
- **General use:** `gpt-5.2`
- **Budget-conscious:** `gpt-5-mini`

---

### 2. Anthropic (Claude 4.5 Era)

Claude 4.5 series released. Opus 4.5 leads in creative writing, Sonnet 4.5 is the dev favorite.

| User Input | OpenRouter ID | Use Case |
|------------|---------------|----------|
| `claude-4.5-opus` | `anthropic/claude-opus-4.5` | **Maximum intelligence** (higher latency) |
| `claude-4.5-sonnet` | `anthropic/claude-sonnet-4.5` | **Daily driver for devs** (speed/cost) |
| `claude-3.5-sonnet` | `anthropic/claude-3.5-sonnet` | Legacy stability |

**Common Aliases:**

- `claude-opus` → `claude-opus-4.5`
- `claude-sonnet` → `claude-sonnet-4.5`

**Recommended for:**

- **Creative writing:** `claude-opus-4.5`
- **Software development:** `claude-sonnet-4.5`
- **Stable production:** `claude-3.5-sonnet`

---

### 3. Google (Gemini 2.5/3 Era)

Gemini 3 Flash is the **fastest model currently available**. Gemini 2.5 Pro is stable production model.

| User Input | OpenRouter ID | Use Case |
|------------|---------------|----------|
| `gemini-3-flash` | `google/gemini-3-flash-preview` | **Speed king** (fastest available) |
| `gemini-2.5-pro` | `google/gemini-2.5-pro` | Stable high-end reasoning |
| `gemini-2.5-flash` | `google/gemini-2.5-flash` | High-throughput |

**Common Aliases:**

- `gemini-flash` → `gemini-3-flash-preview`
- `gemini-pro` → `gemini-2.5-pro`

**Recommended for:**

- **Speed-critical tasks:** `gemini-3-flash`
- **Production reasoning:** `gemini-2.5-pro`
- **Batch processing:** `gemini-2.5-flash`

---

### 4. DeepSeek (Open Weights Leader)

DeepSeek dominates the open-weights sector. V3.2 is general purpose, R1 is for "thinking" tasks.

| User Input | OpenRouter ID | Use Case |
|------------|---------------|----------|
| `deepseek-v3.2` | `deepseek/deepseek-v3.2` | General purpose chat/code |
| `deepseek-r1` | `deepseek/deepseek-r1` | **Reasoning/CoT** (slow, high IQ) |

**Common Aliases:**

- `deepseek-chat` → `deepseek-v3.2`
- `deepseek-reasoner` → `deepseek-r1`

**Recommended for:**

- **General coding/chat:** `deepseek-v3.2`
- **Complex reasoning:** `deepseek-r1` (similar to OpenAI o1/o3)

---

### 5. xAI (Grok 4 Series)

Grok 4 is the frontier model. Specialized variants for coding and speed.

| User Input | OpenRouter ID | Use Case |
|------------|---------------|----------|
| `grok-4` | `x-ai/grok-4` | Latest flagship |
| `grok-4.1-fast` | `x-ai/grok-4.1-fast` | Low latency variant |
| `grok-code` | `x-ai/grok-code-fast-1` | **Optimized for code generation** |

**Common Aliases:**

- `grok-fast` → `grok-4.1-fast`

**Recommended for:**

- **General tasks:** `grok-4`
- **Speed-sensitive:** `grok-4.1-fast`
- **Code generation:** `grok-code-fast-1`

---

## Quick Reference - Best Model for Each Task

| Task | Recommended Model | Reasoning |
|------|-------------------|-----------|
| **Complex Reasoning** | `gpt-5.2-pro` | Best agentic performance |
| **Software Development** | `gpt-5.1-codex-max` or `claude-sonnet-4.5` | Massive context + code expertise |
| **Creative Writing** | `claude-opus-4.5` | Maximum nuance and intelligence |
| **Speed (Real-time)** | `gemini-3-flash` | Fastest model available |
| **Deep Reasoning** | `deepseek-r1` or `gpt-5.2-pro` | CoT thinking models |
| **Budget-Conscious** | `gpt-5-mini` | Best cheap/fast option |
| **Code Generation** | `grok-code-fast-1` or `gpt-5.1-codex-max` | Specialized for code |

---

## Usage Examples

### In Code

```typescript
import { OpenRouterService } from './services/ai/providers/OpenRouterService';

const ai = new OpenRouterService();

// Use latest GPT-5 Pro for reasoning
const response1 = await ai.chat(
  [{ role: 'user', content: 'Explain quantum computing' }],
  { model: 'gpt-5.2-pro' }
);

// Use Gemini Flash for speed
const response2 = await ai.chat(
  [{ role: 'user', content: 'Quick summary of this article' }],
  { model: 'gemini-3-flash' }
);

// Use Grok Code for coding tasks
const response3 = await ai.chat(
  [{ role: 'user', content: 'Write a React component' }],
  { model: 'grok-code' }
);
```

### Aliases Work Too

```typescript
// These all resolve correctly:
await ai.chat(messages, { model: 'gpt-5' });          // → gpt-5.2
await ai.chat(messages, { model: 'claude-opus' });   // → claude-opus-4.5
await ai.chat(messages, { model: 'gemini-pro' });    // → gemini-2.5-pro
await ai.chat(messages, { model: 'grok-fast' });     // → grok-4.1-fast
```

---

## Model Comparison Matrix

| Model | Speed | Intelligence | Cost | Best For |
|-------|-------|--------------|------|----------|
| GPT-5.2 Pro | ⚡⚡ | 🧠🧠🧠🧠🧠 | 💰💰💰 | Complex reasoning |
| GPT-5.1 Codex | ⚡⚡ | 🧠🧠🧠🧠 | 💰💰💰 | Coding (huge context) |
| Claude Opus 4.5 | ⚡⚡ | 🧠🧠🧠🧠🧠 | 💰💰💰 | Creative writing |
| Claude Sonnet 4.5 | ⚡⚡⚡⚡ | 🧠🧠🧠🧠 | 💰💰 | Dev daily driver |
| Gemini 3 Flash | ⚡⚡⚡⚡⚡ | 🧠🧠🧠 | 💰 | Speed king |
| Gemini 2.5 Pro | ⚡⚡⚡ | 🧠🧠🧠🧠 | 💰💰 | Production reasoning |
| DeepSeek V3.2 | ⚡⚡⚡ | 🧠🧠🧠 | 💰 | General purpose |
| DeepSeek R1 | ⚡ | 🧠🧠🧠🧠🧠 | 💰💰 | Deep reasoning (slow) |
| Grok 4 | ⚡⚡⚡ | 🧠🧠🧠🧠 | 💰💰 | General flagship |
| Grok Code Fast | ⚡⚡⚡⚡ | 🧠🧠🧠 | 💰💰 | Code generation |
| GPT-5 Mini | ⚡⚡⚡⚡⚡ | 🧠🧠🧠 | 💰 | Budget option |

**Legend:**

- ⚡ = Speed (more = faster)
- 🧠 = Intelligence (more = smarter)
- 💰 = Cost (more = expensive)

---

## Migration Guide

### From GPT-4o → GPT-5

```typescript
// Old (GPT-4o era)
{ model: 'gpt-4o' }           → { model: 'gpt-5.2' }
{ model: 'gpt-4o-mini' }      → { model: 'gpt-5-mini' }

// For coding specifically
{ model: 'gpt-4o' }           → { model: 'gpt-5.1-codex-max' }
```

### From Claude 3.5 → Claude 4.5

```typescript
// Upgrade to 4.5 series
{ model: 'claude-3.5-sonnet' } → { model: 'claude-sonnet-4.5' }

// For creative tasks, use Opus
{ model: 'claude-3.5-sonnet' } → { model: 'claude-opus-4.5' }
```

### From Gemini 2.0 → Gemini 2.5/3

```typescript
// Upgrade for speed
{ model: 'gemini-2.0-flash-exp' } → { model: 'gemini-3-flash' }

// Upgrade for reasoning
{ model: 'gemini-1.5-pro' }       → { model: 'gemini-2.5-pro' }
```

---

## Testing

Run the verification script to confirm all mappings:

```bash
cd apps/vibe-code-studio
npx tsx scripts/verify-2026-models.ts
```

**Expected output:**

```
✅ ALL MODEL MAPPINGS VERIFIED SUCCESSFULLY!
🎉 Vibe Code Studio is ready with 2026 state-of-the-art AI models!
```

---

## Changelog

### January 3, 2026

- ✅ Added GPT-5 series (5.2 Pro, 5.2, 5.1 Codex Max, 5 Mini)
- ✅ Added Claude 4.5 series (Opus 4.5, Sonnet 4.5)
- ✅ Added Gemini 3 Flash Preview
- ✅ Added Gemini 2.5 series (Pro, Flash)
- ✅ Added DeepSeek V3.2 and R1
- ✅ Added Grok 4, 4.1 Fast, Code Fast
- ✅ Maintained legacy model support for stability
- ✅ Added convenient aliases for all models

---

## Support & Feedback

If you encounter any issues with model mappings or need additional models added:

1. Check [OpenRouter Model List](https://openrouter.ai/docs) for latest IDs
2. Update `OpenRouterService.ts` `resolveModel()` method
3. Run `npx tsx scripts/verify-2026-models.ts` to verify
4. Submit PR or create issue

---

**Last Updated:** January 3, 2026  
**Models Version:** 2026 Q1 State-of-the-Art
