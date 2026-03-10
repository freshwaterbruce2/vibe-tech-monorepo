import { eq } from "drizzle-orm";
import express from "express";
import * as schema from "../database/schema/sqlite";
import { getSqliteDb, initializeSqliteDatabase } from "../database/sqlite";
import { apiRouter } from "../routes";

// Constants for seeding
export const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
export const TEST_BOOKING_ID = "22222222-2222-4222-8222-222222222222";

// Mock auth middleware attaches a fixed user
import type { NextFunction, Request, Response } from "express";

function mockAuth(req: Request, _res: Response, next: NextFunction) {

	(req as any).user = {
		id: TEST_USER_ID,
		email: "test@example.com",
		firstName: "Test",
		lastName: "User",
		role: "user",
		isAdmin: false,
	};
	next();
}

export async function createTestApp() {
	process.env.LOCAL_SQLITE = "true";
	process.env.NODE_ENV = "test";
	await initializeSqliteDatabase();
	const db = getSqliteDb();

	// Seed booking if missing
	const existing = await db
		.select()
		.from(schema.bookings)
		.where(eq(schema.bookings.id, TEST_BOOKING_ID));
	if (!existing.length) {
		await db.insert(schema.bookings).values({
			id: TEST_BOOKING_ID,
			confirmationNumber: "CONFTEST123",
			userId: TEST_USER_ID,
			guestEmail: "test@example.com",
			guestFirstName: "Test",
			guestLastName: "User",
			guestPhone: "+10000000000",
			hotelId: "hotel-1",
			roomId: "room-1",
			checkIn: new Date(),
			checkOut: new Date(Date.now() + 86400000),
			nights: 1,
			roomRate: 120,
			taxes: 20,
			fees: 10,
			totalAmount: 150,
			currency: "USD",
			status: "pending",
			paymentStatus: "pending",
		});
	}

	const app = express();
	app.use("/api/payments/webhook/square", express.raw({ type: "*/*" }));
	app.use(express.json());
	app.use(mockAuth); // must precede apiRouter to satisfy auth-protected routes
	app.use("/api", apiRouter);
	return { app, db };
}
