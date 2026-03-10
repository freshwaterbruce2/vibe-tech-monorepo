// Monorepo Dashboard Backend - Direct data access via services

import cors from "cors";
import express from "express";
import {
	getBundleAnalysis,
	getBundleTrends,
	getLatestBundleSizes,
} from "./services/bundleSizeService.js";
import {
	checkConfigDrift,
	getConfigFileDrift,
} from "./services/configsService.js";
import {
	getCoverageDetails,
	getCoverageTrends,
	getLatestCoverage,
} from "./services/coverageService.js";
import {
	getDatabaseHealth,
	getDatabasesList,
} from "./services/databasesService.js";
import {
	checkDependencyUpdates,
	getVulnerabilities,
} from "./services/dependenciesService.js";
import {
	getNxCloudBuilds,
	getNxCloudPerformance,
	getNxCloudStatus,
} from "./services/nxCloudService.js";
import {
	completeSession,
	getActiveSessions,
	getDailyMetrics,
	getSessionMetrics,
	getSummaryMetrics,
	getTrialComparison,
	recordBaseline,
	recordEvent,
	scanPlanningFiles,
	startSession,
	updateSession,
} from "./services/planningMetricsService.js";
import { getServicesStatus } from "./services/servicesService.js";
import { tradingService } from "./services/tradingService.js";
import {
	auditWorkspace,
	executeActions,
	proposeActions,
} from "./services/workflowService.js";
import { getWorkspaceData } from "./services/workspaceService.js";

const app = express();
const PORT = 5177;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
	res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		services: {
			workspace: "active",
			trading: "active",
			services: "active",
			databases: "active",
			dependencies: "active",
			configs: "active",
			workflow: "active",
			coverage: "active",
			bundles: "active",
			nxCloud: "active",
			planning: "active",
		},
	});
});

// Nx Workspace endpoint
app.get("/api/workspace", async (req, res) => {
	try {
		const filter = (req.query.filter as string) || "";
		const workspace = await getWorkspaceData(filter);
		res.json(workspace);
	} catch (error: any) {
		console.error("[API] Workspace fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch workspace" });
	}
});

// Trading system endpoints
app.get("/api/trading/balance", async (_req, res) => {
	try {
		const balance = tradingService.getBalance();
		res.json(balance);
	} catch (error: any) {
		console.error("[API] Balance fetch failed:", error);
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/trading/positions", async (_req, res) => {
	try {
		const positions = tradingService.getPositions();
		res.json(positions);
	} catch (error: any) {
		console.error("[API] Positions fetch failed:", error);
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/trading/trades", async (req, res) => {
	try {
		const limit = parseInt(req.query.limit as string) || 10;
		const trades = tradingService.getTrades(limit);
		res.json(trades);
	} catch (error: any) {
		console.error("[API] Trades fetch failed:", error);
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/trading/metrics", async (_req, res) => {
	try {
		const metrics = tradingService.getMetrics();
		res.json(metrics);
	} catch (error: any) {
		console.error("[API] Metrics fetch failed:", error);
		res.status(500).json({ error: error.message });
	}
});

// Services endpoint
app.get("/api/services", async (_req, res) => {
	try {
		const services = await getServicesStatus();
		res.json(services);
	} catch (error: any) {
		console.error("[API] Services fetch failed:", error);
		res.status(500).json({ error: error.message });
	}
});

// Databases endpoint
app.get("/api/databases", async (_req, res) => {
	try {
		const databases = await getDatabasesList();
		res.json(databases);
	} catch (error: any) {
		console.error("[API] Databases fetch failed:", error);
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/databases/health", async (req, res) => {
	try {
		const dbPath = req.query.path;
		if (typeof dbPath !== "string" || dbPath.length === 0) {
			res.status(400).json({ error: "Missing required query param: path" });
			return;
		}

		const health = await getDatabaseHealth(dbPath);
		res.json(health);
	} catch (error: any) {
		console.error("[API] Database health fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to get database health" });
	}
});

// Dependencies endpoint - Check npm registry for updates
app.get("/api/dependencies/check", async (_req, res) => {
	try {
		const updates = await checkDependencyUpdates();
		res.json(updates);
	} catch (error: any) {
		console.error("[API] Dependencies check failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to check dependencies" });
	}
});

// Config drift endpoint - Check config alignment across projects
app.get("/api/configs/drift", async (_req, res) => {
	try {
		const drifts = await checkConfigDrift();
		res.json(drifts);
	} catch (error: any) {
		console.error("[API] Config drift check failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to check config drift" });
	}
});

// Config drift for specific file
app.get("/api/configs/drift/:filename", async (req, res) => {
	try {
		const filename = req.params.filename;
		const drift = await getConfigFileDrift(filename);

		if (!drift) {
			res.status(404).json({ error: `No ${filename} files found` });
			return;
		}

		res.json(drift);
	} catch (error: any) {
		console.error("[API] Config file drift check failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to check config file drift" });
	}
});

// Workflow endpoint - Comprehensive workspace audit
app.post("/api/workflow/audit", async (_req, res) => {
	try {
		const report = await auditWorkspace();
		res.json(report);
	} catch (error: any) {
		console.error("[API] Workflow audit failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to audit workspace" });
	}
});

// Workflow endpoint - Generate actionable proposals
app.post("/api/workflow/propose", async (_req, res) => {
	try {
		const proposal = await proposeActions();
		res.json(proposal);
	} catch (error: any) {
		console.error("[API] Workflow propose failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to generate proposals" });
	}
});

// Workflow endpoint - Execute approved actions
app.post("/api/workflow/execute", async (req, res) => {
	try {
		const { actionIndices } = req.body;

		if (!Array.isArray(actionIndices)) {
			res.status(400).json({ error: "actionIndices must be an array" });
			return;
		}

		const report = await executeActions(actionIndices);
		res.json(report);
	} catch (error: any) {
		console.error("[API] Workflow execute failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to execute actions" });
	}
});

// Coverage endpoints
app.get("/api/coverage/latest", async (_req, res) => {
	try {
		const coverage = await getLatestCoverage();
		res.json(coverage);
	} catch (error: any) {
		console.error("[API] Latest coverage fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch latest coverage" });
	}
});

app.get("/api/coverage/trends", async (req, res) => {
	try {
		const days = parseInt(req.query.days as string) || 30;
		const trends = await getCoverageTrends(days);
		res.json(trends);
	} catch (error: any) {
		console.error("[API] Coverage trends fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch coverage trends" });
	}
});

app.get("/api/coverage/details/:project", async (req, res) => {
	try {
		const project = req.params.project;
		const details = await getCoverageDetails(project);

		if (!details) {
			res
				.status(404)
				.json({ error: `Coverage details not found for project: ${project}` });
			return;
		}

		res.json(details);
	} catch (error: any) {
		console.error("[API] Coverage details fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch coverage details" });
	}
});

// Bundle size endpoints
app.get("/api/bundles/latest", async (_req, res) => {
	try {
		const bundles = getLatestBundleSizes();
		res.json(bundles);
	} catch (error: any) {
		console.error("[API] Latest bundle sizes fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch latest bundle sizes" });
	}
});

app.get("/api/bundles/trends", async (req, res) => {
	try {
		const days = parseInt(req.query.days as string) || 30;
		const trends = getBundleTrends(days);
		res.json(trends);
	} catch (error: any) {
		console.error("[API] Bundle trends fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch bundle trends" });
	}
});

app.get("/api/bundles/analysis/:project", async (req, res) => {
	try {
		const project = req.params.project;
		const analysis = await getBundleAnalysis(project);

		if (!analysis) {
			res
				.status(404)
				.json({ error: `Bundle analysis not found for project: ${project}` });
			return;
		}

		res.json(analysis);
	} catch (error: any) {
		console.error("[API] Bundle analysis fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch bundle analysis" });
	}
});

// Nx Cloud endpoints
app.get("/api/nx-cloud/status", async (_req, res) => {
	try {
		const status = await getNxCloudStatus();
		res.json(status);
	} catch (error: any) {
		console.error("[API] Nx Cloud status fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch Nx Cloud status" });
	}
});

app.get("/api/nx-cloud/builds", async (req, res) => {
	try {
		const limit = parseInt(req.query.limit as string) || 10;
		const builds = await getNxCloudBuilds(limit);
		res.json(builds);
	} catch (error: any) {
		console.error("[API] Nx Cloud builds fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch Nx Cloud builds" });
	}
});

app.get("/api/nx-cloud/performance", async (req, res) => {
	try {
		const days = parseInt(req.query.days as string) || 7;
		const performance = await getNxCloudPerformance(days);
		res.json(performance);
	} catch (error: any) {
		console.error("[API] Nx Cloud performance fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch Nx Cloud performance" });
	}
});

// Vulnerabilities endpoint
app.get("/api/dependencies/vulnerabilities", async (_req, res) => {
	try {
		const vulnerabilities = await getVulnerabilities();
		res.json(vulnerabilities);
	} catch (error: any) {
		console.error("[API] Vulnerabilities fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch vulnerabilities" });
	}
});

// Planning metrics endpoints
app.get("/api/planning/summary", async (_req, res) => {
	try {
		const summary = await getSummaryMetrics();
		res.json(summary);
	} catch (error: any) {
		console.error("[API] Planning summary fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch planning summary" });
	}
});

app.get("/api/planning/metrics", async (req, res) => {
	try {
		const days = parseInt(req.query.days as string) || 30;
		const project = req.query.project as string;
		const metrics = await getDailyMetrics(days, project);
		res.json(metrics);
	} catch (error: any) {
		console.error("[API] Planning metrics fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch planning metrics" });
	}
});

app.get("/api/planning/comparison", async (_req, res) => {
	try {
		const comparison = await getTrialComparison();
		res.json(comparison);
	} catch (error: any) {
		console.error("[API] Planning comparison fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch trial comparison" });
	}
});

app.get("/api/planning/sessions/active", async (_req, res) => {
	try {
		const sessions = await getActiveSessions();
		res.json(sessions);
	} catch (error: any) {
		console.error("[API] Active sessions fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch active sessions" });
	}
});

app.get("/api/planning/session/:sessionId", async (req, res) => {
	try {
		const session = await getSessionMetrics(req.params.sessionId);
		if (!session) {
			res.status(404).json({ error: "Session not found" });
			return;
		}
		res.json(session);
	} catch (error: any) {
		console.error("[API] Session fetch failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to fetch session" });
	}
});

app.post("/api/planning/session", async (req, res) => {
	try {
		const { sessionId, projectName, objective, complexity } = req.body;

		if (!sessionId || !projectName) {
			res
				.status(400)
				.json({ error: "sessionId and projectName are required" });
			return;
		}

		const session = await startSession(
			sessionId,
			projectName,
			objective || "",
			complexity || 0,
		);
		res.json(session);
	} catch (error: any) {
		console.error("[API] Session start failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to start session" });
	}
});

app.put("/api/planning/session/:sessionId", async (req, res) => {
	try {
		const updates = req.body;
		await updateSession(req.params.sessionId, updates);
		res.json({ success: true });
	} catch (error: any) {
		console.error("[API] Session update failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to update session" });
	}
});

app.put("/api/planning/session/:sessionId/complete", async (req, res) => {
	try {
		const { status } = req.body;

		if (!status || !["completed", "abandoned"].includes(status)) {
			res
				.status(400)
				.json({ error: "status must be 'completed' or 'abandoned'" });
			return;
		}

		await completeSession(req.params.sessionId, status);
		res.json({ success: true });
	} catch (error: any) {
		console.error("[API] Session completion failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to complete session" });
	}
});

app.post("/api/planning/session/:sessionId/event", async (req, res) => {
	try {
		const { eventType, eventData } = req.body;

		if (!eventType) {
			res.status(400).json({ error: "eventType is required" });
			return;
		}

		await recordEvent(req.params.sessionId, eventType, eventData || {});
		res.json({ success: true });
	} catch (error: any) {
		console.error("[API] Event recording failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to record event" });
	}
});

app.post("/api/planning/baseline", async (req, res) => {
	try {
		const { metricName, value, method, notes } = req.body;

		if (!metricName || value === undefined || !method) {
			res
				.status(400)
				.json({ error: "metricName, value, and method are required" });
			return;
		}

		await recordBaseline(metricName, value, method, notes);
		res.json({ success: true });
	} catch (error: any) {
		console.error("[API] Baseline recording failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to record baseline" });
	}
});

app.get("/api/planning/files", async (_req, res) => {
	try {
		const files = await scanPlanningFiles();
		res.json(files);
	} catch (error: any) {
		console.error("[API] Planning files scan failed:", error);
		res
			.status(500)
			.json({ error: error.message || "Failed to scan planning files" });
	}
});

// Start server
app.listen(PORT, () => {
	console.log(`[Dashboard Backend] Server running on http://localhost:${PORT}`);
	console.log(
		`[Dashboard Backend] API endpoints available at http://localhost:${PORT}/api/*`,
	);
	console.log(
		"[Dashboard Backend] Using direct data access (workspace, SQLite, PowerShell, filesystem)",
	);
	console.log("[Dashboard Backend] Server ready!");
});
