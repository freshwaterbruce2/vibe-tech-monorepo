# Changelog

All notable changes to `@vibetech/openclaw-bridge` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-02-19

### 🎉 Major Update - OpenClaw 2026 Compatibility

This release modernizes the openclaw-bridge package to work with [OpenClaw v2026.2.19-2](https://github.com/openclaw/openclaw/releases/tag/v2026.2.19-2) and includes comprehensive improvements for production use.

### Added

- ✨ **Auto-reconnection** with exponential backoff
  - Configurable `maxReconnectAttempts` and `reconnectDelay`
  - Events: `reconnecting`, `reconnect_failed`
- ✨ **Health check endpoint** (`healthCheck()` method)
  - Returns `{ healthy, latencyMs, error? }`
  - Useful for monitoring and readiness checks
- ✨ **Connection state tracking**
  - New `connectionState` getter: `'connected' | 'connecting' | 'disconnected' | 'reconnecting'`
  - Enhanced `isConnected` property checks WebSocket readyState
- ✨ **Debug logging** support
  - Enable with `{ debug: true }` in BridgeOptions
  - Logs all operations, connections, disconnections
- ✨ **Enhanced capabilities** in identify message
  - Reports OpenClaw version compatibility
  - Advertises supported features (task_dispatch, tool_call, streaming)
- 📚 **Comprehensive documentation**
  - Complete README with usage examples
  - OpenClaw integration guide (webhooks, extensions)
  - Architecture diagram
  - Troubleshooting section
- 🧪 **Test coverage**
  - Vitest test suite with 10 tests
  - Coverage reporting configured
  - Tests for all major features
- 🔧 **Enhanced package.json**
  - Keywords for discoverability
  - Repository metadata
  - Additional scripts (build:watch, test:watch, test:coverage, lint, clean)

### Changed

- **BREAKING**: Version bumped to 2.0.0 for OpenClaw 2026 compatibility
- **BREAKING**: Constructor now accepts `BridgeOptions` object (still supports legacy string URL)
- Improved error handling and logging throughout
- Enhanced TypeScript types and JSDoc comments
- Better cleanup on disconnect (clears reconnect timers, rejects pending requests)
- Optimized WebSocket event handlers

### Fixed

- Disconnect now properly clears reconnect timers
- Pending requests are properly rejected on disconnect
- WebSocket close event includes code and reason

---

## [1.0.0] - 2025

### Added

- Initial release
- Basic WebSocket connection to IPC Bridge
- Tool calling (`callTool()` method)
- Multi-step task dispatching (`dispatchTask()` method)
- CLI tool (`openclaw-dispatch`)
- Event-based architecture (EventEmitter)
- Request/response correlation tracking
- Per-operation timeout handling

---

[2.0.0]: https://github.com/freshwaterbruce2/vibe-tech-monorepo/compare/openclaw-bridge-v1.0.0...openclaw-bridge-v2.0.0
[1.0.0]: https://github.com/freshwaterbruce2/vibe-tech-monorepo/releases/tag/openclaw-bridge-v1.0.0
