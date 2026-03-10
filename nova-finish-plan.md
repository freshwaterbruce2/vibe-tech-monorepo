# Nova Agent + Nova Mobile - Finish & Personalize Plan

## Goal
Finish nova-agent (desktop) and nova-mobile-app to production-ready personal daily drivers. Desktop on Windows 11, mobile on iPhone (primary) + Samsung A54 (dev). Personal AI assistant + all-in-one hub.

## Current State
- **Desktop**: Functional Tauri app, 26 Rust modules, 18 pages. LLM hardcoded to Kimi K2.5. Heavy unused frontend deps. Beta Tauri plugins. Panics without MOBILE_BRIDGE_TOKEN.
- **Mobile**: 85% done. Expo SDK 54, 4 screens, offline support, biometric lock. Health endpoint mismatch. No push notifications. No WebSocket streaming.

---

## Phase 1: Fix Critical Bugs (Desktop + Mobile compatibility)

- [x] 1. Fix health endpoint: Returns JSON `{ok: true, uptime: <seconds>}` with Instant tracking
  - Verify: `cargo check` passes
- [x] 2. Fix MOBILE_BRIDGE_TOKEN panic: Generates UUID token if env var missing, logs warning
  - Verify: `cargo check` passes, no more panic
- [x] 3. Fix status response shape: Returns `idle|busy|offline` + currentTask + capabilities
  - Verify: `cargo check` passes
- [x] 4. Fix CORS/LAN access: Binds to 0.0.0.0, auto-detects LAN IP, added `get_bridge_info` command
  - Verify: `cargo check` passes

## Phase 2: LLM Provider Fix (Desktop)

- [x] 5. Make model selector work: Refactored `dispatch_model_request` with `resolve_provider()` - routes by prefix: `openrouter:`, `kimi-`, `deepseek-`, `groq:`, `ollama:`. Falls back to OpenRouter then Kimi.
  - Verify: `cargo check` passes
- [x] 6. Remove duplicate frontend LLM code: Stripped `openai`, `langchain`, `@langchain/*`, `chromadb`, `express`, `cors`, `three`, `@react-three/*` + related `@types/*`. Removed particle-network 3D background refs.
  - Verify: `pnpm --filter nova-agent build:frontend` succeeds
- [x] 7. Add OpenRouter as primary provider: Already configured in resolve_provider as default fallback. Credential store supports OpenRouter key via Settings UI.
  - Verify: OpenRouter is default when key is set

## Phase 3: Desktop Cleanup & Polish

- [ ] 8. Consolidate dashboards: Keep NovaDashboard2026 as the single dashboard. Remove Index, VibeDashboard, FuturisticDemo, PalettePreview pages. Update routing
  - Verify: Single clean dashboard loads on app start
- [ ] 9. Remove unused heavy deps: `three`/`@react-three` already removed in Task 6. Check `recharts` (if unused after dashboard consolidation), unused Radix components
  - Verify: Build succeeds, bundle size audit shows reduction
- [ ] 10. Upgrade beta Tauri plugins: `tauri-plugin-shell` and `tauri-plugin-store` to stable releases (check latest on crates.io)
  - Verify: `cargo build` succeeds with stable versions
- [ ] 11. Fix region screenshot: Implement actual region capture in `screenshot.rs` using the `screenshots` crate crop functionality
  - Verify: `capture_region` returns cropped image for given coordinates
- [ ] 12. Graceful external service handling: RAG/ChromaDB, orchestrator Python script, WebSocket IPC - all should degrade gracefully when unavailable (log warning, disable feature, not crash)
  - Verify: App starts and runs without ChromaDB, without Python sidecar, without Vibe Code Studio

## Phase 4: Mobile Enhancements

- [ ] 13. Add WebSocket support: Implement WebSocket connection from mobile to desktop for real-time chat streaming and status updates. Use existing `WS_URL` config
  - Verify: Chat responses stream token-by-token on mobile
- [ ] 14. Wire up message entrance animations: Connect `useMessageEntrance` hook to `ChatScreen` -> `MessageBubble` entranceStyle prop
  - Verify: New messages fade-in with slide-up animation
- [ ] 15. Clean up unused code: Remove `useNovaAgent` hook (superseded by connectionStore), remove `searchWeb` stub, clean `pushNotificationService` stub
  - Verify: No dead imports, `pnpm --filter nova-mobile-app lint` passes
- [ ] 16. Add task management screen: New tab or sub-screen to view/create/approve tasks from mobile (uses existing `/tasks` endpoints or add them to http_server.rs)
  - Verify: Can view pending tasks, approve/reject from phone
- [ ] 17. Add calendar view: New screen showing calendar events from desktop (uses existing calendar module endpoints or add them)
  - Verify: Can view today's schedule on phone, add quick events

## Phase 5: Personalization (Bruce's Setup)

- [ ] 18. Personal config defaults: Set default server URL to local machine IP, pre-configure OpenRouter as default LLM provider, set dark theme as default, configure D:\ paths
  - Verify: Fresh install works with minimal setup
- [ ] 19. Secure bridge token flow: On first desktop launch, generate cryptographic token, display QR code. Mobile scans QR to auto-configure server URL + token
  - Verify: Point iPhone camera at QR, mobile auto-connects
- [ ] 20. System tray integration: Nova-agent runs in system tray on Windows 11. Global hotkey (e.g. Ctrl+Space) to toggle chat overlay
  - Verify: Close window -> stays in tray. Hotkey opens chat.
- [ ] 21. Startup on boot: Add Windows startup registry entry option in Settings. App starts minimized to tray
  - Verify: Reboot Windows, nova-agent appears in tray automatically

## Phase 6: Build & Deploy

- [ ] 22. Desktop build: `pnpm nx build nova-agent` produces working .msi/.exe installer
  - Verify: Install on Windows 11, app launches, all features work
- [ ] 23. Android build: Configure Expo EAS or bare workflow for Samsung A54. Build APK
  - Verify: Install APK on Samsung A54, connects to desktop, chat works
- [ ] 24. iOS build: Configure Expo for iOS. Build via EAS or Xcode
  - Verify: Install on iPhone, all features work including biometric

## Phase 7: Verification

- [ ] 25. End-to-end test: Desktop running -> Mobile connects -> Send chat from phone -> Response streams back -> Check status -> View tasks -> View calendar -> Disconnect WiFi -> Messages queue -> Reconnect -> Queue flushes
  - Verify: Full workflow passes without errors

---

## Done When
- [ ] Desktop app builds and runs as personal AI assistant on Windows 11
- [ ] Mobile app runs on both iPhone and Samsung A54
- [ ] Chat works with selectable LLM providers (OpenRouter primary)
- [ ] Mobile connects to desktop over LAN, streams responses
- [ ] Tasks and calendar accessible from both platforms
- [ ] App starts on boot, lives in system tray
- [ ] No panics, no dead code, no unused heavy dependencies

## Notes
- All databases stay on D:\databases\nova-agent.db (paths policy)
- All logs to D:\logs\nova-agent\ (paths policy)
- OpenRouter API key stored in Windows Credential Manager (already working)
- iPhone is primary phone, Samsung A54 is dev device connected via USB
- This is a personal app - no multi-user auth needed, just bridge token for mobile