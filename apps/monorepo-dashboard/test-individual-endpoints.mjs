#!/usr/bin/env node

/**
 * Individual endpoint testing
 */

import http from "http";

const BASE_URL = "http://localhost:5177";

function makeRequest(url) {
	return new Promise((resolve, reject) => {
		const startMs = Date.now();
		const urlObj = new URL(url);

		const options = {
			hostname: urlObj.hostname,
			port: urlObj.port,
			path: urlObj.pathname + urlObj.search,
			method: "GET",
			timeout: 5000,
		};

		const req = http.request(options, (res) => {
			let data = "";
			res.on("data", (chunk) => {
				data += chunk;
			});
			res.on("end", () => {
				const responseTime = Date.now() - startMs;
				resolve({ statusCode: res.statusCode, body: data, responseTime });
			});
		});

		req.on("error", reject);
		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Request timeout"));
		});
		req.end();
	});
}

async function test(name, path) {
	try {
		const response = await makeRequest(`${BASE_URL}${path}`);
		const data = JSON.parse(response.body);
		console.log(`✅ ${name}`);
		console.log(
			`   Status: ${response.statusCode}, Time: ${response.responseTime}ms, Type: ${Array.isArray(data) ? "Array" : typeof data}`,
		);
	} catch (error) {
		console.log(`❌ ${name}`);
		console.log(`   Error: ${error.message}`);
	}
}

async function main() {
	console.log("Testing Individual Endpoints\n");

	await test("GET /api/nx-cloud/status", "/api/nx-cloud/status");
	await test("GET /api/coverage/latest", "/api/coverage/latest");
	await test(
		"GET /api/coverage/trends?days=30",
		"/api/coverage/trends?days=30",
	);
	await test("GET /api/bundles/latest", "/api/bundles/latest");
	await test("GET /api/bundles/trends?days=30", "/api/bundles/trends?days=30");
	await test(
		"GET /api/dependencies/vulnerabilities",
		"/api/dependencies/vulnerabilities",
	);
	await test(
		"GET /api/nx-cloud/builds?limit=10",
		"/api/nx-cloud/builds?limit=10",
	);
	await test(
		"GET /api/nx-cloud/performance?days=7",
		"/api/nx-cloud/performance?days=7",
	);

	console.log("\nDone!");
}

main();
