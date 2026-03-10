const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const { WebhooksHelper } = require("square");

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(
	express.json({
		verify: (req, res, buf) => {
			req.rawBody = buf.toString();
		},
	}),
);

// Health check endpoint
app.get("/api/health", (req, res) => {
	res.json({
		status: "ok",
		service: "vibe-booking-payment-api",
		version: "1.0.0",
		timestamp: new Date().toISOString(),
	});
});

// Square payment endpoint
app.post("/api/payments/create", async (req, res) => {
	try {
		const { Client, Environment } = require("square");

		const client = new Client({
			accessToken: process.env.SQUARE_ACCESS_TOKEN,
			environment: Environment.Production,
		});

		const { paymentsApi } = client;
		const {
			sourceId,
			amount,
			currency = "USD",
			bookingId,
			billingAddress,
			metadata,
		} = req.body;

		if (!sourceId || !amount || !bookingId) {
			return res.status(400).json({
				success: false,
				errorMessage: "Missing required fields: sourceId, amount, or bookingId",
			});
		}

		const amountMoney = {
			amount: Math.round(amount * 100),
			currency: currency.toUpperCase(),
		};

		const requestBody = {
			sourceId,
			amountMoney,
			idempotencyKey: randomUUID(),
			locationId: process.env.SQUARE_LOCATION_ID,
			buyerEmailAddress: metadata?.email,
			billingAddress: billingAddress
				? {
						firstName: billingAddress.firstName,
						lastName: billingAddress.lastName,
						addressLine1: billingAddress.addressLine1,
						addressLine2: billingAddress.addressLine2,
						locality: billingAddress.locality,
						administrativeDistrictLevel1:
							billingAddress.administrativeDistrictLevel1,
						postalCode: billingAddress.postalCode,
						country: billingAddress.country || "US",
					}
				: undefined,
			note: `Hotel booking payment for booking ID: ${bookingId}`,
			referenceId: bookingId,
		};

		const response = await paymentsApi.createPayment(requestBody);

		if (response.result && response.result.payment) {
			const payment = response.result.payment;

			res.json({
				success: true,
				paymentId: payment.id,
				receiptUrl: payment.receiptUrl,
				status: payment.status,
				isDemoPayment: false,
			});
		} else {
			res.status(400).json({
				success: false,
				errorMessage: "Payment processing failed",
				details: response.errors || [],
			});
		}
	} catch (error) {
		console.error("Payment processing error:", error);

		res.status(500).json({
			success: false,
			errorMessage: "Payment processing error",
			details: error.message,
		});
	}
});

// Square webhook endpoint
app.post("/api/payments/webhook/square", async (req, res) => {
	const signature = req.headers["x-square-hmacsha256-signature"];
	const body = req.rawBody;
	const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
	const webhookUrl =
		process.env.SQUARE_WEBHOOK_URL ||
		`http://${req.headers.host}/api/payments/webhook/square`;

	if (!signatureKey) {
		console.error("Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
		return res
			.status(500)
			.json({ success: false, error: "Server configuration error" });
	}

	try {
		const isValid = WebhooksHelper.isValidWebhookEventSignature(
			body,
			signature,
			signatureKey,
			webhookUrl,
		);

		if (!isValid) {
			console.error("Invalid Square webhook signature");
			return res
				.status(403)
				.json({ success: false, error: "Invalid signature" });
		}

		console.log("Square webhook received and verified:", req.body);
		// Process the event here (e.g., update database)

		res.json({ success: true });
	} catch (error) {
		console.error("Error verifying webhook signature:", error);
		res.status(500).json({ success: false, error: "Verification failed" });
	}
});

// Test endpoint for Square configuration
app.get("/api/payments/config", (req, res) => {
	res.json({
		configured: !!(
			process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID
		),
		environment: "production",
		locationId: process.env.SQUARE_LOCATION_ID || "not-configured",
	});
});

// Start server
app.listen(port, () => {
	console.log(`Vibe Booking Payment API running on port ${port}`);
	console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
	console.log(
		`Square configured: ${!!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID)}`,
	);
});
