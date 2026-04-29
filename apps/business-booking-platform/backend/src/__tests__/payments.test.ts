import { eq } from "drizzle-orm";
import request from "supertest"; // This line is already correct and imports 'supertest'
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../database/schema/sqlite";
import { getSqliteDb } from "../database/sqlite";
import { createTestApp, TEST_BOOKING_ID } from "./testUtils";

let app: any;

beforeAll(async () => {
	const { app: createdApp } = await createTestApp();
	app = createdApp;
});

describe("Square payment create + idempotency", () => {
	it("creates a payment then returns existing on second attempt", async () => {
		// First create
		const first = await request(app).post("/api/payments/create").send({
			bookingId: TEST_BOOKING_ID,
			sourceId: "cnon:card-nonce-ok",
			amount: 150,
			currency: "USD",
		});
		expect(first.status).toBe(200);
		expect(first.body.success).toBe(true);

		const firstPaymentId = first.body.paymentId;
		expect(firstPaymentId).toBeTruthy();

		// Simulate DB marking succeeded (since Square API not actually invoked)
		const db = getSqliteDb();
		await db
			.update(schema.payments)
			.set({ status: "succeeded" })
			.where(eq(schema.payments.transactionId, firstPaymentId));

		// Second attempt should return existing
		const second = await request(app).post("/api/payments/create").send({
			bookingId: TEST_BOOKING_ID,
			sourceId: "cnon:card-nonce-ok",
			amount: 150,
			currency: "USD",
		});
		expect(second.status).toBe(200);
		expect(second.body.message).toMatch(/already completed/i);
	});
});

describe("PayPal simulated order + capture", () => {
	it("creates an order then captures it updating payment status", async () => {
		const originalSimulationFlag = process.env.PAYPAL_ENABLE_SIMULATED;
		process.env.PAYPAL_ENABLE_SIMULATED = "true";

		try {
			const orderRes = await request(app)
				.post("/api/payments/paypal/order")
				.send({ bookingId: TEST_BOOKING_ID, amount: 99, currency: "USD" });
			expect(orderRes.status).toBe(200);
			expect(orderRes.body.orderId).toBeTruthy();
			const { orderId } = orderRes.body;

			const captureRes = await request(app)
				.post("/api/payments/paypal/capture")
				.send({ orderId });
			expect(captureRes.status).toBe(200);
			expect(captureRes.body.success).toBe(true);

			const db = getSqliteDb();
			const payment = await db
				.select()
				.from(schema.payments)
				.where(eq(schema.payments.transactionId, orderId));
			const [capturedPayment] = payment;
			expect(capturedPayment).toBeDefined();
			expect(capturedPayment!.status).toBe("succeeded");
		} finally {
			process.env.PAYPAL_ENABLE_SIMULATED = originalSimulationFlag;
		}
	});
});

describe("Stats endpoint aggregates revenue", () => {
	it("returns numeric stats", async () => {
		const res = await request(app).get("/api/payments/stats");
		expect(res.status).toBe(200);
		expect(res.body.data).toHaveProperty("totalRevenue");
	});
});
