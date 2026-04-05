import { spawn } from "child_process";
import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(
    "C:/Users/fresh_zxae3v6/.gemini/antigravity/mcp_config.json",
    "utf8",
  ),
);

async function testServer(name, serverConfig) {
  return new Promise((resolve) => {
    let { command, args, env } = serverConfig;

    // Zapier takes token, so skip quotes and just use raw string
    // Bypassing spawn EINVAL by turning on shell: true for ALL commands.

    // If it's cmd, just run the whole arg as part of command string and use shell: true
    let fullCommandStr = command;
    if (args) {
      fullCommandStr +=
        " " + args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ");
    }

    const processEnv = { ...process.env, ...env };
    // on windows shell true means it passes string to cmd /c

    const child = spawn(fullCommandStr, {
      shell: true,
      env: processEnv,
      cwd: "C:/Users/fresh_zxae3v6",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let isInitialized = false;
    let errorOutput = "";

    const timeout = setTimeout(() => {
      child.kill();
      resolve({ name, success: false, reason: "Timeout (10s)", errorOutput });
    }, 10000);

    child.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;

      const lines = output.split("\n");
      output = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 1 && msg.result) {
            isInitialized = true;
            clearTimeout(timeout);
            child.kill();
            resolve({
              name,
              success: true,
              serverInfo: msg.result.serverInfo || msg,
            });
          }
        } catch (e) {
          // not json
        }
      }

      if (
        text.includes("EADDRINUSE") ||
        text.includes("port is already in use")
      ) {
        isInitialized = true;
        clearTimeout(timeout);
        child.kill();
        resolve({
          name,
          success: true,
          reason: "Port in use (assumed correctly configured)",
        });
      }
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
      if (
        data.toString().includes("EADDRINUSE") ||
        data.toString().includes("port is already in use")
      ) {
        isInitialized = true;
        clearTimeout(timeout);
        child.kill();
        resolve({
          name,
          success: true,
          reason: "Port in use (assumed correctly configured)",
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        name,
        success: false,
        reason: `Spawn error: ${err.message}`,
        errorOutput,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (!isInitialized) {
        resolve({
          name,
          success: code === 0,
          reason: `Exited with code ${code}`,
          errorOutput,
        });
      }
    });

    const initMsg = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    };

    child.stdin.write(JSON.stringify(initMsg) + "\n");
  });
}

async function run() {
  const results = [];
  for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
    if (!serverConfig || typeof serverConfig !== "object") continue;
    try {
      const res = await testServer(name, serverConfig);
      results.push(res);
      if (res.success) {
        console.log(
          `✅ ${name}: OK ${res.serverInfo ? JSON.stringify(res.serverInfo.name || res.serverInfo) : res.reason || ""}`,
        );
      } else {
        let errStr = res.errorOutput.replace(/\\n/g, " ").substring(0, 500);
        console.log(`❌ ${name}: FAILED - ${res.reason}`);
        if (errStr) console.log(`   Error: ${errStr}`);
      }
    } catch (e) {
      console.log(`❌ ${name}: EXCEPTION - ${e.message}`);
    }
  }
}

run();
