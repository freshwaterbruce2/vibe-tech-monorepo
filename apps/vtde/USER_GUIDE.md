# VTDE User Guide

**Vibe Tauri Desktop Environment** - A native Windows 11 desktop environment with integrated terminal, file manager, and built-in applications.

**Version:** 0.1.0
**Platform:** Windows 11
**Built with:** Tauri 2.0, React 19, TypeScript 5.9

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Desktop Environment](#desktop-environment)
3. [Terminal](#terminal)
4. [Built-in Applications](#built-in-applications)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Tips & Tricks](#tips--tricks)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Launch

1. Launch VTDE from Start menu or desktop shortcut
2. The desktop environment loads with default layout
3. Clock displays in top-right corner
4. Desktop icons appear for built-in apps

### Desktop Layout

```
┌─────────────────────────────────────────┐
│  VTDE              🕐 12:34 PM  ⊞ _ □ ✕ │
├─────────────────────────────────────────┤
│                                         │
│   📁        📝       🖼️        🎮       │
│  Files    Notes   Gallery    Games     │
│                                         │
│   🎵       📹       ⚙️        >_        │
│  Music   Videos  Settings  Terminal    │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Desktop Environment

### Window Management

**Open Window:**
- Click any desktop icon
- Use keyboard shortcuts (see below)

**Move Window:**
- Click and drag title bar
- Windows stay within desktop bounds

**Resize Window:**
- Click and drag window edges/corners
- Minimum size: 400x300px

**Close Window:**
- Click ✕ in title bar
- Press `Alt+F4` (when window focused)

**Minimize/Maximize:**
- Click _ (minimize) or □ (maximize) in title bar

### Desktop Icons

Icons snap to grid automatically:
- 4 columns × N rows
- Auto-layout on desktop resize
- Double-click to open application

### System Tray

**Clock:**
- Displays current time
- Updates every second
- 12-hour format with AM/PM

---

## Terminal

### Overview

VTDE includes a professional-grade terminal emulator with:
- ✅ Multi-tab sessions
- ✅ Split panes (vertical/horizontal)
- ✅ Clickable URL links
- ✅ Hardware-accelerated rendering (WebGL)
- ✅ Customizable tab names
- ✅ Layout persistence across sessions

### Opening Terminal

**Methods:**
1. Click Terminal icon on desktop
2. Press `Ctrl+Shift+T` (global shortcut)
3. Right-click desktop → "Open Terminal"

### Tab Management

**Create New Tab:**
- Click `+` button in tab bar
- Press `Ctrl+Shift+T`
- Context menu → "New Tab"

**Switch Tabs:**
- Click tab to activate
- Press `Ctrl+Shift+PageUp` (previous tab)
- Press `Ctrl+Shift+PageDown` (next tab)

**Rename Tab:**
- **Double-click** tab label
- **Right-click** tab → "Rename Tab"
- Type new name, press **Enter** to save
- Press **Escape** to cancel

**Close Tab:**
- Click ✕ on tab
- Press `Ctrl+Shift+W` (closes active pane/tab)
- Right-click → "Close Tab"

### Split Panes

**Split Vertically (Side-by-Side):**
- Click `V` button in toolbar
- Right-click pane → "Split Right"

**Split Horizontally (Top/Bottom):**
- Click `H` button in toolbar
- Right-click pane → "Split Down"

**Switch Active Pane:**
- Click inside pane to activate
- Active pane has blue border

**Close Pane:**
- Right-click pane → "Close Pane"
- Press `Ctrl+Shift+W` (closes active pane)
- If last pane, closes entire tab

### Terminal Features

#### Clickable URLs

URLs in terminal output are automatically detected and made clickable:

```bash
# Example usage
echo "Visit https://github.com/tauri-apps/tauri"

# Result: URL becomes clickable
# Ctrl+Click to open in default browser
```

**Supported protocols:**
- `http://` and `https://`
- `file://`
- `ftp://`

#### WebGL Rendering

Terminal uses GPU-accelerated rendering for smooth scrolling and better performance:

- **Enabled by default** (if WebGL supported)
- **Automatic fallback** to canvas renderer
- **Performance:** 60 FPS scrolling, reduced CPU usage

**Test performance:**
```powershell
# Generate lots of output
1..10000 | ForEach-Object { Write-Host "Line $_" }

# Should scroll smoothly without lag
```

#### Copy/Paste

**Copy:**
- Select text with mouse
- Press `Ctrl+Shift+C`
- Right-click → "Copy Selection"

**Paste:**
- Press `Ctrl+Shift+V`
- Right-click → "Paste Clipboard"

**Clear Terminal:**
- Press `Ctrl+L` (shell built-in)
- Right-click → "Clear Pane"

### Context Menu

Right-click anywhere in terminal to access:
- New Tab
- Rename Tab ✨ NEW
- Split Right
- Split Down
- Restart Pane
- Copy Selection
- Paste Clipboard
- Clear Pane
- Close Pane
- Close Tab

### Terminal Status

**Status Bar (Top):**
- Shows active pane name
- Displays pane count
- Shows PTY ID when connected
- Indicates connection status:
  - 🟢 Green = Ready
  - 🟡 Yellow = Starting
  - 🔴 Red = Error
  - ⚫ Gray = Closed

### Layout Persistence

Terminal automatically saves your layout:
- Tab configuration
- Pane arrangement (split layout)
- Tab names
- Active tab/pane

**Storage:** localStorage (browser-based)

**Reset Layout:**
- Close all tabs (creates fresh default tab)
- Or clear browser storage

---

## Built-in Applications

### 📁 File Manager

Browse and manage files on your system.

**Features:**
- Navigate directories
- View file details
- File operations (planned)

### 📝 Notes

Simple note-taking application.

**Features:**
- Create/edit notes
- Markdown support (planned)
- Local storage

### 🖼️ Gallery

View images and photos.

**Supported formats:**
- PNG, JPG, GIF
- SVG (planned)

### 🎮 Games

Built-in mini-games for entertainment.

### 🎵 Music Player

Play audio files (planned).

### 📹 Video Player

Play video files (planned).

### ⚙️ Settings

Configure VTDE preferences.

**Available Settings:**
- Theme selection
- Terminal preferences
- Keyboard shortcuts
- Desktop layout

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Open Terminal |
| `Alt+F4` | Close active window |
| `Win+D` | Show desktop |

### Terminal Shortcuts

#### Tab Management
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | New tab |
| `Ctrl+Shift+W` | Close active pane/tab |
| `Ctrl+Shift+PageUp` | Previous tab |
| `Ctrl+Shift+PageDown` | Next tab |

#### Pane Operations
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` | Copy selection |
| `Ctrl+Shift+V` | Paste clipboard |
| `Ctrl+L` | Clear terminal (shell) |

#### Window Management
| Shortcut | Action |
|----------|--------|
| `Esc` | Close context menu |
| `Esc` | Cancel tab rename |
| `Enter` | Confirm tab rename |

---

## Tips & Tricks

### Terminal Productivity

**1. Use Tab Renaming**
```
Default:  Tab 1, Tab 2, Tab 3
Better:   Frontend, Backend, Database
```
Double-click tabs to rename them based on task.

**2. Split for Comparisons**
```
Left pane:  npm run dev
Right pane: tail -f logs/app.log
```
Monitor dev server and logs side-by-side.

**3. Persistent Layouts**
Your tab/pane layout saves automatically. Set up your ideal workspace once, use forever.

**4. URL Quick Access**
```bash
# Print useful links
echo "Docs: https://tauri.app/v2/guides/"
echo "API: https://tauri.app/v2/api/js/"

# Ctrl+Click to open instantly
```

### Performance

**WebGL Acceleration:**
- Automatically enabled if GPU supports it
- Check console for "WebGL renderer loaded" message
- Falls back to canvas if unavailable

**Memory Usage:**
- Each terminal pane ≈ 10-20MB
- Scrollback buffer: 10,000 lines (configurable)
- Close unused panes to free memory

### Layout Organization

**Multi-Monitor Setup:**
- VTDE runs in single window currently
- Use Windows `Win+Arrow` to snap window to half-screen
- Run multiple VTDE instances (if needed)

**Desktop Organization:**
- Rearrange icons by editing layout (planned)
- Create folders for grouping apps (planned)

---

## Troubleshooting

### Terminal Won't Open

**Symptoms:** Terminal window opens but no prompt appears

**Solutions:**
1. Check if PowerShell is installed
2. Verify PTY status in terminal header
3. Restart terminal pane (right-click → "Restart Pane")

### Terminal Performance Issues

**Symptoms:** Slow scrolling, lag during output

**Solutions:**
1. Close unused panes/tabs
2. Clear scrollback buffer (right-click → "Clear Pane")
3. Check if WebGL is enabled (see console)
4. Reduce scrollback limit in settings

### URLs Not Clickable

**Symptoms:** URLs in output are plain text

**Solutions:**
1. Verify WebLinks addon loaded (check console)
2. Use `Ctrl+Click` to open (not plain click)
3. Ensure URL has protocol (`https://` not just `example.com`)

### Layout Not Saving

**Symptoms:** Tabs/panes reset after restart

**Solutions:**
1. Check browser localStorage is enabled
2. Don't use incognito/private mode
3. Verify VTDE has localStorage permissions

### Build Issues (Developers)

**See:**
- `BUILD_ENVIRONMENT_ISSUE.md` - Environment setup
- `USE_DEV_PROMPT.md` - Developer Command Prompt
- `SOLUTION_SUMMARY.md` - Build fixes

---

## Advanced Features

### Custom Shell

**Default:** PowerShell 7 (pwsh.exe) or PowerShell 5.1 fallback

**Planned:** Configurable shell selection (bash, cmd, etc.)

### Terminal Themes

**Current:** Dark theme with cyan accents

**Planned:** Theme customization in Settings

### Keyboard Shortcuts Customization

**Planned:** Remap shortcuts in Settings app

---

## Known Limitations

### Current Version (0.1.0)

**Terminal:**
- No custom shell selection (uses PowerShell)
- No theme customization
- Scrollback limited to 10,000 lines
- No search in terminal output

**Desktop:**
- Fixed icon grid (no drag-and-drop rearrange)
- No desktop folders
- No custom wallpaper

**Apps:**
- Limited functionality in built-in apps
- No inter-app communication
- No plugin system

**See:** `FEATURE_AUDIT.md` for complete feature status

---

## Getting Help

### Documentation

- **User Guide:** This file
- **Feature Audit:** `FEATURE_AUDIT.md`
- **Manual Testing:** `MANUAL_TESTING_CHECKLIST.md`
- **Terminal Testing:** `src-tauri/PTY_TESTING_GUIDE.md`

### Bug Reports

Create issue with:
- VTDE version
- Windows version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

### Feature Requests

Suggest features in issues with:
- Use case description
- Expected behavior
- Example workflows

---

## Version History

### v0.1.0 (2026-03-11)

**Added:**
- ✨ Terminal tab rename (double-click or context menu)
- ✨ Clickable URL links in terminal output
- ✨ Hardware-accelerated WebGL rendering
- Multi-tab terminal sessions
- Split panes (vertical/horizontal)
- Layout persistence
- Desktop environment with icons
- Built-in applications framework

**Known Issues:**
- Build requires Visual Studio Developer Command Prompt
- Some built-in apps have limited functionality

**Next Release:**
- Custom shell selection
- Terminal themes
- Settings app functionality
- Desktop folder organization

---

**Enjoy using VTDE!** 🚀

For the latest updates, see `CHANGELOG.md` (coming soon).
