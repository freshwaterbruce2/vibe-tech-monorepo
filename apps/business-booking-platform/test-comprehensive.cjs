// Comprehensive test script for the hotel booking application
const https = require("https");
const http = require("http");

const tests = {
	passed: 0,
	failed: 0,
	results: [],
};

function log(message, type = "info") {
	const symbols = {
		info: "ℹ️",
		success: "✅",
		error: "❌",
		warning: "⚠️",
	};
	console.log(`${symbols[type]} ${message}`);
}

async function fetchUrl(url, isLocal = true) {
	return new Promise((resolve, reject) => {
		const protocol = isLocal ? http : https;
		const options = url.startsWith("http")
			? url
			: isLocal
				? `http://localhost:3009${url}`
				: url;

		protocol
			.get(options, (res) => {
				let data = "";
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () =>
					resolve({ status: res.statusCode, data, headers: res.headers }),
				);
			})
			.on("error", reject);
	});
}

async function runTests() {
	console.log(
		"\n=== HOTEL BOOKING APPLICATION - COMPREHENSIVE TEST SUITE ===\n",
	);

	// Test 1: Frontend Server
	log("Testing Frontend Server...", "info");
	try {
		const response = await fetchUrl("/");
		if (response.status === 200) {
			tests.passed++;
			log("Frontend server is running", "success");
		} else {
			tests.failed++;
			log(`Frontend returned status ${response.status}`, "error");
		}
	} catch (error) {
		tests.failed++;
		log("Frontend server is not accessible", "error");
	}

	// Test 2: Backend Server
	log("\nTesting Backend Server...", "info");
	try {
		const response = await fetchUrl("http://localhost:3001/api/health", true);
		if (response.status === 200) {
			const data = JSON.parse(response.data);
			tests.passed++;
			log(`Backend is running in ${data.mode} mode`, "success");
		} else {
			tests.failed++;
			log(`Backend returned status ${response.status}`, "error");
		}
	} catch (error) {
		tests.failed++;
		log("Backend server is not accessible", "error");
	}

	// Test 3: Check all routes
	log("\nTesting Routes...", "info");
	const routes = [
		"/",
		"/destinations",
		"/deals",
		"/experiences",
		"/rewards",
		"/search",
	];

	for (const route of routes) {
		try {
			const response = await fetchUrl(route);
			if (response.status === 200) {
				tests.passed++;
				log(`Route ${route} is accessible`, "success");
			} else {
				tests.failed++;
				log(`Route ${route} returned status ${response.status}`, "error");
			}
		} catch (error) {
			tests.failed++;
			log(`Route ${route} failed: ${error.message}`, "error");
		}
	}

	// Test 4: API Endpoints
	log("\nTesting API Endpoints...", "info");
	const apiEndpoints = [
		"/api/health",
		"/api/hotels/search?destination=New York",
		"/api/ai/search",
	];

	for (const endpoint of apiEndpoints) {
		try {
			const response = await fetchUrl(`http://localhost:3001${endpoint}`, true);
			if (response.status === 200 || response.status === 201) {
				tests.passed++;
				log(`API ${endpoint} is working`, "success");
			} else {
				tests.failed++;
				log(`API ${endpoint} returned status ${response.status}`, "warning");
			}
		} catch (error) {
			tests.failed++;
			log(`API ${endpoint} failed: ${error.message}`, "error");
		}
	}

	// Test 5: Check for critical assets
	log("\nTesting Assets...", "info");
	const assets = ["/icon.svg", "/manifest.json"];

	for (const asset of assets) {
		try {
			const response = await fetchUrl(asset);
			if (response.status === 200) {
				tests.passed++;
				log(`Asset ${asset} is available`, "success");
			} else {
				tests.failed++;
				log(`Asset ${asset} returned status ${response.status}`, "warning");
			}
		} catch (error) {
			tests.failed++;
			log(`Asset ${asset} failed: ${error.message}`, "error");
		}
	}

	// Test 6: Check external image loading
	log("\nTesting External Images...", "info");
	const imageUrls = [
		"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
		"https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&h=600&fit=crop",
	];

	for (const imageUrl of imageUrls) {
		try {
			const response = await fetchUrl(imageUrl, false);
			if (response.status === 200) {
				tests.passed++;
				log(`External image is accessible`, "success");
			} else {
				tests.failed++;
				log(`Image returned status ${response.status}`, "warning");
			}
		} catch (error) {
			tests.failed++;
			log(`Image failed: ${error.message}`, "error");
		}
	}

	// Summary
	console.log("\n=== TEST SUMMARY ===\n");
	console.log(`✅ Passed: ${tests.passed}`);
	console.log(`❌ Failed: ${tests.failed}`);
	console.log(`📊 Total: ${tests.passed + tests.failed}`);
	console.log(
		`🎯 Success Rate: ${Math.round((tests.passed / (tests.passed + tests.failed)) * 100)}%`,
	);

	// Recommendations
	console.log("\n=== RECOMMENDATIONS ===\n");

	if (tests.failed === 0) {
		log(
			"All tests passed! The application is functioning correctly.",
			"success",
		);
	} else {
		log("Some tests failed. Please review the errors above.", "warning");

		console.log("\nChecklist of items to verify:");
		console.log("1. ✓ TypeScript compilation (no errors)");
		console.log("2. ✓ Frontend server running on port 3009");
		console.log("3. ✓ Backend server running on port 3001");
		console.log("4. ✓ All routes are accessible");
		console.log("5. ✓ API endpoints are responding");
		console.log("6. ✓ External images are loading");
		console.log("7. ✓ Database connection established");
		console.log("8. ✓ Environment variables configured");
	}

	// Visual consistency check
	console.log("\n=== VISUAL CONSISTENCY CHECKLIST ===\n");
	console.log("Please manually verify:");
	console.log("□ Header is uniform across all pages");
	console.log("□ Typography is consistent (Inter + Playfair Display)");
	console.log("□ Color scheme is uniform (gray-900 primary)");
	console.log("□ Buttons follow the same style pattern");
	console.log("□ Spacing is consistent (8pt grid)");
	console.log("□ Mobile menu works correctly");
	console.log("□ Search functionality opens/closes properly");
	console.log("□ Images have proper fallbacks");
	console.log("□ Hover states are consistent");
	console.log("□ Transitions are smooth (200-300ms)");

	// Accessibility check
	console.log("\n=== ACCESSIBILITY CHECKLIST ===\n");
	console.log("□ Keyboard navigation works");
	console.log("□ Focus states are visible");
	console.log("□ Color contrast meets WCAG AA standards");
	console.log("□ All images have alt text");
	console.log("□ ARIA labels are present");
	console.log("□ Semantic HTML is used");
	console.log("□ Screen reader compatible");

	// Performance check
	console.log("\n=== PERFORMANCE METRICS ===\n");
	console.log("Target benchmarks:");
	console.log("• First Contentful Paint: < 1.8s");
	console.log("• Time to Interactive: < 3.9s");
	console.log("• Bundle size: < 500KB");
	console.log("• Lighthouse score: > 90");
}

// Run the tests
runTests().catch(console.error);
