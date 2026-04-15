/**
 * Background Service Worker
 * - Opens a WebSocket to the MCP server (ws://localhost:54321)
 * - Auto-reconnects every 2 seconds on disconnect
 * - Tracks the active tab (last focused)
 * - Routes MCP tool requests to the active tab's content script
 * - Sends responses back through the WebSocket
 */

const WS_URL = "ws://localhost:54321";
const RECONNECT_DELAY = 2000;
const PING_INTERVAL = 20000; // keep service worker alive

let ws = null;
let activeTabId = null;
let connected = false;
let pingTimer = null;

// ── Track Active Tab ────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(({ tabId }) => {
  activeTabId = tabId;
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) activeTabId = tabs[0].id;
});

// ── WebSocket ───────────────────────────────────────────────────────────────

function connect() {
  if (ws && ws.readyState <= 1) return; // CONNECTING or OPEN

  console.log("[devtools-mcp] Connecting to", WS_URL);
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    connected = true;
    console.log("[devtools-mcp] Connected to MCP server");
    setBadge(true);
    startPing();
  };

  ws.onmessage = async (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      console.error("[devtools-mcp] Bad message from server");
      return;
    }

    const { id, tool, params } = msg;

    // page_navigate is handled in the background, not the content script
    if (tool === "page_navigate") {
      try {
        await chrome.tabs.update(activeTabId, { url: params.url });
        sendResult(id, { navigated: true, url: params.url });
      } catch (err) {
        sendError(id, err.message);
      }
      return;
    }

    // All other tools are forwarded to the content script
    if (!activeTabId) {
      sendError(id, "No active tab. Focus a browser tab first.");
      return;
    }

    try {
      // Make sure the content script is injected (handles cases where it wasn't auto-injected)
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ["content.js"],
      }).catch(() => {}); // ignore if already injected

      const response = await chrome.tabs.sendMessage(activeTabId, { id, tool, params });
      if (response?.error) {
        sendError(id, response.error);
      } else {
        sendResult(id, response?.result ?? null);
      }
    } catch (err) {
      sendError(id, `Content script error: ${err.message ?? err}`);
    }
  };

  ws.onclose = () => {
    connected = false;
    console.log("[devtools-mcp] Disconnected from MCP server");
    setBadge(false);
    stopPing();
    setTimeout(connect, RECONNECT_DELAY);
  };

  ws.onerror = (err) => {
    console.warn("[devtools-mcp] WebSocket error:", err);
  };
}

function sendResult(id, result) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ id, result }));
  }
}

function sendError(id, error) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ id, error }));
  }
}

// ── Keep-alive ping ─────────────────────────────────────────────────────────

function startPing() {
  stopPing();
  pingTimer = setInterval(() => {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ type: "ping" }));
  }, PING_INTERVAL);
}

function stopPing() {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
}

// ── Badge ───────────────────────────────────────────────────────────────────

function setBadge(ok) {
  chrome.action.setBadgeText({ text: ok ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: ok ? "#22c55e" : "#ef4444" });
}

// ── Status messages from popup ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "get_status") {
    chrome.tabs.get(activeTabId ?? -1, (tab) => {
      sendResponse({
        connected,
        wsUrl: WS_URL,
        activeTabUrl: tab?.url ?? "—",
        activeTabId,
      });
    });
    return true; // async
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────

connect();
