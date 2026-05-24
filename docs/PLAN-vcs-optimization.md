# Vibe Code Studio - Complete Optimization & Modernization Plan

This plan addresses a complete optimization sweep across all three core pillars of Vibe Code Studio.

## Open Questions

> [!NOTE]  
> Are there any specific Monaco language servers (like Rust Analyzer or Python's Pyright) you want integrated in this pass, or should we stick to optimizing the React/TS defaults first?

## Proposed Changes

---

### Tauri Runtime Polish
*Optimizing the native desktop experience.*

#### [MODIFY] `apps/vibe-code-studio/src-tauri/Cargo.toml`
#### [MODIFY] `apps/vibe-code-studio/package.json`
- Add and configure `@tauri-apps/plugin-window-state` to automatically persist and restore the editor's window dimensions and position between launches.
- Sync `Cargo.toml` to include the native backend for `tauri-plugin-os` (which is in `package.json` but missing from the Rust build).

---

### Monaco Editor Modernization
*Bringing the editor UX up to 2026 standards.*

#### [MODIFY] `apps/vibe-code-studio/src/components/editor/useEditorState.ts`
- Enable `stickyScroll` to keep class and function signatures visible when scrolling through large files.
- Enable `bracketPairColorization` and smooth cursor animations (`cursorBlinking: 'smooth'`).
- Configure `minimap: { autohide: true }` to maximize screen real estate when not scrolling.
- Turn on `inlayHints` for TypeScript.

---

### AI Orchestration Enhancements
*Optimizing the AI API usage and streaming performance.*

#### [MODIFY] `apps/vibe-code-studio/src/services/ai/StreamingAIService.ts`
- **Implement AbortController Cancellation**: Currently, if the user navigates away or starts a new generation, the previous AI stream continues in the background, wasting memory and API credits. We will add `AbortSignal` propagation.
- Add a `cancelActiveGeneration()` method to gracefully terminate running open-router streams.

#### [MODIFY] `apps/vibe-code-studio/src/services/ai/UnifiedAIService.ts`
- Expose the cancellation token up to the UI layer so the user can hit a "Cancel Generation" button or trigger it via keyboard shortcut.

## Verification Plan

### Automated Tests
- `pnpm nx run vibe-code-studio:typecheck`
- `pnpm nx run vibe-code-studio:test`
- `pnpm nx run vibe-code-studio:lint`

### Manual Verification
- Launch the Tauri app using `pnpm nx run vibe-code-studio:dev`.
- Resize the window, close the app, and reopen it to ensure it restores the size.
- Scroll through a large TypeScript file to verify `stickyScroll` works.
- Start an AI generation and verify that closing the chat or issuing a new command properly aborts the network request.
