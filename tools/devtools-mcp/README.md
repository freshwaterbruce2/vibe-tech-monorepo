# DevTools MCP Server

A cross-browser developer tools server for AI agents. Gives Claude (or any MCP client) full access to browser dev tools — DOM inspection, JavaScript evaluation, console logs, network requests, and React component trees — in **Chrome, Edge, Brave, Firefox, and Arc**.

---

## Architecture

```
Claude Desktop (MCP client)
        │  stdio
        ▼
  mcp-server (Node.js)        ← you run this
        │  WebSocket (port 3001)
        ▼
  Browser Extension           ← installed in your browser
        │  chrome.tabs messaging
        ▼
  Content Script + inject.js  ← runs on every page
```

---

## Quick Start

### 1. Start the MCP server

```bash
cd mcp-server
npm install
npm run build
node dist/index.js
```

The server listens on **stdio** (for MCP) and **ws://localhost:3001** (for the extension).  
To use a different WebSocket port: `DEVTOOLS_WS_PORT=3002 node dist/index.js`

### 2. Install the browser extension

**Chrome / Edge / Brave / Arc**

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/manifest.json`

> Firefox permanent install: convert to Firefox using the [`web-ext`](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) tool.

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "devtools": {
      "command": "node",
      "args": ["/absolute/path/to/devtools-mcp/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. You should see the DevTools MCP tools in the tools list.

---

## Available Tools

### DOM

| Tool | Description |
|------|-------------|
| `dom_query(selector, limit?)` | Query elements by CSS selector — returns tag, id, classes, text, attributes |
| `dom_get_html(selector, type?)` | Get `innerHTML` or `outerHTML` |
| `dom_set_html(selector, html, type?)` | Set `innerHTML` or `outerHTML` |
| `dom_set_attribute(selector, attribute, value)` | Set an attribute on matched elements |
| `dom_set_style(selector, property, value)` | Set an inline CSS style (camelCase property) |

### JavaScript

| Tool | Description |
|------|-------------|
| `js_eval(code)` | Evaluate JS in the page context. Supports `async`/`await`. Returns the result or error. |

### Console

| Tool | Description |
|------|-------------|
| `console_get_logs(level?, limit?)` | Get captured console output. Levels: `all`, `log`, `warn`, `error`, `info`, `debug` |
| `console_clear_logs()` | Clear the log buffer |

### Network

| Tool | Description |
|------|-------------|
| `network_get_requests(filter?, limit?)` | Get captured fetch + XHR requests with URL, method, status, timing, headers, body snippet |
| `network_clear()` | Clear the request log |

### React

| Tool | Description |
|------|-------------|
| `react_get_tree(selector?, maxDepth?)` | Get the React component tree. Includes component names, props summary, and state |
| `react_inspect(selector)` | Get full props and state of the nearest React component to an element |

### Page

| Tool | Description |
|------|-------------|
| `page_info()` | Current URL, title, viewport dimensions, ready state |
| `page_navigate(url)` | Navigate the active tab to a URL |

---

## Example prompts for Claude

```
Inspect the DOM of the current page and tell me what the main navigation structure looks like.

Get the React component tree and identify where the user authentication state is managed.

Check the network requests — are there any 4xx or 5xx errors?

Evaluate document.querySelectorAll('img[src]').length and tell me how many images are on this page.

Set the background color of .hero-section to #1e293b.

Get the last 20 console errors.
```

---

## Popup

Click the extension icon in your toolbar to see:
- **Connected** / **Not connected** status
- The WebSocket server address
- The currently active tab URL

---

## Cross-browser Notes

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Reference implementation |
| Edge | ✅ Full | Same Chromium extension engine |
| Brave | ✅ Full | Same Chromium extension engine |
| Arc | ✅ Full | Same Chromium extension engine |
| Firefox | ✅ Mostly | Load as temporary add-on; permanent install needs `web-ext` |
| Safari | ⚠️ Partial | Convert with Xcode's Safari Web Extension Converter; WebSocket may need localhost exception |

---

## Security

- The WebSocket server only accepts connections from `localhost`
- The extension only sends data to `ws://localhost:3001` (configurable)
- No data is sent to any remote server
- `js_eval` executes arbitrary JS in the page — only use with sites you control or trust

---

## Development

```bash
# Watch TypeScript
cd mcp-server && npx tsc --watch

# Reload extension after changes
# Chrome: visit chrome://extensions, click the reload button on the extension
```

### Project structure

```
devtools-mcp/
├── mcp-server/
│   ├── src/
│   │   ├── index.ts      # MCP server + tool definitions
│   │   └── bridge.ts     # WebSocket bridge (extension ↔ server)
│   ├── dist/             # Compiled output (after npm run build)
│   └── package.json
└── extension/
    ├── manifest.json     # MV3 manifest
    ├── background.js     # Service worker: WebSocket client + tab routing
    ├── content.js        # DOM tools + inject.js loader + message routing
    ├── inject.js         # Page-context: console/network interceptors + React inspector
    ├── popup.html/js     # Status popup
    └── icons/
```
