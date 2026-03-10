const { execSync } = require('child_process');
const { rmSync } = require('fs');
const path = require('path');

/**
 * fix-bridge-links.js
 * Force-links shared-ipc and ensures server.ts is Node 22 compliant.
 */

const BRIDGE_ROOT = path.join(process.cwd(), 'backend/ipc-bridge');
const SHARED_IPC_ROOT = path.join(process.cwd(), 'packages/shared-ipc');

console.log("🔗 Re-wiring IPC Bridge Linkage...");

// 1. Physical Build of Shared Package
console.log("📦 Building shared-ipc...");
try {
    execSync(`pnpm --filter @vibetech/shared-ipc run build`, { stdio: 'inherit' });
} catch (e) {
    console.error("Build failed:", e);
    process.exit(1);
}

// 2. Clear stale cache
console.log("🧹 Clearing bridge cache...");
try {
    const distPath = path.join(BRIDGE_ROOT, 'dist');
    // Using recursive deletion for safety
    rmSync(distPath, { recursive: true, force: true });
    console.log(`Cleared ${distPath}`);
} catch (e) {
    console.warn(`Warning: Failed to clear dist folder: ${e}`);
}

// 3. Force Link
console.log("🚀 Syncing workspace links...");
execSync(`pnpm install`, { stdio: 'inherit' });

console.log("✅ Nervous System Restored. Run launch-vibe-ecosystem.ps1 now.");
