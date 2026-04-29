import { vi } from "vitest";

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.LOCAL_SQLITE = "true";
// Force in-memory SQLite for tests (never touch D:\databases\ or disk).
// Must be set BEFORE src/config/sqlite.ts is imported (it reads DATABASE_URL at module load).
process.env.DATABASE_URL = ":memory:";
process.env.SMTP_HOST = "localhost";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "test@example.com";
process.env.SMTP_PASS = "password";
process.env.OPENAI_API_KEY = "test-key";
process.env.JWT_SECRET = "test-jwt-secret-for-testing-purposes-only";
process.env.STRIPE_SECRET_KEY = "sk_test_fake_for_unit_tests";
process.env.SQUARE_ACCESS_TOKEN = "test-square-token";

// Mock nodemailer
vi.mock("nodemailer", () => ({
	default: {
		createTransport: vi.fn(() => ({
			sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
			verify: vi.fn().mockResolvedValue(true),
		})),
	},
}));

// Mock OpenAI
vi.mock("openai", () => ({
	OpenAI: vi.fn(() => ({
		chat: {
			completions: {
				create: vi.fn().mockResolvedValue({
					choices: [{ message: { content: "Test AI response" } }],
				}),
			},
		},
	})),
}));

// Mock Redis
vi.mock("ioredis", () => ({
	Redis: vi.fn(() => ({
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue("OK"),
		del: vi.fn().mockResolvedValue(1),
		on: vi.fn(),
	})),
}));

// Mock Puppeteer
vi.mock("puppeteer", () => ({
	default: {
		launch: vi.fn().mockResolvedValue({
			newPage: vi.fn().mockResolvedValue({
				setContent: vi.fn(),
				pdf: vi.fn().mockResolvedValue(Buffer.from("fake pdf")),
				close: vi.fn(),
			}),
			close: vi.fn(),
		}),
	},
}));

// When running under LOCAL_SQLITE (tests), the production code imports the Postgres
// schema from ../database/schema (pgTable/jsonb/numeric) but the live DB is SQLite.
// Re-export the SQLite schema instead so Drizzle emits SQLite-compatible SQL.
// Paths are relative to files under src/services (and src/routes which has same depth).
vi.mock("../database/schema", async () => {
	return await import("../database/schema/sqlite");
});
vi.mock("../../database/schema", async () => {
	return await import("../database/schema/sqlite");
});

// Mock JWT auth middleware so protected routes (mounted via apiRouter) pass through
// using the test user attached by testUtils.mockAuth upstream. Each exported helper
// is replaced with a pass-through that preserves (or sets) a default req.user.
vi.mock("../middleware/authenticate", () => {
	const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
	const defaultUser = {
		id: TEST_USER_ID,
		email: "test@example.com",
		firstName: "Test",
		lastName: "User",
		role: "user",
		isAdmin: false,
	};
	const passthrough = (req: any, _res: any, next: any) => {
		if (!req.user) req.user = defaultUser;
		next();
	};
	return {
		authenticate: passthrough,
		optionalAuthenticate: passthrough,
		requireAdmin: passthrough,
		requireRole: () => passthrough,
		createUserRateLimit: () => passthrough,
	};
});

// Mock Square SDK (v44+ API: SquareClient / SquareEnvironment)
vi.mock("square", () => {
	class SquareClient {
		payments = {
			create: vi.fn().mockResolvedValue({
				payment: {
					id: "test-payment-id",
					status: "COMPLETED",
					orderId: "test-order-id",
					receiptUrl: "https://squareup.com/receipt/test",
					cardDetails: {
						card: { last4: "1111", cardBrand: "VISA" },
					},
					amountMoney: { amount: 15000n, currency: "USD" },
				},
			}),
			get: vi.fn().mockResolvedValue({
				payment: {
					id: "test-payment-id",
					status: "COMPLETED",
					amountMoney: { amount: 15000n, currency: "USD" },
				},
			}),
		};
		refunds = {
			refundPayment: vi.fn().mockResolvedValue({
				refund: { id: "test-refund-id", status: "PENDING" },
			}),
		};
		cards = {
			create: vi.fn().mockResolvedValue({
				card: { id: "test-card-id", last4: "1111", cardBrand: "VISA" },
			}),
		};
		customers = {
			create: vi.fn().mockResolvedValue({
				customer: { id: "test-customer-id" },
			}),
		};
		constructor(_opts?: unknown) {}
	}
	return {
		SquareClient,
		SquareEnvironment: {
			Sandbox: "sandbox",
			Production: "production",
		},
	};
});

// Suppress console logs during tests unless needed
if (process.env.VITEST_VERBOSE !== "true") {
	vi.spyOn(console, "log").mockImplementation(() => {});
	vi.spyOn(console, "info").mockImplementation(() => {});
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
}
