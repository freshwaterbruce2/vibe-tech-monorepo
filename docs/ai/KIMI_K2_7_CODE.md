# Kimi K2.7 Code Provider

This document describes the local provider adapter for Moonshot AI's Kimi K2.7 Code model and the constraints it operates under.

## Model Overview

- **Architecture**: 1.06T total parameter Mixture-of-Experts (MoE).
- **Active Parameters**: 32B per token (8 active experts + 1 shared expert).
- **Attention**: Multi-head Latent Attention (MLA) compresses the KV cache.
- **Reasoning**: Always-on thinking traces (`always_thinking`).
- **Cost**: $0.95 / 1M input tokens, $4.00 / 1M output tokens, $0.19 / 1M prompt-cache-hit tokens.
- **MCP Mark Verified**: 81.1 (tool-use benchmark).

## Integration

The `tools/kimi-code-provider` package exposes an OpenAI-compatible chat-completions endpoint on port `8787`. It forwards requests to the Moonshot API using model `kimi-k2-7-code`.

## Constraints & Workarounds

### 15 KB Tool-Schema Limit

Moonshot's API rejects tool schemas larger than 15 KB. The provider automatically deduplicates repeated subschemas using JSON Schema `$ref`/`$defs` before forwarding the request.

### Prompt Cache Bug

Early K2.7 builds occasionally fail to trigger prompt caching in multi-turn agentic loops, re-reading the full context at the full input rate. The provider mitigates this by:

- Keeping the system message stable across turns.
- Surfacing cache-hit metrics in response headers for monitoring.

### Concurrency Ceiling

The Kimi Code Allegretto subscription limits HTTP-level concurrency to 30 requests. The provider enforces this with a local semaphore.

## Environment Variables

| Variable             | Purpose                      |
| -------------------- | ---------------------------- |
| `KIMI_API_KEY`       | Moonshot API key (required). |
| `KIMI_PROVIDER_PORT` | Local port (default: 8787).  |

## Usage

```powershell
.\tools\kimi-code-provider\bin\kimi-provider.ps1 -ApiKey $env:KIMI_API_KEY
```

Point any OpenAI-compatible client to `http://localhost:8787/v1/chat/completions`.

## Cost Governance

- Monitor `X-Kimi-Cache-Ratio` response headers.
- Prefer fewer, larger tool schemas over many small ones after deduplication.
- Set per-loop cost budgets in the Ralph orchestrator.
