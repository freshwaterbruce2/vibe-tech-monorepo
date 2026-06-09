const { spawn } = require('child_process');

const targetPath = "C:/dev/apps/vibe-code-studio/src/services";

const env = {
  ...process.env,
  MILVUS_ADDRESS: "localhost:19530",
  EMBEDDING_PROVIDER: "Ollama",
  OLLAMA_MODEL: "nomic-embed-text",
  OLLAMA_HOST: "http://localhost:11434",
  EMBEDDING_DIMENSION: "768",
  HYBRID_MODE: "false"
};

// Use the absolute path of the local Node 22 npx.cmd to prevent gRPC crashes under Node 24
const npxPath = "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\fnm\\node-versions\\v22.22.2\\installation\\npx.cmd";

const cp = spawn(npxPath, ['-y', '@zilliz/claude-context-mcp@latest'], {
  env,
  shell: true
});

let buffer = '';
let responseResolver = null;
let currentId = 0;

cp.stdout.on('data', (data) => {
  const str = data.toString();
  buffer += str;
  let lineEnd;
  while ((lineEnd = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line) {
      try {
        const msg = JSON.parse(line);
        console.log(`[RCV]`, JSON.stringify(msg, null, 2));
        if (msg.id === currentId && responseResolver) {
          responseResolver(msg);
        }
      } catch (err) {
        console.log(`[RCV STDOUT RAW]`, line);
      }
    }
  }
});

cp.stderr.on('data', (data) => {
  console.error(`[STDERR]`, data.toString());
});

cp.on('close', (code) => {
  console.log(`[EXIT] Child process exited with code ${code}`);
});

function sendRequest(method, params) {
  currentId++;
  const req = {
    jsonrpc: "2.0",
    id: currentId,
    method,
    params
  };
  console.log(`[SND]`, JSON.stringify(req, null, 2));
  return new Promise((resolve) => {
    responseResolver = resolve;
    cp.stdin.write(JSON.stringify(req) + '\n');
  });
}

function sendNotification(method, params) {
  const req = {
    jsonrpc: "2.0",
    method,
    params
  };
  console.log(`[SND NOTIF]`, JSON.stringify(req, null, 2));
  cp.stdin.write(JSON.stringify(req) + '\n');
}

async function run() {
  try {
    // 1. Initialize
    const initRes = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    });

    // Send initialized notification
    sendNotification("notifications/initialized", {});

    // Wait a brief moment
    await new Promise(r => setTimeout(r, 2000));

    // 2. Call search_code for 'AgentCircuitBreaker'
    console.log("Calling search_code for 'AgentCircuitBreaker'...");
    const searchRes1 = await sendRequest("tools/call", {
      name: "search_code",
      arguments: {
        path: targetPath,
        query: "AgentCircuitBreaker",
        limit: 3
      }
    });
    console.log("Search 'AgentCircuitBreaker' Result Content:", JSON.stringify(searchRes1, null, 2));

    // 3. Call search_code for 'pricing models'
    console.log("Calling search_code for 'pricing models'...");
    const searchRes2 = await sendRequest("tools/call", {
      name: "search_code",
      arguments: {
        path: targetPath,
        query: "pricing models",
        limit: 3
      }
    });
    console.log("Search 'pricing models' Result Content:", JSON.stringify(searchRes2, null, 2));

  } catch (err) {
    console.error("Error during execution:", err);
  } finally {
    cp.stdin.end();
  }
}

// Start sequence after a brief startup delay
setTimeout(run, 2000);
