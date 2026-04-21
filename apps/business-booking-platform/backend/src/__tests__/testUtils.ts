import { eq } from "drizzle-orm";
import express from "express";
import { initializeDatabase } from "../database";
import { createSqliteTables } from "../database/setupLocal";
import * as schema from "../database/schema/sqlite";
import {
	getSqliteConnection,
	getSqliteDb,
} from "../database/sqlite";
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

let schemaReady = false;

export async function createTestApp() {
	process.env.LOCAL_SQLITE = "true";
	process.env.NODE_ENV = "test";
	// initializeDatabase() routes to SQLite when LOCAL_SQLITE=true and also sets the
	// internal `db` in database/index.ts so routes calling getDb() work in tests.
	await initializeDatabase();
	const db = getSqliteDb();
	const sqlite = getSqliteConnection();

	// Create all tables and indexes in the (in-memory) test DB exactly once per process.
	// createSqliteTables uses IF NOT EXISTS so repeated calls are safe, but skip the work.
	if (!schemaReady) {
		// Disable FK checks during DDL + parent-row seeding so we don't need to
		// fabricate every NOT NULL column on hotels/rooms. Production re-enables them.
		sqlite.pragma("foreign_keys = OFF");
		createSqliteTables(sqlite);

		// Seed minimal parent rows referenced by the booking below.
		sqlite
			.prepare(
				"INSERT OR IGNORE INTO users " +
				"(id, email, password_hash, first_name, last_name) " +
				"VALUES (?, ?, ?, ?, ?)",
			)
			.run(TEST_USER_ID, "test@example.com", "not-a-real-hash", "Test", "User");
		sqlite
			.prepare(
				"INSERT OR IGNORE INTO hotels " +
				"(id, name, slug, description, address, city, country, latitude, longitude, star_rating, price_min, price_max) " +
				"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				"hotel-1",
				"Test Hotel",
				"test-hotel",
				"Seed hotel for payments tests",
				"123 Test St",
				"Testville",
				"US",
				0,
				0,
				3,
				100,
				200,
			);
		sqlite
			.prepare(
				"INSERT OR IGNORE INTO rooms " +
				"(id, hotel_id, name, type, max_occupancy, base_price) " +
				"VALUES (?, ?, ?, ?, ?, ?)",
			)
			.run("room-1", "hotel-1", "Test Room", "standard", 2, 120);

		sqlite.pragma("foreign_keys = ON");
		schemaReady = true;
	}

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
