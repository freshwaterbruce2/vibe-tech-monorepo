# Clawdbot Setup & Optimization Guide

**Last Updated:** 2026-01-26
**Environment:** Windows 11, VibeTech Monorepo
**WhatsApp:** ✅ Connected
**Status:** Configuration optimization needed

---

## 📋 Current Status

### ✅ What's Working

- **WhatsApp Connected** - Successfully paired via QR code
- **Anthropic Auth** - Synced from Claude Code CLI (OAuth)
- **Model Selection** - Claude Opus 4.5 (default)
- **Security** - Allowlist mode (`+18038252876` only)
- **Workspace** - `C:\Users\fresh_zxae3v6\clawd` with agent templates
- **Configuration** - `~/.clawdbot/clawdbot.json` properly structured

### ⚠️ Needs Fixing

1. **Gateway Daemon Not Running** - Service not installed (requires admin)
2. **Group Chat Configuration** - Not configured yet
3. **Heartbeat System** - Not customized
4. **Memory System** - Not initialized
5. **Skills** - Not reviewed/configured
6. **Slack** - Configured but not enabled

---

## 🚀 Step-by-Step Setup

### 1. Install Gateway Daemon (Critical)

**Run in PowerShell as Administrator:**

```powershell
clawdbot gateway install
```

**Then start it:**

```powershell
clawdbot gateway start
```

**Verify it's running:**

```powershell
clawdbot gateway status
```

**Dashboard should now be accessible at:** http://127.0.0.1:18789/

---

### 2. Enhanced Configuration

Your current config is good, but here are recommended enhancements:

```json
{
  "messages": {
    "ackReactionScope": "group-mentions",
    "groupChat": {
      "mentionPatterns": ["@clawd", "@bot", "hey clawd"],
      "activation": "mention"
    }
  },
  "agents": {
    "defaults": {
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "1h"
      },
      "heartbeat": {
        "every": "30m",
        "prompt": "Read HEARTBEAT.md if it exists. Check email, calendar, notifications. If nothing needs attention, reply HEARTBEAT_OK."
      },
      "compaction": {
        "mode": "safeguard"
      },
      "workspace": "C:\\Users\\fresh_zxae3v6\\clawd"
    }
  },
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "90b90d0800b3edd14aac31294b4a0538ee1d49ccd3a82368"
    },
    "port": 18789,
    "bind": "loopback",
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    },
    "canvasHost": {
      "port": 18793,
      "bind": "loopback"
    }
  },
  "auth": {
    "profiles": {
      "anthropic:claude-cli": {
        "provider": "anthropic",
        "mode": "oauth"
      }
    }
  },
  "plugins": {
    "entries": {
      "whatsapp": {
        "enabled": true
      }
    }
  },
  "channels": {
    "whatsapp": {
      "selfChatMode": true,
      "dmPolicy": "allowlist",
      "allowFrom": ["+18038252876"],
      "groups": {
        "*": {
          "requireMention": true,
          "activation": "mention"
        }
      }
    }
  },
  "sessions": {
    "dmScope": "per-channel",
    "groupScope": "per-channel-group"
  },
  "meta": {
    "lastTouchedVersion": "2026.1.24-3",
    "lastTouchedAt": "2026-01-26T21:42:47.998Z"
  }
}
```

**Key Additions:**

1. **Group Chat Mention Patterns** - Respond when mentioned with `@clawd`, `@bot`, or `hey clawd`
2. **Group Settings** - Require mention in all groups, don't respond to every message
3. **Session Scoping** - Isolate DM sessions per channel, group sessions per group
4. **Canvas Host** - Added explicit configuration for Canvas HTTP server (port 18793)

---

### 3. Initialize Memory System

**Create memory directory:**

```powershell
New-Item -Path "C:\Users\fresh_zxae3v6\clawd\memory" -ItemType Directory -Force
```

**Create today's memory file:**

```powershell
$today = Get-Date -Format "yyyy-MM-dd"
New-Item -Path "C:\Users\fresh_zxae3v6\clawd\memory\$today.md" -ItemType File -Force
```

**Create long-term memory:**

```powershell
@"
# MEMORY.md - Long-Term Memory

**Created:** $(Get-Date -Format "yyyy-MM-dd HH:mm")

## About This Human

- Name: Bruce
- Location: Windows 11 workstation
- Primary Workspace: C:\dev (VibeTech monorepo)
- Development Focus: Nx monorepo with 52+ projects

## Key Context

### Monorepo Structure
- **Apps:** 52 applications (web, mobile, desktop, crypto trading)
- **Packages:** Shared libraries and utilities
- **Backend:** API services
- **Tech Stack:** React 19, TypeScript 5.9, pnpm 9.15, Nx 21.6.3

### Current Projects
- Crypto trading system (crypto-enhanced) - Python, Kraken API
- Desktop apps (nova-agent, vibe-code-studio) - Tauri, Electron
- Mobile apps (Vibe-Tutor) - Capacitor
- Web apps (digital-content-builder, business-booking-platform)

### Development Environment
- **Code:** C:\dev (all source code)
- **Data:** D:\ drive (databases, logs, learning systems)
- **Tools:** PowerShell 7.5.4, Node.js 22.21.1, pnpm

### Important Rules
- Always use pnpm (NEVER npm or yarn)
- Databases go on D:\ drive, NEVER C:\dev
- Windows 11 native only (no WSL2 unless explicitly requested)
- TypeScript strict mode enforced
- React 19+ patterns (no React.FC, named imports only)

## Recent Events

_This section will be updated with significant events, decisions, and learnings._

## Tasks & Goals

_Track ongoing projects and goals here._

## Lessons Learned

_Document mistakes, insights, and best practices here._
"@ | Out-File -FilePath "C:\Users\fresh_zxae3v6\clawd\MEMORY.md" -Encoding utf8
```

---

### 4. Configure Heartbeat System

**Create HEARTBEAT.md:**

```powershell
@"
# HEARTBEAT.md - Proactive Assistant Checklist

**Check every ~30 minutes during active hours (8 AM - 11 PM)**

## Rotation Schedule

### Morning Check (8 AM - 12 PM)
- Email: Check for urgent messages
- Calendar: Events in next 24 hours
- Weather: Today's forecast

### Afternoon Check (12 PM - 6 PM)
- Email: New important messages
- Calendar: Upcoming events (<2h)
- Projects: C:\dev git status

### Evening Check (6 PM - 11 PM)
- Email: Final check
- Calendar: Tomorrow's schedule
- Memory: Update MEMORY.md if needed

## When to Reach Out

**Do reach out if:**
- Important email arrived
- Calendar event starting soon (<2h)
- Build errors detected in monorepo
- Trading system errors (crypto-enhanced)
- Something interesting found

**Stay quiet (HEARTBEAT_OK) if:**
- Late night (11 PM - 8 AM) unless urgent
- Nothing new since last check
- Just checked <30 minutes ago
- Human is clearly busy

## Background Work (Silent)

**Feel free to do without asking:**
- Organize memory files
- Update MEMORY.md with learnings
- Git commit workspace changes
- Review and optimize documentation
- Check on project health (git status)

## Notes

_Add reminders or notes here as needed._
"@ | Out-File -FilePath "C:\Users\fresh_zxae3v6\clawd\HEARTBEAT.md" -Encoding utf8
```

---

### 5. Review and Customize Workspace Templates

**Key files in `C:\Users\fresh_zxae3v6\clawd`:**

1. **SOUL.md** - Who the agent is (personality, style)
2. **USER.md** - Information about you (preferences, context)
3. **TOOLS.md** - Local tool configurations (SSH, camera, voice)
4. **AGENTS.md** - Operational guidelines (already excellent)

**Review these files and customize them to match your preferences.**

---

### 6. Enable Additional Channels (Optional)

**Telegram (Recommended for simplicity):**

```bash
clawdbot channels enable telegram
clawdbot channels login telegram
```

**Discord (Recommended for groups):**

```bash
clawdbot channels enable discord
clawdbot channels login discord
```

**Slack (Already configured, just enable):**

```bash
clawdbot doctor --fix  # This will enable Slack
```

---

### 7. Skills Configuration

**Check available skills:**

```bash
clawdbot skills list
```

**Common useful skills:**
- **Email** - Gmail integration
- **Calendar** - Google Calendar
- **Voice** - ElevenLabs TTS for storytelling
- **Search** - Web search capabilities
- **Screenshot** - Take/analyze screenshots
- **Camera** - Access webcam for visual context

**Install skills as needed:**

```bash
clawdbot skills install <skill-name>
```

---

### 8. Test the Setup

**Send a test message from WhatsApp:**

```
Hey, are you online?
```

**Check dashboard:**

```
http://127.0.0.1:18789/
```

**View logs:**

```powershell
Get-Content "C:\tmp\clawdbot\clawdbot-2026-01-26.log" -Tail 50
```

---

## 🔒 Security Best Practices

### Current Security Status: ✅ Good

Your current configuration already follows best practices:

1. **Allowlist Mode** - Only your phone number can DM
2. **Loopback Binding** - Gateway only accessible locally
3. **Token Auth** - Gateway requires token for non-loopback access
4. **Mention-Based Groups** - Only responds when mentioned in groups

### Additional Security Recommendations

**For Group Chats:**

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": {
          "requireMention": true,
          "allowFrom": ["+18038252876", "+1234567890"]
        }
      }
    }
  }
}
```

**For Remote Access (if needed):**

1. **Use Tailscale** instead of exposing port publicly:

```json
{
  "gateway": {
    "bind": "tailnet",
    "tailscale": {
      "mode": "on",
      "resetOnExit": true
    }
  }
}
```

2. **Or use SSH tunnel** for temporary remote access:

```bash
ssh -L 18789:localhost:18789 your-server
```

---

## 🎯 Integration with VibeTech Monorepo

### Recommended Use Cases

1. **Build Notifications**
   - Monitor `pnpm run quality` output
   - Alert on TypeScript errors
   - Report test failures

2. **Crypto Trading Alerts**
   - Monitor `D:\logs\trading.log`
   - Alert on failed orders
   - Report P&L changes

3. **Git Workflow**
   - Commit reminders (every 10 commits)
   - PR status updates
   - Deployment notifications

4. **Development Assistant**
   - Quick code searches
   - Documentation lookup
   - Package version checks

### Example Custom Skills

Create `C:\Users\fresh_zxae3v6\clawd\skills\monorepo.md`:

```markdown
# Monorepo Skills

## Quick Commands

- `/build <project>` - Build specific project with Nx
- `/test <project>` - Run tests for project
- `/quality` - Run full quality pipeline
- `/status` - Git status and uncommitted changes
- `/crypto-status` - Check crypto trading system health
```

---

## 🐛 Troubleshooting

### Gateway Won't Start

**Check logs:**

```powershell
Get-Content "C:\tmp\clawdbot\clawdbot-2026-01-26.log" -Tail 100
```

**Verify Node.js version:**

```bash
node --version  # Must be 22+
```

**Reinstall if needed:**

```bash
npm install -g clawdbot@latest
clawdbot gateway install
```

### WhatsApp Connection Lost

**Relink device:**

```bash
clawdbot channels login whatsapp
```

**Check credentials:**

```powershell
Test-Path "C:\Users\fresh_zxae3v6\.clawdbot\credentials"
```

### Memory Not Persisting

**Verify workspace path:**

```bash
clawdbot doctor
```

**Check permissions:**

```powershell
icacls "C:\Users\fresh_zxae3v6\clawd"
```

---

## 📚 Next Steps

1. ✅ **Install Gateway Daemon** (run as admin)
2. ✅ **Apply Enhanced Configuration** (edit clawdbot.json)
3. ✅ **Initialize Memory System** (create memory/ directory)
4. ✅ **Configure Heartbeat** (create HEARTBEAT.md)
5. ✅ **Review Workspace Templates** (customize SOUL.md, USER.md)
6. ✅ **Test Setup** (send WhatsApp message, check dashboard)
7. ⏳ **Enable Additional Channels** (optional: Telegram, Discord)
8. ⏳ **Install Skills** (optional: email, calendar, voice)
9. ⏳ **Create Custom Skills** (monorepo-specific commands)

---

## 📖 Documentation Links

- **Official Docs:** https://docs.clawd.bot/
- **Getting Started:** https://docs.clawd.bot/start/getting-started
- **Configuration:** https://docs.clawd.bot/gateway/configuration
- **Skills:** https://docs.clawd.bot/tools/skills
- **Security:** https://docs.clawd.bot/gateway/security
- **Troubleshooting:** https://docs.clawd.bot/gateway/troubleshooting
- **Remote Access:** https://docs.clawd.bot/gateway/remote
- **Multi-Agent:** https://docs.clawd.bot/concepts/multi-agent

---

**Status:** Ready for final setup steps (gateway daemon installation)
**Next Action:** Run `clawdbot gateway install` as Administrator
