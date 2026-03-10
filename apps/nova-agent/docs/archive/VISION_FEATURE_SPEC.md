# Vision Feature Specification

**Feature:** Screenshot Capture + AI Vision Analysis
**Status:** In Development (2026-01-16)
**Priority:** HIGH - Aligns with 2026 AI trends

---

## Overview

Add computer vision capabilities to Nova Agent, enabling it to:

1. Capture screenshots (full screen or region)
2. Analyze screenshots using Claude Sonnet 4.5 vision model
3. Provide visual debugging assistance
4. Enable multimodal conversations (text + images)

This feature addresses the #1 trend in 2026 AI assistants: **Computer Use** (AI that can see and interact with UIs).

---

## 2026 AI Trends Context

Based on research from [Microsoft](https://news.microsoft.com/source/features/ai/whats-next-in-ai-7-trends-to-watch-in-2026/), [IBM](https://www.ibm.com/think/news/ai-tech-trends-predictions-2026), and [Google Cloud](https://cloud.google.com/resources/content/ai-agent-trends-2026):

- **40% of enterprise apps** will use AI agents by end of 2026
- **Computer Use** is emerging as critical capability (cursor control, click, type, UI automation)
- **Multimodal AI** (vision + text) is table stakes for competitive assistants
- **Agentic AI** shifts from reactive chat to proactive task completion

Nova Agent's vision feature positions it at the cutting edge of these trends.

---

## Architecture

### Backend (Rust + Tauri)

**New Module:** `src-tauri/src/modules/screenshot.rs`

```rust
#[tauri::command]
pub async fn capture_screenshot(save_path: String) -> Result<String, String>

#[tauri::command]
pub async fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<String, String>
```

**Dependency:** `screenshots = "0.8"` (Rust crate for native screenshot capture)

**Storage:** `D:\screenshots\` (follows monorepo path policy)

### Frontend (React + TypeScript)

**New Service:** `src/services/visionService.ts`

- Reads image as base64
- Sends to Claude Sonnet 4.5 via OpenRouter proxy
- Handles multimodal message format

**New Component:** `src/components/ScreenshotButton.tsx`

- Camera icon button (Lucide `Camera`)
- Triggers screenshot capture
- Sends to vision API
- Displays results in chat

**Integration:** `src/pages/ChatInterface.tsx`

- Screenshot button near send button
- Analysis results appear as assistant messages
- Supports follow-up questions about screenshots

---

## User Workflow

1. User clicks 📸 Screenshot button in chat
2. Nova captures full screen (or selected region)
3. Image saved to `D:\screenshots\{timestamp}.png`
4. Image sent to Claude vision API with optional prompt
5. AI analyzes screenshot and responds in chat
6. User can ask follow-up questions about the image

**Example Use Cases:**

- "What's wrong with this error message?" (screenshot of error)
- "Explain this UI" (screenshot of complex interface)
- "Find the login button" (UI element detection)
- "Debug this visual bug" (screenshot of rendering issue)

---

## Technical Details

### Vision API Integration

**Model:** `anthropic/claude-sonnet-4.5`
**Endpoint:** `http://localhost:3001/v1/chat/completions` (OpenRouter proxy)

**Request Format:**

```json
{
  "model": "anthropic/claude-sonnet-4.5",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "Analyze this screenshot" },
      {
        "type": "image_url",
        "image_url": { "url": "data:image/png;base64,..." }
      }
    ]
  }]
}
```

### Screenshot Storage

**Path:** `D:\screenshots\`
**Naming:** `{timestamp}.png` (e.g., `1705449600000.png`)
**Format:** PNG (lossless)
**Cleanup:** Manual (no auto-deletion for now)

### Windows 11 Native Integration

Uses `screenshots` Rust crate which leverages:

- Windows Graphics Capture API (preferred)
- GDI+ fallback for compatibility
- Multi-monitor support
- Region selection (future enhancement)

---

## Future Enhancements (Phase 2)

1. **Region Selection**
   - Click-and-drag to select area
   - Automatic UI element detection
   - Smart cropping around active window

2. **OCR Integration**
   - Extract text from screenshots
   - Copy text to clipboard
   - Search for text in images

3. **UI Automation**
   - Click coordinates based on vision analysis
   - Type text into detected fields
   - Automate repetitive UI tasks

4. **Visual Regression Testing**
   - Compare screenshots over time
   - Detect UI changes automatically
   - Generate visual diff reports

5. **Screen Recording**
   - Record screen actions as video
   - AI analysis of video workflows
   - Generate automation scripts from recordings

---

## Performance Considerations

**Screenshot Capture:** <100ms (native Windows API)
**Base64 Encoding:** ~50ms for 1920x1080 PNG
**Vision API Latency:** ~2-4s (Claude Sonnet 4.5)
**Total Workflow:** ~3-5s end-to-end

**Memory:** Each screenshot ~500KB-2MB (depends on content)
**Storage:** Recommend cleanup after 7 days (configurable)

---

## Security & Privacy

**Local Storage:** All screenshots stored locally on D:\ (never uploaded to cloud without consent)
**API Usage:** Only sent to Claude when user explicitly requests analysis
**Redaction:** Future feature - auto-detect and redact sensitive info (passwords, keys)
**Permissions:** Requires Windows screen capture permission (granted on first use)

---

## Testing Plan

1. **Unit Tests**
   - Screenshot capture success/failure
   - Base64 encoding correctness
   - API request formatting

2. **Integration Tests**
   - Full workflow: capture → encode → analyze → display
   - Error handling (API down, invalid image, etc.)
   - Multi-monitor scenarios

3. **User Acceptance Tests**
   - Screenshot quality validation
   - Analysis accuracy (manual review)
   - UI responsiveness

---

## Dependencies Added

**Rust:**

- `screenshots = "0.8"` - Native screenshot capture

**TypeScript:**

- None (uses existing `@tauri-apps/api`)

---

## Implementation Status

- [x] Research 2026 AI trends (vision, computer use)
- [x] Design architecture
- [~] Implement Rust screenshot module (in progress)
- [~] Create vision service (in progress)
- [~] Build UI components (in progress)
- [ ] Integration with chat
- [ ] Write tests
- [ ] Documentation

**Estimated Completion:** 2-3 hours

---

## Success Metrics

**MVP Success:**

- User can capture screenshot with 1 click
- AI provides relevant analysis within 5 seconds
- Results display clearly in chat
- No crashes or errors

**Production Success:**

- 90%+ analysis accuracy (manual validation)
- <5s latency 95th percentile
- Zero data loss (screenshots saved successfully)
- Positive user feedback

---

## Related Documentation

- [2026 AI Trends - Microsoft](https://news.microsoft.com/source/features/ai/whats-next-in-ai-7-trends-to-watch-in-2026/)
- [Tauri Screenshot Guide](https://v2.tauri.app/)
- [Claude Vision API](https://docs.anthropic.com/claude/docs/vision)
- [Monorepo Path Policy](../../.claude/rules/paths-policy.md)

---

**Last Updated:** 2026-01-16
**Owner:** Nova Agent Desktop Team
**Status:** In Active Development
