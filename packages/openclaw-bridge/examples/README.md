# OpenClaw Integration Examples

Ready-to-use examples for integrating `@vibetech/openclaw-bridge` with OpenClaw.

## 📁 Contents

```
examples/
├── INTEGRATION_GUIDE.md        # Complete integration guide
├── README.md                    # This file
├── install.ps1                  # Quick install script (Windows)
├── webhook-handler.js           # Webhook integration example
├── extension/                   # Full extension example
│   ├── manifest.json           # Extension configuration
│   ├── index.js                # Extension entry point
│   └── commands/               # Command handlers
│       ├── mcp.js             # /mcp command
│       ├── files.js           # /files command
│       ├── search.js          # /search command
│       └── screenshot.js      # /screenshot command
└── openclaw-config.json        # Example OpenClaw configuration
```

---

## 🚀 Quick Start

### Prerequisites

1. **OpenClaw installed**:
   ```bash
   npm install -g openclaw@2026.2.19-2
   ```

2. **IPC Bridge running**:
   ```bash
   pnpm --filter ipc-bridge dev
   ```

3. **Bridge package built**:
   ```bash
   pnpm --filter @vibetech/openclaw-bridge build
   pnpm --filter @vibetech/openclaw-bridge link --global
   ```

---

## 📦 Installation Methods

### Method 1: Quick Install (Recommended)

```powershell
# Windows
cd C:\dev\packages\openclaw-bridge\examples
.\install.ps1
```

This script will:
- Copy extension files to `~/.openclaw/extensions/vibetech-bridge/`
- Copy webhook handler to `~/.openclaw/webhooks/`
- Update OpenClaw configuration
- Test the installation

### Method 2: Manual Installation

#### Webhook Integration

```bash
# Copy webhook handler
cp webhook-handler.js ~/.openclaw/webhooks/on_message.js

# Update ~/.openclaw/openclaw.json
{
  "webhooks": {
    "on_message": {
      "enabled": true,
      "handler": "webhooks/on_message.js"
    }
  }
}
```

#### Extension Integration

```bash
# Copy extension
cp -r extension ~/.openclaw/extensions/vibetech-bridge

# Load extension
openclaw extensions load vibetech-bridge
```

---

## 🧪 Testing

### Test Webhook

Send a message to OpenClaw:
```
/mcp filesystem list_directory {"path":"./"}
```

Expected response:
```json
✅ filesystem.list_directory (45ms)
{
  "files": [...],
  "directories": [...]
}
```

### Test Extension Commands

```
/mcp help
/files
/files C:\dev
/search vibetech
/screenshot
```

---

## 📚 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/mcp` | Call any MCP tool | `/mcp filesystem list_directory {"path":"./"}` |
| `/files` | List files/dirs | `/files C:\dev` |
| `/search` | Search GitHub | `/search vibetech --limit 10` |
| `/screenshot` | Take screenshot (Windows) | `/screenshot capture.png` |

---

## 🔧 Configuration

### Extension Config

Edit `~/.openclaw/extensions/vibetech-bridge/manifest.json`:

```json
{
  "config": {
    "ipc_bridge_url": "ws://localhost:5004",
    "auto_reconnect": true,
    "debug": false,
    "default_timeout": 30000
  }
}
```

### OpenClaw Config

Edit `~/.openclaw/openclaw.json`:

```json
{
  "extensions": {
    "vibetech-bridge": {
      "enabled": true,
      "auto_load": true
    }
  },
  "webhooks": {
    "on_message": {
      "enabled": true,
      "handler": "webhooks/on_message.js",
      "platforms": ["telegram", "discord", "slack"]
    }
  }
}
```

---

## 🛠️ Development

### Test Extension Locally

```bash
# Start IPC Bridge
pnpm --filter ipc-bridge dev

# Test bridge connection
openclaw-dispatch ping

# Load extension in dev mode
openclaw extensions dev ~/.openclaw/extensions/vibetech-bridge
```

### Debug Mode

Enable debug logging:

```json
{
  "config": {
    "debug": true
  }
}
```

View logs:
```bash
tail -f ~/.openclaw/logs/vibetech-bridge.log
```

---

## 📖 Documentation

- **Integration Guide**: See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Main README**: See [../README.md](../README.md)
- **API Reference**: See main package documentation

---

## 🔍 Troubleshooting

### Issue: Commands not working

**Solution:**
1. Check IPC Bridge is running: `openclaw-dispatch ping`
2. Verify extension loaded: `openclaw extensions list`
3. Check logs: `~/.openclaw/logs/`

### Issue: "Connection refused"

**Solution:**
```bash
# Start IPC Bridge
pnpm --filter ipc-bridge dev

# Verify port 5004 available
netstat -an | findstr 5004
```

### Issue: Extension not loading

**Solution:**
1. Check manifest syntax: Validate `manifest.json`
2. Verify dependencies: `npm list @vibetech/openclaw-bridge`
3. Check OpenClaw version: `openclaw --version` (should be 2026.2.19-2+)

---

## 📝 Examples

### Example 1: List Files

```
/files C:\dev
```

Response:
```
📁 C:\dev

📂 Directories (3):
  • apps/
  • packages/
  • backend/

📄 Files (5):
  • package.json
  • pnpm-workspace.yaml
  • README.md
  • tsconfig.json
  • nx.json
```

### Example 2: Search Repositories

```
/search vibetech --limit 5
```

Response:
```
🔍 Search Results for "vibetech" (5)

1. freshwaterbruce2/Monorepo
   VibeTech Nx monorepo with 52+ projects
   ⭐ 15 | 🍴 3 | 📝 TypeScript
   🔗 https://github.com/freshwaterbruce2/Monorepo

...
```

### Example 3: Screenshot (Windows)

```
/screenshot my-capture.png
```

Response:
```
📸 Screenshot Captured

Saved to: D:\screenshots\my-capture.png

💡 Tip: Use /files D:\screenshots to see all screenshots
```

---

## 🤝 Contributing

To add new commands:

1. Create handler in `extension/commands/<name>.js`
2. Add entry to `manifest.json` commands array
3. Test with `openclaw test-command /<name>`
4. Submit to monorepo

---

## 📄 License

MIT - See main package LICENSE

---

## 🔗 Links

- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [VibeTech Monorepo](https://github.com/freshwaterbruce2/Monorepo)
- [MCP Protocol Docs](https://modelcontextprotocol.io/)

---

**Ready to integrate!** 🎊 Copy the examples and start using OpenClaw with VibeTech's MCP ecosystem.
