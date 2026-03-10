# DeepSeek V3.2 Integration & Best Practices

Last Updated: 2026-01-18

## Default AI Model (January 2026)

**DeepSeek V3.2** is the default model across all VibeTech projects for coding tasks.

### Why DeepSeek V3.2?

- **Best for coding**: #1 ranked model for code generation (January 2026)
- **Cost-effective**: 95% cheaper than GPT-4 ($0.27/M input, $1.10/M output)
- **Latest version**: V3.2 released January 2026, successor to V3
- **Performance**: GPT-4 quality at 1/10th the cost
- **Context**: 128K token window

## OpenRouter Proxy Architecture

All AI requests go through **OpenRouter proxy** at `http://localhost:3001`:

```
Apps → OpenRouter Proxy (localhost:3001) → OpenRouter API → Multiple Providers
```

### Benefits

- **Single API Key**: Access 100+ models (GPT-5, Claude, Gemini, DeepSeek)
- **Cost Tracking**: Unified billing across all models
- **Model Flexibility**: Switch models without managing multiple keys
- **Local Proxy**: Better security, request logging

### Required Setup

```env
VITE_OPENROUTER_API_KEY=your_key_here
VITE_OPENROUTER_PROXY_URL=http://localhost:3001
```

## Model Naming Consistency

### Full Format (Recommended)

Use full OpenRouter format for clarity and type safety:

```typescript
'deepseek/deepseek-v3.2'  // ✅ Correct - explicit provider prefix
```

### Simplified Format (Auto-Mapped)

Some components use simplified names with automatic mapping:

```typescript
'deepseek-chat' → 'deepseek/deepseek-v3.2'  // Auto-mapped by OpenRouterService
'deepseek' → 'deepseek/deepseek-v3.2'
```

**Mapping Location**: `src/services/ai/providers/OpenRouterService.ts` (lines 116-119)

## Default Model Settings

### vibe-code-studio ✅

- `UnifiedAIService.ts`: `'deepseek/deepseek-v3.2'`
- `useAIStore.ts`: `'deepseek/deepseek-v3.2'`
- `AIChat.tsx`: `'deepseek/deepseek-v3.2'`
- `Editor.tsx`: `'deepseek/deepseek-v3.2'`
- `CompletionIndicator.tsx`: `'deepseek/deepseek-v3.2'`

### nova-agent ✅

- `openrouter.ts`: `'deepseek/deepseek-v3.2'`
- `ModelSelector.tsx`: V3.2 recommended, V3 marked as legacy

## Type Definitions

Always include full OpenRouter format in TypeScript types:

```typescript
currentModel:
  // DeepSeek V3.2 (January 2026) - via OpenRouter (RECOMMENDED for coding)
  | 'deepseek/deepseek-v3.2'
  | 'deepseek/deepseek-chat'       // V3 - Legacy
  | 'deepseek/deepseek-reasoner'   // R1 - Reasoning tasks
```

## Migration from V3 to V3.2

When updating projects:

1. **Search for old references**:

   ```bash
   grep -r "deepseek-chat" --include="*.ts" --include="*.tsx"
   grep -r "DeepSeek V3" --include="*.md"
   ```

2. **Update default values**:
   - Change `'deepseek/deepseek-chat'` → `'deepseek/deepseek-v3.2'`
   - Update comments: "DeepSeek V3" → "DeepSeek V3.2"

3. **Update UI components**:
   - Model selectors: Add V3.2, mark V3 as legacy
   - Documentation: Reference V3.2 as current

4. **Verify consistency**:
   - All services use same default
   - Type definitions match
   - Documentation is current

## Best Practices

### For Coding Tasks (Recommended)

```typescript
model: 'deepseek/deepseek-v3.2'  // Best performance, lowest cost
```

### For Reasoning Tasks

```typescript
model: 'deepseek/deepseek-reasoner'  // DeepSeek R1 - extended thinking
```

### For Speed

```typescript
model: 'openai/gpt-5-mini'  // Fast, affordable
model: 'google/gemini-2.5-flash'  // Fast with huge context
```

### For Complex Tasks

```typescript
model: 'openai/gpt-5'  // Latest flagship
model: 'anthropic/claude-sonnet-4.5'  // Superior quality
```

## Documentation Files

- **vibe-code-studio**: `BRUCE_OPENROUTER_CONFIG.md` (complete guide)
- **Model Mapping**: `OpenRouterService.ts` (automatic alias resolution)
- **Type Definitions**: `useAIStore.ts` (all supported models)

## Verification Checklist

When reviewing projects for DeepSeek integration:

- [ ] Default model is `'deepseek/deepseek-v3.2'`
- [ ] Type definitions include V3.2
- [ ] Documentation references V3.2 (not V3)
- [ ] Model selectors show V3.2 as recommended
- [ ] V3 marked as legacy (if still listed)
- [ ] Comments reference January 2026 release
- [ ] OpenRouter proxy configured correctly

## Related Files

- `.claude/rules/project-completion.md` - Always use 2026 best practices
- `BRUCE_OPENROUTER_CONFIG.md` - Complete OpenRouter setup
- `.serena/memories/technology-stack-2026.md` - Tech stack overview
