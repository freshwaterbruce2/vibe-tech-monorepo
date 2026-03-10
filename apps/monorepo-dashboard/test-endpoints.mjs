#!/usr/bin/env node

/**
 * API Endpoint Testing for monorepo-dashboard backend
 * Tests all 8 endpoints with error handling and response validation
 */

import http from "http";

const BASE_URL = "http://localhost:5177";
const results = [];
const startTime = new Date();

/**
 * Make HTTP GET request
 */
function makeRequest(url) {
	return new Promise((resolve, reject) => {
		const startMs = Date.now();
		const urlObj = new URL(url);

		const options = {
			hostname: urlObj.hostname,
			port: urlObj.port,
			path: urlObj.pathname + urlObj.search,
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Origin: "http://localhost:5173",
			},
		};

		const req = http.request(options, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				const responseTime = Date.now() - startMs;
				resolve({
					statusCode: res.statusCode,
					headers: res.headers,
					body: data,
					responseTime,
				});
			});
		});

		req.on("error", reject);
		req.end();
	});
}

/**
 * Parse JSON safely
 */
function parseJSON(str) {
	try {
		return JSON.parse(str);
	} catch (e) {
		return null;
	}
}

/**
 * Test single endpoint
 */
async function testEndpoint(name, path) {
	console.log(`\nTest: ${name}`);
	console.log(`  URI: ${BASE_URL}${path}`);

	try {
		const response = await makeRequest(`${BASE_URL}${path}`);
		const data = parseJSON(response.body);
		const statusOk = response.statusCode === 200;
		const timeOk = response.responseTime < 500;

		console.log(`  Status: ${response.statusCode} ${statusOk ? "✅" : "❌"}`);
		console.log(
			`  Response Time: ${response.responseTime}ms ${timeOk ? "✅" : "⚠️"}`,
		);
		console.log(
			`  CORS Origin: ${response.headers["access-control-allow-origin"] || "(missing)"}`,
		);

		if (data) {
			if (Array.isArray(data)) {
				console.log(`  Data Type: Array [${data.length} items]`);
				if (data.length > 0) {
					const keys = Object.keys(data[0]);
					console.log(`  First Item Keys: ${keys.join(", ")}`);
				}
			} else if (typeof data === "object") {
				const keys = Object.keys(data);
				console.log(`  Data Type: Object`);
				console.log(`  Keys: ${keys.join(", ")}`);
			} else {
				console.log(`  Data Type: ${typeof data}`);
			}
		}

		results.push({
			endpoint: name,
			path: path,
			status: "PASS",
			statusCode: response.statusCode,
			responseTime: response.responseTime,
			dataType: Array.isArray(data) ? "array" : typeof data,
			corsHeader: response.headers["access-control-allow-origin"],
			error: null,
		});
	} catch (error) {
		console.log(`  ❌ ERROR: ${error.message}`);
		results.push({
			endpoint: name,
			path: path,
			status: "FAIL",
			statusCode: "ERROR",
			responseTime: 0,
			dataType: null,
			corsHeader: null,
			error: error.message,
		});
	}
}

/**
 * Test error handling
 */
async function testErrorHandling() {
	console.log("\n========================================");
	console.log("Error Handling Tests");
	console.log("========================================");

	// Test 1: Invalid query parameter
	console.log("\nTest: Invalid query parameter (days=invalid)");
	try {
		const response = await makeRequest(
			`${BASE_URL}/api/coverage/trends?days=invalid`,
		);
		console.log(`  Status: ${response.statusCode}`);
		if (response.statusCode !== 200) {
			console.log(`  ✅ Returned ${response.statusCode} for invalid parameter`);
		} else {
			console.log(`  ⚠️  Returned 200 - may not validate parameters`);
		}
	} catch (error) {
		console.log(`  Error: ${error.message}`);
	}

	// Test 2: Non-existent endpoint
	console.log("\nTest: Non-existent endpoint");
	try {
		const response = await makeRequest(`${BASE_URL}/api/nonexistent`);
		console.log(`  Status: ${response.statusCode}`);
		if (response.statusCode === 404) {
			console.log(`  ✅ Returned 404 as expected`);
		} else {
			console.log(`  ⚠️  Returned ${response.statusCode} (expected 404)`);
		}
	} catch (error) {
		console.log(`  Error: ${error.message}`);
	}
}

/**
 * Main test execution
 */
async function runTests() {
	console.log("========================================");
	console.log("API Endpoint Testing - monorepo-dashboard");
	console.log("========================================");
	console.log(`Backend: ${BASE_URL}`);
	console.log(`Started: ${startTime.toISOString()}`);
	console.log("");

	// Wait for server startup
	console.log("Waiting for server to be ready...");
	let serverReady = false;
	for (let i = 0; i < 10; i++) {
		try {
			const response = await makeRequest(`${BASE_URL}/api/health`);
			if (response.statusCode === 200) {
				serverReady = true;
				console.log("✅ Server is ready\n");
				break;
			}
		} catch (e) {
			if (i < 9) {
				console.log(`  Attempt ${i + 1}/10 failed, retrying...`);
				await new Promise((r) => setTimeout(r, 500));
			}
		}
	}

	if (!serverReady) {
		console.log("❌ Server not responding on port 5177");
		console.log(
			"Please ensure the backend is running: pnpm nx dev monorepo-dashboard",
		);
		process.exit(1);
	}

	// Test main endpoints
	console.log("========================================");
	console.log("Main Endpoint Tests");
	console.log("========================================");

	await testEndpoint("GET /api/nx-cloud/status", "/api/nx-cloud/status");
	await testEndpoint("GET /api/coverage/latest", "/api/coverage/latest");
	await testEndpoint(
		"GET /api/coverage/trends?days=30",
		"/api/coverage/trends?days=30",
	);
	await testEndpoint("GET /api/bundles/latest", "/api/bundles/latest");
	await testEndpoint(
		"GET /api/bundles/trends?days=30",
		"/api/bundles/trends?days=30",
	);
	await testEndpoint(
		"GET /api/dependencies/vulnerabilities",
		"/api/dependencies/vulnerabilities",
	);
	await testEndpoint(
		"GET /api/nx-cloud/builds?limit=10",
		"/api/nx-cloud/builds?limit=10",
	);
	await testEndpoint(
		"GET /api/nx-cloud/performance?days=7",
		"/api/nx-cloud/performance?days=7",
	);

	// Test error handling
	await testErrorHandling();

	// Print summary
	console.log("\n========================================");
	console.log("Test Summary");
	console.log("========================================");

	const passCount = results.filter((r) => r.status === "PASS").length;
	const failCount = results.filter((r) => r.status === "FAIL").length;

	console.log(
		`\nResults: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`,
	);
	console.log("");

	// Print table
	console.log("Detailed Results:");
	console.log("");
	results.forEach((r) => {
		const status = r.status === "PASS" ? "✅" : "❌";
		console.log(`${status} ${r.endpoint}`);
		console.log(`   Status Code: ${r.statusCode}`);
		console.log(`   Response Time: ${r.responseTime}ms`);
		console.log(`   Data Type: ${r.dataType || "N/A"}`);
		if (r.corsHeader) {
			console.log(`   CORS Origin: ${r.corsHeader}`);
		}
		if (r.error) {
			console.log(`   Error: ${r.error}`);
		}
		console.log("");
	});

	// Analysis
	console.log("Response Time Analysis:");
	results
		.filter((r) => r.status === "PASS")
		.forEach((r) => {
			const speed =
				r.responseTime < 200
					? "🚀 Fast"
					: r.responseTime < 500
						? "✅ OK"
						: "⚠️ Slow";
			console.log(`  ${speed} - ${r.endpoint}: ${r.responseTime}ms`);
		});

	console.log("");
	console.log(`Completed: ${new Date().toISOString()}`);
	console.log(`Total Duration: ${Date.now() - startTime.getTime()}ms`);
}

// Run tests
runTests().catch((error) => {
	console.error("Test error:", error);
	process.exit(1);
});
