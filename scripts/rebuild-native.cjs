const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const APP_DIR = path.join(__dirname, "../apps/vibe-code-studio");
const MODULES_TO_REBUILD = [
	"sqlite-vec",
	"sharp",
	"better-sqlite3",
	"node-pty",
];

console.log("[36m%s[0m", "=== Vibe-Tech Native Module Rebuilder ===");
console.log("Target App:", APP_DIR);
console.log("Modules:", MODULES_TO_REBUILD.join(", "));

if (!fs.existsSync(APP_DIR)) {
	console.error("Error: App directory not found:", APP_DIR);
	process.exit(1);
}

try {
	console.log("\n--> Installing app dependencies through electron-builder...");
	// This command forces electron-builder to look at dependencies and rebuild them against the Electron headers
	execSync("npx electron-builder install-app-deps", {
		cwd: APP_DIR,
		stdio: "inherit",
		env: { ...process.env, FORCE_COLOR: "1" },
	});

	console.log("\n[32m%s[0m", "SUCCESS: Native modules rebuilt for Electron.");
} catch (error) {
	console.error("\n[31m%s[0m", "FAILED: Build process encountered an error.");
	process.exit(1);
}
