# SSE Streaming for Chat Responses

**Status**: DEFERRED — not scheduled
**Priority**: LOW (UX polish, not a functional gap)

---

## What

`POST /simple` and `POST /rag` (`vibe_justice/api/chat.py`) call into
`AIService.generate_response_streaming` / `AIService.generate_rag_response_streaming`
(`vibe_justice/services/ai_service.py`), which despite the `_streaming` suffix in
their names, call OpenRouter with a blocking `requests.post(...)` and return the
full answer in one `ChatResponse` payload. The reasoning content is not surfaced
separately today (`result["reasoning"]` is always `""` — see the comment
`# Reasoning embedded in answer for now`); the client sees nothing until the
entire response is generated, which can take up to the 120s timeout configured
on those calls for reasoning models.

This spec captures the deferred work to make these endpoints genuinely stream
tokens to the frontend via Server-Sent Events (SSE), replacing the two
`# TODO: Add streaming support via SSE for real-time reasoning display`
comments that previously sat at the end of each method (removed — comments are
not a substitute for a tracked spec).

## Why

- Reasoning models (`deepseek/deepseek-r1-0528:free`) can take tens of seconds.
  Users currently stare at a blank screen with no feedback until the full
  response lands.
- OpenRouter's chat completions endpoint supports `stream: true` (SSE) natively;
  the backend already picks the model and endpoint per-request in
  `AIService._get_api_config`, so plumbing `stream=True` through is additive,
  not a rewrite.
- Real-time reasoning display (showing the model's chain-of-thought as it's
  generated) is a feature competitors in `FEATURE_SPECS/DOCUMENT_ANALYSIS_2025.md`
  are measured against ("Harvey AI: Seconds vs hours").

## Where (integration points)

1. **`vibe_justice/services/ai_service.py`**
   - `AIService.generate_response_streaming` (currently starts at line 205,
     non-streaming body ends around line 269) — needs a `stream=True` request
     variant that yields `(reasoning_delta, answer_delta)` chunks instead of
     returning a single `Dict[str, str]`.
   - `AIService.generate_rag_response_streaming` (starts around line 362,
     non-streaming body ends around line 444) — same change, plus the RAG
     context-formatting step ahead of the call is unaffected.
   - Both currently use `requests.post(...)` synchronously; a streaming version
     needs `requests.post(..., stream=True)` and iteration over
     `response.iter_lines()`, parsing OpenRouter's `data: {...}` SSE frames.

2. **`vibe_justice/api/chat.py`**
   - `simple_chat` (`POST /simple`, line ~36) and `rag_chat` (`POST /rag`,
     line ~72) are currently sync `def` handlers returning a single
     `ChatResponse` Pydantic model. Streaming requires either:
     - a new response type (FastAPI `StreamingResponse` with
       `media_type="text/event-stream"`), replacing `ChatResponse` for these
       routes, or
     - new `/simple/stream` and `/rag/stream` routes alongside the existing
       non-streaming ones (keeps the current contract intact for any caller
       depending on it — check `frontend/src/services/httpClient.ts` and chat
       hooks before removing the non-streaming path).
   - Both handlers are deliberately sync (`def`, not `async def`) today because
     `requests` is blocking and would stall the event loop under `async def`.
     A streaming implementation needs to either keep using FastAPI's
     threadpool dispatch for sync generators, or switch to an async HTTP
     client (`httpx.AsyncClient`) if the handler becomes `async def`.

3. **Frontend** (`apps/vibe-justice/frontend/`) — not scoped here. Whatever
   consumes `POST /simple` / `POST /rag` today would need an `EventSource` (or
   `fetch` + `ReadableStream`) consumer and incremental message rendering.
   Locate the chat call site before starting frontend work.

## Rough approach

1. Add a streaming code path to `AIService` (new method or a `stream: bool`
   parameter) that sets `stream: true` in the OpenRouter request body, opens
   the connection with `requests.post(..., stream=True)`, and exposes a
   generator yielding parsed SSE deltas (reasoning tokens separately from
   answer tokens, since OpenRouter's reasoning-model responses distinguish
   `reasoning` and `content` fields per chunk).
2. Add streaming route(s) in `chat.py` that wrap that generator in a
   `StreamingResponse` emitting `text/event-stream` frames (e.g.
   `event: reasoning` / `event: answer` / `event: done`).
3. Keep the existing non-streaming `generate_response_streaming` /
   `generate_rag_response_streaming` methods and `/simple` `/rag` routes
   working unchanged for backward compatibility, or migrate callers and
   remove them — decide based on what the frontend currently depends on.
4. Update `vibe_justice/tests/test_chat_router.py` and
   `vibe_justice/tests/test_ai_service.py` with streaming-response test
   coverage (mock `requests.post(..., stream=True)` returning canned SSE
   lines).
5. Wire the frontend chat UI to consume the stream and render reasoning
   incrementally.
