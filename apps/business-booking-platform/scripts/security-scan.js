#!/usr/bin/env node

import { exec } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Security scan configuration
const SECURITY_CHECKS = {
	dependencies: {
		name: "Dependency Vulnerability Scan",
		critical: true,
		commands: ["npm audit --production", "npm audit"],
	},
	secrets: {
		name: "Secret Detection",
		critical: true,
		patterns: [
			/api[_-]?key/i,
			/secret[_-]?key/i,
			/password/i,
			/token/i,
			/private[_-]?key/i,
			/client[_-]?secret/i,
			/auth[_-]?token/i,
		],
		excludePaths: [
			"node_modules",
			"dist",
			"coverage",
			".git",
			"*.test.js",
			"*.test.ts",
			"*.spec.js",
			"*.spec.ts",
		],
	},
	headers: {
		name: "Security Headers Check",
		critical: false,
		headers: [
			"Strict-Transport-Security",
			"X-Content-Type-Options",
			"X-Frame-Options",
			"X-XSS-Protection",
			"Content-Security-Policy",
			"Referrer-Policy",
			"Permissions-Policy",
		],
	},
	owasp: {
		name: "OWASP Security Checks",
		critical: true,
		checks: [
			"SQL Injection",
			"XSS",
			"CSRF",
			"Insecure Direct Object References",
			"Security Misconfiguration",
			"Sensitive Data Exposure",
			"Missing Function Level Access Control",
			"Using Components with Known Vulnerabilities",
			"Unvalidated Redirects and Forwards",
		],
	},
};

// ANSI color codes
const colors = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	reset: "\x1b[0m",
};

// Logger utility
const log = {
	error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
	success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
	warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
	info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
	section: (msg) =>
		console.log(`\n${colors.blue}=== ${msg} ===${colors.reset}\n`),
};

// Security scan functions
async function scanDependencies() {
	log.section(SECURITY_CHECKS.dependencies.name);

	try {
		const { stdout: auditOutput } = await execAsync("npm audit --json");
		const auditData = JSON.parse(auditOutput);

		if (auditData.metadata.vulnerabilities.total === 0) {
			log.success("No vulnerabilities found in dependencies");
			return { passed: true, vulnerabilities: 0 };
		}

		const { vulnerabilities } = auditData.metadata;
		log.warning(`Found ${vulnerabilities.total} vulnerabilities:`);
		log.info(`  Critical: ${vulnerabilities.critical}`);
		log.info(`  High: ${vulnerabilities.high}`);
		log.info(`  Moderate: ${vulnerabilities.moderate}`);
		log.info(`  Low: ${vulnerabilities.low}`);

		// Fail on critical or high vulnerabilities
		if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
			log.error("Critical or high vulnerabilities found!");
			return {
				passed: false,
				vulnerabilities: vulnerabilities.critical + vulnerabilities.high,
			};
		}

		return { passed: true, vulnerabilities: vulnerabilities.total };
	} catch (error) {
		log.error(`Dependency scan failed: ${error.message}`);
		return { passed: false, error: error.message };
	}
}

async function scanForSecrets() {
	log.section(SECURITY_CHECKS.secrets.name);

	try {
		// Use git to get all tracked files
		const { stdout: fileList } = await execAsync("git ls-files");
		const files = fileList
			.trim()
			.split("\n")
			.filter((file) => {
				// Check if file should be excluded
				return !SECURITY_CHECKS.secrets.excludePaths.some((pattern) => {
					if (pattern.includes("*")) {
						return file.endsWith(pattern.replace("*", ""));
					}
					return file.includes(pattern);
				});
			});

		let secretsFound = 0;
		const detectedSecrets = [];

		for (const file of files) {
			try {
				const content = await readFile(path.join(process.cwd(), file), "utf-8");
				const lines = content.split("\n");

				lines.forEach((line, index) => {
					SECURITY_CHECKS.secrets.patterns.forEach((pattern) => {
						if (pattern.test(line)) {
							// Check if it's a false positive
							const lowerLine = line.toLowerCase();
							const falsePositives = [
								"example",
								"placeholder",
								"your-",
								"xxx",
								"todo",
								"fixme",
								"mock",
								"test",
								"demo",
							];

							if (!falsePositives.some((fp) => lowerLine.includes(fp))) {
								secretsFound++;
								detectedSecrets.push({
									file,
									line: index + 1,
									pattern: pattern.toString(),
									content: line.trim().substring(0, 80) + "...",
								});
							}
						}
					});
				});
			} catch (error) {
				// Skip files that can't be read
			}
		}

		if (secretsFound === 0) {
			log.success("No secrets or sensitive data found");
			return { passed: true, secrets: 0 };
		}

		log.error(`Found ${secretsFound} potential secrets:`);
		detectedSecrets.forEach((secret) => {
			log.warning(`  ${secret.file}:${secret.line} - ${secret.content}`);
		});

		return { passed: false, secrets: secretsFound };
	} catch (error) {
		log.error(`Secret scan failed: ${error.message}`);
		return { passed: false, error: error.message };
	}
}

async function checkSecurityHeaders() {
	log.section(SECURITY_CHECKS.headers.name);

	try {
		// Read server configuration
		const serverPath = path.join(
			process.cwd(),
			"build-website-example/server/server.js",
		);
		const serverContent = await readFile(serverPath, "utf-8");

		const missingHeaders = [];

		SECURITY_CHECKS.headers.headers.forEach((header) => {
			if (!serverContent.includes(header)) {
				missingHeaders.push(header);
			}
		});

		if (missingHeaders.length === 0) {
			log.success("All security headers are configured");
			return { passed: true, headers: SECURITY_CHECKS.headers.headers.length };
		}

		log.warning(`Missing ${missingHeaders.length} security headers:`);
		missingHeaders.forEach((header) => {
			log.info(`  - ${header}`);
		});

		return { passed: true, missingHeaders: missingHeaders.length }; // Non-critical
	} catch (error) {
		log.warning(`Security headers check skipped: ${error.message}`);
		return { passed: true, skipped: true };
	}
}

async function runOWASPChecks() {
	log.section(SECURITY_CHECKS.owasp.name);

	const checks = {
		"SQL Injection": async () => {
			// Check for raw SQL queries
			const { stdout } = await execAsync(
				'grep -r "SELECT\\|INSERT\\|UPDATE\\|DELETE" src/ || true',
			);
			return stdout.trim().length === 0;
		},
		XSS: async () => {
			// Check for dangerouslySetInnerHTML
			const { stdout } = await execAsync(
				'grep -r "dangerouslySetInnerHTML" src/ || true',
			);
			return stdout.trim().length === 0;
		},
		CSRF: async () => {
			// Check for CSRF protection
			const { stdout } = await execAsync('grep -r "csrf\\|xsrf" src/ || true');
			return stdout.trim().length > 0;
		},
	};

	const results = {
		passed: true,
		checks: {},
	};

	for (const [checkName, checkFn] of Object.entries(checks)) {
		try {
			const passed = await checkFn();
			results.checks[checkName] = passed;
			if (passed) {
				log.success(`${checkName} check passed`);
			} else {
				log.warning(`${checkName} check needs review`);
				results.passed = false;
			}
		} catch (error) {
			log.warning(`${checkName} check skipped: ${error.message}`);
			results.checks[checkName] = null;
		}
	}

	return results;
}

// Main execution
async function main() {
	console.log("\n🔒 Running Security Scans for Hotel Booking Application\n");

	const results = {
		dependencies: await scanDependencies(),
		secrets: await scanForSecrets(),
		headers: await checkSecurityHeaders(),
		owasp: await runOWASPChecks(),
	};

	// Summary
	log.section("Security Scan Summary");

	let totalPassed = 0;
	let totalFailed = 0;

	Object.entries(results).forEach(([check, result]) => {
		if (result.passed) {
			totalPassed++;
			log.success(`${check}: PASSED`);
		} else {
			totalFailed++;
			log.error(`${check}: FAILED`);
		}
	});

	console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);

	// Exit with error if any critical checks failed
	if (totalFailed > 0) {
		process.exit(1);
	}
}

// Run the security scan
main().catch((error) => {
	log.error(`Security scan error: ${error.message}`);
	process.exit(1);
});
