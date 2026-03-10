/**
 * Nova Agent - Manual E2E Test Runner
 *
 * This script tests real Tauri commands when the app is running.
 * Run this after launching the Nova Agent desktop app.
 *
 * Usage:
 *   1. Start Nova Agent: pnpm tauri dev
 *   2. In another terminal: pnpm tsx src/tests/e2e-runner.ts
 */

import { invoke } from "@tauri-apps/api/core";

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
	duration: number;
}

const results: TestResult[] = [];

async function runTest(
	name: string,
	testFn: () => Promise<void>,
): Promise<void> {
	const start = Date.now();
	try {
		await testFn();
		results.push({ name, passed: true, duration: Date.now() - start });
		console.log(`✅ ${name} (${Date.now() - start}ms)`);
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		results.push({
			name,
			passed: false,
			error: errorMsg,
			duration: Date.now() - start,
		});
		console.log(`❌ ${name}: ${errorMsg}`);
	}
}

async function runAllTests(): Promise<void> {
	console.log("\n🧪 Nova Agent E2E Tests\n");
	console.log("=".repeat(50));

	// Database Tests
	console.log("\n📦 Database Operations\n");

	await runTest("get_tasks", async () => {
		const tasks = await invoke("get_tasks", { statusFilter: null, limit: 10 });
		if (!Array.isArray(tasks)) throw new Error("Expected array");
		console.log(`   Found ${tasks.length} tasks`);
	});

	await runTest("get_task_stats", async () => {
		const stats = await invoke("get_task_stats");
		if (typeof stats !== "object") throw new Error("Expected object");
		console.log(`   Stats: ${JSON.stringify(stats)}`);
	});

	await runTest("get_recent_activities", async () => {
		const activities = await invoke("get_recent_activities", {
			limit: 5,
			activityTypeFilter: null,
		});
		if (!Array.isArray(activities)) throw new Error("Expected array");
		console.log(`   Found ${activities.length} activities`);
	});

	await runTest("get_learning_events", async () => {
		const events = await invoke("get_learning_events", {
			limit: 5,
			eventTypeFilter: null,
		});
		if (!Array.isArray(events)) throw new Error("Expected array");
		console.log(`   Found ${events.length} learning events`);
	});

	await runTest("get_today_activity_count", async () => {
		const count = await invoke("get_today_activity_count");
		if (typeof count !== "number") throw new Error("Expected number");
		console.log(`   Today's activities: ${count}`);
	});

	// Context Tests
	console.log("\n🔍 Context Engine\n");

	await runTest("get_context_snapshot", async () => {
		const context = await invoke("get_context_snapshot");
		if (!context || typeof context !== "object")
			throw new Error("Expected object");
		console.log(`   Workspace: ${(context as any).workspace_path ?? "N/A"}`);
		console.log(`   Project type: ${(context as any).project_type ?? "N/A"}`);
	});

	// Guidance Tests
	console.log("\n💡 Guidance Engine\n");

	await runTest("request_guidance", async () => {
		const guidance = await invoke("request_guidance");
		if (!guidance || typeof guidance !== "object")
			throw new Error("Expected object");
		const g = guidance as any;
		console.log(`   Next steps: ${g.next_steps?.length ?? 0}`);
		console.log(`   Doing right: ${g.doing_right?.length ?? 0}`);
		console.log(`   At risk: ${g.at_risk?.length ?? 0}`);
	});

	// Project Templates
	console.log("\n📁 Project Templates\n");

	await runTest("get_available_templates", async () => {
		const templates = await invoke("get_available_templates");
		if (!Array.isArray(templates)) throw new Error("Expected array");
		console.log(`   Available templates: ${templates.length}`);
		templates.forEach((t: any) => console.log(`     - ${t.id}: ${t.name}`));
	});

	// Activity Logging
	console.log("\n📝 Activity Logging\n");

	await runTest("log_activity", async () => {
		await invoke("log_activity", {
			activityType: "test_run",
			details: "E2E test executed at " + new Date().toISOString(),
		});
		console.log("   Activity logged successfully");
	});

	// Summary
	console.log("\n" + "=".repeat(50));
	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => !r.passed).length;
	console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

	if (failed > 0) {
		console.log("Failed tests:");
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`  ❌ ${r.name}: ${r.error}`);
			});
	}
}

// Check if we're in a Tauri context
if (typeof window !== "undefined" && "__TAURI__" in window) {
	runAllTests().catch(console.error);
} else {
	console.log("⚠️  This script must be run within the Nova Agent app.");
	console.log("   Start the app with: pnpm tauri dev");
	console.log("   Then open the browser console and paste this script.");
}

export { runAllTests };
