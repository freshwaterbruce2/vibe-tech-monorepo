/**
 * inject.js — runs in the PAGE's JavaScript context (not the extension sandbox).
 *
 * This gives us access to:
 *  - window, document, and all global JS variables
 *  - React fiber internals
 *  - The ability to monkey-patch console and fetch/XHR
 *
 * Communication with content.js is via window.postMessage.
 */

(function () {
  if (window.__devtools_mcp_injected__) return;
  window.__devtools_mcp_injected__ = true;

  // ── Console Interceptor ──────────────────────────────────────────────────

  const LOG_BUFFER_MAX = 500;
  const logBuffer = [];

  const _console = {};
  ["log", "warn", "error", "info", "debug"].forEach((level) => {
    _console[level] = console[level].bind(console);
    console[level] = function (...args) {
      logBuffer.push({
        level,
        timestamp: Date.now(),
        args: args.map((a) => {
          try { return JSON.parse(JSON.stringify(a)); } catch { return String(a); }
        }),
      });
      if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
      _console[level].apply(console, args);
    };
  });

  // Also capture uncaught errors
  window.addEventListener("error", (e) => {
    logBuffer.push({ level: "error", timestamp: Date.now(), args: [e.message, e.filename + ":" + e.lineno] });
    if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  });

  // ── Network Interceptor ──────────────────────────────────────────────────

  const NET_BUFFER_MAX = 200;
  const netBuffer = [];

  function recordRequest(entry) {
    netBuffer.push(entry);
    if (netBuffer.length > NET_BUFFER_MAX) netBuffer.shift();
  }

  function truncate(str, len = 2048) {
    if (typeof str !== "string") return str;
    return str.length > len ? str.slice(0, len) + "…" : str;
  }

  function headersToObj(headers) {
    if (!headers) return {};
    if (headers instanceof Headers) {
      const obj = {};
      headers.forEach((v, k) => { obj[k] = v; });
      return obj;
    }
    return headers;
  }

  // Fetch
  const _fetch = window.fetch.bind(window);
  window.fetch = async function (input, init = {}) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init.method || "GET").toUpperCase();
    const startTime = Date.now();
    const reqHeaders = headersToObj(init.headers);
    let reqBody = "";
    try { reqBody = truncate(typeof init.body === "string" ? init.body : JSON.stringify(init.body)); } catch {}

    try {
      const response = await _fetch(input, init);
      const clone = response.clone();
      let resBody = "";
      try { resBody = truncate(await clone.text()); } catch {}
      recordRequest({
        type: "fetch",
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        duration: Date.now() - startTime,
        requestHeaders: reqHeaders,
        responseHeaders: headersToObj(response.headers),
        requestBodySnippet: reqBody,
        responseBodySnippet: resBody,
        timestamp: startTime,
      });
      return response;
    } catch (err) {
      recordRequest({
        type: "fetch",
        url,
        method,
        status: 0,
        statusText: "NetworkError",
        duration: Date.now() - startTime,
        requestHeaders: reqHeaders,
        responseHeaders: {},
        requestBodySnippet: reqBody,
        responseBodySnippet: "",
        error: err.message,
        timestamp: startTime,
      });
      throw err;
    }
  };

  // XMLHttpRequest
  const _XHROpen = XMLHttpRequest.prototype.open;
  const _XHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__mcp_method = method;
    this.__mcp_url = url;
    this.__mcp_start = Date.now();
    _XHROpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener("loadend", () => {
      recordRequest({
        type: "xhr",
        url: this.__mcp_url,
        method: (this.__mcp_method || "GET").toUpperCase(),
        status: this.status,
        statusText: this.statusText,
        duration: Date.now() - (this.__mcp_start || Date.now()),
        requestHeaders: {},
        responseHeaders: {},
        requestBodySnippet: truncate(typeof body === "string" ? body : ""),
        responseBodySnippet: truncate(this.responseText),
        timestamp: this.__mcp_start || Date.now(),
      });
    });
    _XHRSend.apply(this, [body]);
  };

  // ── React Tree Inspector ─────────────────────────────────────────────────

  function findFiberRoot(element) {
    if (!element) return null;
    // React 16+: _reactRootContainer on the root element
    if (element._reactRootContainer) {
      return element._reactRootContainer._internalRoot?.current ?? null;
    }
    // Try fiber key on element itself
    const fiberKey = Object.keys(element).find(
      (k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance")
    );
    if (fiberKey) return element[fiberKey];
    return null;
  }

  function getFiberOnElement(element) {
    if (!element) return null;
    const fiberKey = Object.keys(element).find(
      (k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance")
    );
    return fiberKey ? element[fiberKey] : null;
  }

  function safePropSummary(props) {
    if (!props) return null;
    const out = {};
    for (const [k, v] of Object.entries(props)) {
      if (k === "children") { out.children = "[children]"; continue; }
      try {
        const s = JSON.stringify(v);
        out[k] = s && s.length > 200 ? s.slice(0, 200) + "…" : v;
      } catch {
        out[k] = String(v);
      }
    }
    return out;
  }

  function safeStateSummary(memoizedState) {
    if (!memoizedState) return null;
    // Class component state
    if (memoizedState && typeof memoizedState === "object" && !("queue" in memoizedState)) {
      try { return JSON.parse(JSON.stringify(memoizedState)); } catch {}
    }
    // Hook state — linked list
    const states = [];
    let node = memoizedState;
    while (node) {
      try {
        const val = JSON.parse(JSON.stringify(node.memoizedState));
        states.push(val);
      } catch {
        states.push("(unstringifiable)");
      }
      node = node.next;
    }
    return states.length ? states : null;
  }

  function traverseFiber(fiber, maxDepth, depth = 0) {
    if (!fiber || depth > maxDepth) return null;

    const typeName =
      typeof fiber.type === "string"
        ? fiber.type
        : fiber.type?.displayName ?? fiber.type?.name ?? null;

    // Skip host (DOM) nodes in the output if deeper than 3 to keep it readable
    const isHostNode = typeof fiber.type === "string";
    if (isHostNode && depth > 3) {
      // Still recurse but don't include in output unless it has a component child
    }

    const node = {
      component: typeName,
      key: fiber.key ?? null,
      props: safePropSummary(fiber.memoizedProps),
      state: safeStateSummary(fiber.memoizedState),
      children: [],
    };

    let child = fiber.child;
    while (child) {
      const childNode = traverseFiber(child, maxDepth, depth + 1);
      if (childNode) node.children.push(childNode);
      child = child.sibling;
    }

    return node;
  }

  function getReactTree(rootSelector, maxDepth = 8) {
    let startEl = document;
    if (rootSelector) {
      startEl = document.querySelector(rootSelector);
      if (!startEl) return { error: `No element found for selector: ${rootSelector}` };
    }

    // Search for React fiber roots in the DOM
    const candidates = [startEl, document.getElementById("root"), document.getElementById("app"), document.body].filter(Boolean);
    for (const el of candidates) {
      const fiber = findFiberRoot(el) ?? getFiberOnElement(el);
      if (fiber) return traverseFiber(fiber, maxDepth);
    }

    // Breadth-first search for any fiber-attached element
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const fiber = getFiberOnElement(node);
      if (fiber) return traverseFiber(fiber, maxDepth);
    }

    return { error: "No React application found on this page" };
  }

  function inspectReactComponent(selector) {
    const el = document.querySelector(selector);
    if (!el) return { error: `No element: ${selector}` };
    const fiber = getFiberOnElement(el);
    if (!fiber) return { error: "No React fiber found on element. Try a parent container." };
    return {
      component: fiber.type?.displayName ?? fiber.type?.name ?? fiber.type ?? "unknown",
      props: safePropSummary(fiber.memoizedProps),
      state: safeStateSummary(fiber.memoizedState),
      key: fiber.key ?? null,
    };
  }

  // ── Message Bridge ───────────────────────────────────────────────────────

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.__devtools_mcp_source !== "content") return;
    const { id, tool, params } = event.data;
    let result, error;

    try {
      switch (tool) {
        case "console_get_logs": {
          const level = params?.level ?? "all";
          const limit = params?.limit ?? 100;
          result = (level === "all" ? logBuffer : logBuffer.filter((e) => e.level === level))
            .slice(-limit);
          break;
        }
        case "console_clear_logs":
          logBuffer.length = 0;
          result = { cleared: true };
          break;
        case "network_get_requests": {
          const filter = params?.filter ?? "";
          const limit = params?.limit ?? 50;
          result = (filter ? netBuffer.filter((r) => r.url.includes(filter)) : netBuffer)
            .slice(-limit);
          break;
        }
        case "network_clear":
          netBuffer.length = 0;
          result = { cleared: true };
          break;
        case "react_get_tree":
          result = getReactTree(params?.selector, params?.maxDepth ?? 8);
          break;
        case "react_inspect":
          result = inspectReactComponent(params?.selector);
          break;
        case "js_eval": {
          let evalResult;
          try {
            // Use indirect eval to run in global scope
            // eslint-disable-next-line no-eval
            const fn = new Function(`return (async () => { return (${params.code}) })()`);
            evalResult = fn();
          } catch (e) {
            error = e.message;
            break;
          }
          // Handle promise
          if (evalResult instanceof Promise) {
            evalResult
              .then((v) => {
                let out;
                try { out = JSON.parse(JSON.stringify(v)); } catch { out = String(v); }
                window.postMessage({ __devtools_mcp_source: "inject", id, result: out }, "*");
              })
              .catch((e) => {
                window.postMessage({ __devtools_mcp_source: "inject", id, error: e.message }, "*");
              });
            return; // async path
          }
          try { result = JSON.parse(JSON.stringify(evalResult)); } catch { result = String(evalResult); }
          break;
        }
        default:
          error = `Unknown tool in inject: ${tool}`;
      }
    } catch (e) {
      error = e.message;
    }

    window.postMessage({ __devtools_mcp_source: "inject", id, result, error }, "*");
  });

  console.log("[DevTools MCP] Page-context injector ready");
})();
