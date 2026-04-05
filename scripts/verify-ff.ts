import { FeatureFlagClient } from '../packages/feature-flags/sdk-node/dist/index.mjs';

async function main() {
  console.log("Starting verification...");

  const client = new FeatureFlagClient({
    serverUrl: 'http://localhost:3100',
    environment: 'production',
    enableWebSocket: false, // Simple HTTP check for verification
    logger: {
        debug: console.debug,
        info: console.log,
        warn: console.warn,
        error: console.error
    }
  });

  try {
    console.log("Attempting to initialize client against http://localhost:3100...");
    await client.initialize();
    console.log("✅ Client initialized successfully!");

    // Check various flags
    const killSwitch = await client.isEnabled('system.trading.kill-switch');
    console.log(`Kill Switch: ${killSwitch}`);

  } catch (error: any) {
    console.error("❌ Verification Failed:", error.message);
    if (error.code === 'ECONNREFUSED') {
        console.log("Server is not running. Start the server via 'pnpm --filter @vibetech/feature-flags-server start'.");
    }
    process.exit(1);
  }
}

main();
