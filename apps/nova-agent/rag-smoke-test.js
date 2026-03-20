// RAG Smoke Test - paste this entire block into DevTools console
(async () => {
  const invoke = window.__TAURI__.core.invoke;
  const results = [];

  // Test 1: Search empty index
  try {
    const r1 = await invoke("rag_search", { query: "hello", topK: 3 });
    results.push({ test: "search_empty", pass: Array.isArray(r1) && r1.length === 0, result: r1 });
  } catch (e) {
    results.push({ test: "search_empty", pass: false, error: e.toString() });
  }

  // Test 2: Index a file
  try {
    const r2 = await invoke("rag_index_file", {
      filePath: "test.ts",
      content: "export function greet(name: string) { return 'Hello ' + name; }",
      metadata: { language: "typescript" }
    });
    results.push({ test: "index_file", pass: true, result: r2 });
  } catch (e) {
    results.push({ test: "index_file", pass: false, error: e.toString() });
  }

  // Test 3: Search for indexed content
  try {
    const r3 = await invoke("rag_search", { query: "greet function", topK: 3 });
    results.push({ test: "search_indexed", pass: Array.isArray(r3) && r3.length > 0, result: r3 });
  } catch (e) {
    results.push({ test: "search_indexed", pass: false, error: e.toString() });
  }

  // Test 4: Clear index
  try {
    const r4 = await invoke("rag_clear_index");
    results.push({ test: "clear_index", pass: true, result: r4 });
  } catch (e) {
    results.push({ test: "clear_index", pass: false, error: e.toString() });
  }

  // Test 5: Verify index is empty after clear
  try {
    const r5 = await invoke("rag_search", { query: "greet", topK: 3 });
    results.push({ test: "search_after_clear", pass: Array.isArray(r5) && r5.length === 0, result: r5 });
  } catch (e) {
    results.push({ test: "search_after_clear", pass: false, error: e.toString() });
  }

  // Report
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log("=== RAG SMOKE TEST RESULTS ===");
  results.forEach(r => {
    console.log((r.pass ? "PASS" : "FAIL") + " - " + r.test, r.error || r.result);
  });
  console.log("=== " + passed + "/" + total + " passed ===");
  return results;
})();
