import { vi } from "vitest";

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.LOCAL_SQLITE = "true";
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
