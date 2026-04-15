/**
 * Content Script — runs in the extension's isolated context on every page.
 *
 * Responsibilities:
 *  1. Inject inject.js into the page context (for console/network/React access)
 *  2. Handle DOM tool calls directly (document.querySelector etc.)
 *  3. Forward console/network/React/eval calls to inject.js via postMessage
 *  4. Return results to the background service worker
 */

// ── Inject page-context script ───────────────────────────────────────────────

(function injectPageScript() {
  if (document.getElementById("__devtools_mcp_inject__")) return;
  const s = document.createElement("script");
  s.id = "__devtools_mcp_inject__";
  s.src = chrome.runtime.getURL("inject.js");
  s.onload = () => s.remove();
  (document.head || document.documentElement).prepend(s);
})();

// ── Pending inject requests ──────────────────────────────────────────────────

const pendingInject = new Map(); // id -> { resolve, reject }

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.__devtools_mcp_source !== "inject") return;
  const { id, result, error } = event.data;
  const pending = pendingInject.get(id);
  if (!pending) return;
  pendingInject.delete(id);
  if (error) pending.reject(new Error(error));
  else pending.resolve(result);
});

function callInject(id, tool, params) {
  return new Promise((resolve, reject) => {
    pendingInject.set(id, { resolve, reject });
    const timer = setTimeout(() => {
      pendingInject.delete(id);
      reject(new Error(`inject.js timeout for tool: ${tool}`));
    }, 10000);
    // Wrap to clear timer on settle
    const _resolve = (v) => { clearTimeout(timer); resolve(v); };
    const _reject = (e) => { clearTimeout(timer); reject(e); };
    pendingInject.set(id, { resolve: _resolve, reject: _reject });
    window.postMessage({ __devtools_mcp_source: "content", id, tool, params }, "*");
  });
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function serializeElement(el, limit = 500) {
  const attrs = {};
  for (const attr of el.attributes ?? []) attrs[attr.name] = attr.value;
  return {
    tag: el.tagName?.toLowerCase(),
    id: el.id || null,
    classes: el.className ? el.className.split(" ").filter(Boolean) : [],
    text: el.textContent?.trim().slice(0, 200) ?? null,
    attributes: attrs,
    outerHTMLSnippet: el.outerHTML?.slice(0, limit) ?? null,
  };
}

function getElements(selector, limit = 20) {
  const els = Array.from(document.querySelectorAll(selector)).slice(0, limit);
  if (!els.length) return [];
  return els.map((el) => serializeElement(el));
}

// ── Message Handler ──────────────────────────────────────────────────────────

const INJECT_TOOLS = new Set([
  "console_get_logs",
  "console_clear_logs",
  "network_get_requests",
  "network_clear",
  "react_get_tree",
  "react_inspect",
  "js_eval",
]);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const { id, tool, params } = msg;

  // Tools routed through inject.js (page context)
  if (INJECT_TOOLS.has(tool)) {
    callInject(id, tool, params)
      .then((result) => sendResponse({ result }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // async
  }

  // DOM tools — handled here in extension context
  try {
    let result;
    switch (tool) {
      case "dom_query": {
        const limit = params?.limit ?? 20;
        result = getElements(params.selector, limit);
        break;
      }
      case "dom_get_html": {
        const el = document.querySelector(params.selector);
        if (!el) throw new Error(`No element: ${params.selector}`);
        result = params.type === "outer" ? el.outerHTML : el.innerHTML;
        break;
      }
      case "dom_set_html": {
        const el = document.querySelector(params.selector);
        if (!el) throw new Error(`No element: ${params.selector}`);
        if (params.type === "outer") el.outerHTML = params.html;
        else el.innerHTML = params.html;
        result = { success: true };
        break;
      }
      case "dom_set_attribute": {
        const els = document.querySelectorAll(params.selector);
        if (!els.length) throw new Error(`No elements: ${params.selector}`);
        els.forEach((el) => el.setAttribute(params.attribute, params.value));
        result = { updated: els.length };
        break;
      }
      case "dom_set_style": {
        const els = document.querySelectorAll(params.selector);
        if (!els.length) throw new Error(`No elements: ${params.selector}`);
        els.forEach((el) => { el.style[params.property] = params.value; });
        result = { updated: els.length };
        break;
      }
      case "page_info": {
        result = {
          url: window.location.href,
          title: document.title,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          devicePixelRatio: window.devicePixelRatio,
          readyState: document.readyState,
          charset: document.charset,
        };
        break;
      }
      default:
        sendResponse({ error: `Unknown tool: ${tool}` });
        return;
    }
    sendResponse({ result });
  } catch (err) {
    sendResponse({ error: err.message });
  }
});
