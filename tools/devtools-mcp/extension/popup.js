const dot = document.getElementById("dot");
const label = document.getElementById("status-label");
const wsUrlEl = document.getElementById("ws-url");
const tabUrlEl = document.getElementById("tab-url");
const DEFAULT_WS_URL = "ws://localhost:54321";

chrome.runtime.sendMessage({ type: "get_status" }, (res) => {
  if (!res) {
    label.textContent = "Extension error";
    dot.className = "dot red";
    return;
  }

  if (res.connected) {
    dot.className = "dot green";
    label.textContent = "Connected to MCP";
  } else {
    dot.className = "dot red";
    label.textContent = "Start the local MCP server";
  }

  wsUrlEl.textContent = res.wsUrl ?? DEFAULT_WS_URL;
  tabUrlEl.textContent = res.activeTabUrl ?? "—";
  tabUrlEl.title = res.activeTabUrl ?? "";
});
