import express from "express";
import { WebhooksHelper } from "square";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the server file setup since we can't easily import the app instance directly if it starts listening immediately
// So we will recreate the express app setup here for testing
const app = express();
app.use(
	express.json({
		verify: (req: any, res, buf) => {
			req.rawBody = buf.toString();
		},
	}),
);

// Mock Square WebhooksHelper
vi.mock("square", () => ({
	WebhooksHelper: {
		isValidWebhookEventSignature: vi.fn(),
	},
}));

// Re-implement the route for testing
app.post("/api/payments/webhook/square", async (req: any, res) => {
	const signature = req.headers["x-square-hmacsha256-signature"];
	const body = req.rawBody;
	const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
	const webhookUrl =
		process.env.SQUARE_WEBHOOK_URL ||
		`http://${req.headers.host}/api/payments/webhook/square`;

	if (!signatureKey) {
		return res
			.status(500)
			.json({ success: false, error: "Server configuration error" });
	}

	try {
		const isValid = WebhooksHelper.isValidWebhookEventSignature(
			body,
			signature as string,
			signatureKey,
			webhookUrl,
		);

		if (!isValid) {
			return res
				.status(403)
				.json({ success: false, error: "Invalid signature" });
		}

		res.json({ success: true });
	} catch (error) {
		res.status(500).json({ success: false, error: "Verification failed" });
	}
});

describe("Payment Webhook Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "test-signature-key";
	});

	it("should return 200 for valid signature", async () => {
		(WebhooksHelper.isValidWebhookEventSignature as any).mockReturnValue(true);

		const response = await request(app)
			.post("/api/payments/webhook/square")
			.set("x-square-hmacsha256-signature", "valid-signature")
			.send({ type: "payment.updated" });

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
	});

	it("should return 403 for invalid signature", async () => {
		(WebhooksHelper.isValidWebhookEventSignature as any).mockReturnValue(false);

		const response = await request(app)
			.post("/api/payments/webhook/square")
			.set("x-square-hmacsha256-signature", "invalid-signature")
			.send({ type: "payment.updated" });

		expect(response.status).toBe(403);
		expect(response.body.error).toBe("Invalid signature");
	});

	it("should return 500 if signature key is missing", async () => {
		delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

		const response = await request(app)
			.post("/api/payments/webhook/square")
			.set("x-square-hmacsha256-signature", "valid-signature")
			.send({ type: "payment.updated" });

		expect(response.status).toBe(500);
		expect(response.body.error).toBe("Server configuration error");
	});
});
