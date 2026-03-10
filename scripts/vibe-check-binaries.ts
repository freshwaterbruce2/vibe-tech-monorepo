import fs from "fs";
import path from "path";

const APP_PATHS = [
	"apps/vibe-code-studio/dist-electron/win-unpacked/resources/app.asar.unpacked",
	"apps/vibe-code-studio/dist/win-unpacked/resources/app.asar.unpacked",
];

const REQUIRED_BINARIES = [
	{ name: "better-sqlite3.node", pattern: /better_sqlite3\.node$/ },
	{ name: "onnxruntime.dll", pattern: /onnxruntime\.dll$/ }, // This might vary by platform, but assuming Windows for now
];

function findUnpackedDir() {
	for (const p of APP_PATHS) {
		const fullPath = path.resolve(process.cwd(), p);
		if (fs.existsSync(fullPath)) return fullPath;
	}
	return null;
}

function scanDir(dir: string, pattern: RegExp): boolean {
	if (!fs.existsSync(dir)) return false;
	const files = fs.readdirSync(dir, { withFileTypes: true });
	for (const file of files) {
		if (file.isDirectory()) {
			if (scanDir(path.join(dir, file.name), pattern)) return true;
		} else if (pattern.test(file.name)) {
			return true;
		}
	}
	return false;
}

function main() {
	console.log("🔍 Starting Vibe-Tech Binary Sanity Check...");

	const unpackedDir = findUnpackedDir();
	if (!unpackedDir) {
		console.error("❌ FAILED: Could not find unpacked resources directory.");
		console.error('   Have you run "npm run build:production"?');
		console.error(`   Checked paths: ${APP_PATHS.join(", ")}`);
		process.exit(1);
	}

	console.log(`✅ Found unpacked resources: ${unpackedDir}`);

	let missing = false;

	// Check for native modules
	// better-sqlite3 is usually in node_modules/better-sqlite3/build/Release
	// onnxruntime is usually in node_modules/onnxruntime-node/bin

	// We need to verify they exist deeply nested in the unpacked folder

	for (const binary of REQUIRED_BINARIES) {
		const found = scanDir(unpackedDir, binary.pattern);
		if (found) {
			console.log(`✅ Verified: ${binary.name}`);
		} else {
			console.error(`❌ MISSING: ${binary.name}`);
			missing = true;
		}
	}

	if (missing) {
		console.error("\n💥 FATAL: Critical binaries are missing from the build.");
		console.error('   This will cause a "Silent Crash" on startup.');
		console.error(
			'   Remediation: Check electron-builder.yml "asarUnpack" and "files" config.',
		);
		process.exit(1);
	}

	console.log("\n✨ Sanity Gate Passed. Build is safe for deployment.");
	process.exit(0);
}

main();
