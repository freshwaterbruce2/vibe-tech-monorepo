// Run with: node --expose-gc scripts/memory-leak-detector.js

import fs from "fs";
import { performance } from "perf_hooks";

console.log("Memory Leak Detector - Nova Agent");
console.log("Testing for 30 minutes...\n");

const measurements = [];
const interval = 5000; // 5 seconds

function measureMemory() {
	if (global.gc) global.gc();

	const usage = process.memoryUsage();
	const timestamp = new Date().toISOString();

	measurements.push({
		timestamp,
		heapUsed: usage.heapUsed / 1024 / 1024, // MB
		heapTotal: usage.heapTotal / 1024 / 1024,
		rss: usage.rss / 1024 / 1024,
		external: usage.external / 1024 / 1024,
	});

	const latest = measurements[measurements.length - 1];
	console.log(
		`[${timestamp}] Heap: ${latest.heapUsed.toFixed(2)} MB | RSS: ${latest.rss.toFixed(2)} MB`,
	);

	// Check for leak (heap growing consistently)
	if (measurements.length >= 10) {
		const recent = measurements.slice(-10);
		const avg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
		const first = recent[0].heapUsed;
		const growth = avg - first;

		if (growth > 50) {
			// 50 MB growth in 50 seconds
			console.warn(
				`⚠️ Potential memory leak detected! Growth: ${growth.toFixed(2)} MB`,
			);
		}
	}
}

// Test for 30 minutes
const duration = 30 * 60 * 1000; // 30 minutes
const end = Date.now() + duration;

const timer = setInterval(() => {
	measureMemory();

	if (Date.now() >= end) {
		clearInterval(timer);
		console.log("\nTest complete!");
		console.log(`Total measurements: ${measurements.length}`);
		console.log("Results saved to memory-leak-report.json");

		fs.writeFileSync(
			"memory-leak-report.json",
			JSON.stringify(measurements, null, 2),
		);
	}
}, interval);

// Initial measurement
measureMemory();
