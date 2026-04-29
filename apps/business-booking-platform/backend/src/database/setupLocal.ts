import type Database from 'better-sqlite3';
import { logger } from '../utils/logger';
import {
	closeSqliteDatabase,
	getSqliteConnection,
	initializeSqliteDatabase,
} from './sqlite';

/**
 * Create all tables and indexes on the given SQLite connection.
 * Idempotent (uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
 * Used by both the CLI setup script and the test harness.
 */
export function createSqliteTables(sqlite: Database.Database): void {
	// Create users table and related tables
	sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        avatar TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        is_active INTEGER NOT NULL DEFAULT 1,
        email_verified INTEGER NOT NULL DEFAULT 0,
        email_verification_token TEXT,
        password_reset_token TEXT,
        password_reset_expires INTEGER,
        token_version INTEGER DEFAULT 0,
        preferences TEXT DEFAULT '{"currency":"USD","language":"en","notifications":{"email":true,"push":false,"sms":false}}',
        metadata TEXT DEFAULT '{}',
        last_login_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        refresh_token TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        expires_at INTEGER NOT NULL,
        refresh_expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        date_of_birth INTEGER,
        nationality TEXT,
        passport_number TEXT,
        passport_expiry INTEGER,
        loyalty_programs TEXT DEFAULT '[]',
        emergency_contact TEXT,
        travel_preferences TEXT DEFAULT '{"seatPreference":"any","mealPreference":"any","roomPreference":{"bedType":"any","floor":"any","smoking":false}}',
        saved_payment_methods TEXT DEFAULT '[]',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		// Create hotels table and related tables
		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS hotels (
        id TEXT PRIMARY KEY,
        external_id TEXT UNIQUE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        short_description TEXT,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT,
        country TEXT NOT NULL,
        postal_code TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        neighborhood TEXT,
        rating REAL NOT NULL DEFAULT 0,
        review_count INTEGER NOT NULL DEFAULT 0,
        star_rating INTEGER NOT NULL,
        price_min REAL NOT NULL,
        price_max REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        amenities TEXT NOT NULL DEFAULT '[]',
        images TEXT NOT NULL DEFAULT '[]',
        policies TEXT NOT NULL DEFAULT '{}',
        nearby_attractions TEXT DEFAULT '[]',
        phone TEXT,
        email TEXT,
        website TEXT,
        check_in_time TEXT NOT NULL DEFAULT '15:00',
        check_out_time TEXT NOT NULL DEFAULT '11:00',
        total_rooms INTEGER,
        chain_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_featured INTEGER NOT NULL DEFAULT 0,
        passion_scores TEXT DEFAULT '{}',
        search_vector TEXT,
        sustainability_score REAL,
        location_point TEXT,
        price_range TEXT,
        last_synced_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        hotel_id TEXT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
        external_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        max_occupancy INTEGER NOT NULL,
        adults INTEGER NOT NULL DEFAULT 2,
        children INTEGER NOT NULL DEFAULT 0,
        base_price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        size INTEGER,
        bed_configuration TEXT DEFAULT '[]',
        amenities TEXT DEFAULT '[]',
        images TEXT DEFAULT '[]',
        total_quantity INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS room_availability (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        date INTEGER NOT NULL,
        available INTEGER NOT NULL DEFAULT 0,
        booked INTEGER NOT NULL DEFAULT 0,
        price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        restrictions TEXT DEFAULT '{"minStay":1,"maxStay":null,"closedToArrival":false,"closedToDeparture":false}',
        last_updated INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		// Create bookings table and related tables
		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        confirmation_number TEXT NOT NULL UNIQUE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        guest_email TEXT NOT NULL,
        guest_first_name TEXT NOT NULL,
        guest_last_name TEXT NOT NULL,
        guest_phone TEXT NOT NULL,
        hotel_id TEXT NOT NULL REFERENCES hotels(id),
        room_id TEXT NOT NULL REFERENCES rooms(id),
        check_in INTEGER NOT NULL,
        check_out INTEGER NOT NULL,
        nights INTEGER NOT NULL,
        adults INTEGER NOT NULL DEFAULT 1,
        children INTEGER NOT NULL DEFAULT 0,
        room_rate REAL NOT NULL,
        taxes REAL NOT NULL,
        fees REAL NOT NULL,
        total_amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'pending',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        special_requests TEXT,
        guest_preferences TEXT DEFAULT '{}',
        is_cancellable INTEGER NOT NULL DEFAULT 1,
        cancellation_deadline INTEGER,
        cancellation_policy TEXT DEFAULT '{}',
        cancelled_at INTEGER,
        cancellation_reason TEXT,
        source TEXT DEFAULT 'website',
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS booking_status_history (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT,
        changed_by TEXT REFERENCES users(id),
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS booking_guests (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        age INTEGER,
        special_needs TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS booking_addons (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		// Create payments table and related tables
		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        user_id TEXT REFERENCES users(id),
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'pending',
        method TEXT NOT NULL,
        provider TEXT NOT NULL,
        transaction_id TEXT UNIQUE,
        reference_number TEXT,
        card_last4 TEXT,
        card_brand TEXT,
        card_exp_month TEXT,
        card_exp_year TEXT,
        three_d_secure_status TEXT,
        billing_address TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        error_code TEXT,
        error_message TEXT,
        processed_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS refunds (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'pending',
        transaction_id TEXT UNIQUE,
        reason TEXT NOT NULL,
        processed_by TEXT REFERENCES users(id),
        processed_at INTEGER,
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        token TEXT NOT NULL,
        last4 TEXT,
        brand TEXT,
        exp_month TEXT,
        exp_year TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        nickname TEXT,
        billing_address TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        last_used_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		// Create reviews table and related tables
		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        hotel_id TEXT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        booking_id TEXT REFERENCES bookings(id),
        reviewer_name TEXT NOT NULL,
        reviewer_email TEXT,
        is_verified_booking INTEGER NOT NULL DEFAULT 0,
        overall_rating REAL NOT NULL,
        cleanliness REAL,
        location REAL,
        service REAL,
        value REAL,
        comfort REAL,
        facilities REAL,
        title TEXT,
        comment TEXT NOT NULL,
        pros TEXT,
        cons TEXT,
        trip_type TEXT,
        stay_date INTEGER,
        room_type TEXT,
        images TEXT DEFAULT '[]',
        helpful_count INTEGER NOT NULL DEFAULT 0,
        not_helpful_count INTEGER NOT NULL DEFAULT 0,
        response_from_hotel TEXT,
        response_date INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        moderated_by TEXT REFERENCES users(id),
        moderated_at INTEGER,
        moderation_notes TEXT,
        sentiment TEXT,
        sentiment_score REAL,
        keywords TEXT DEFAULT '[]',
        language TEXT NOT NULL DEFAULT 'en',
        ip_address TEXT,
        user_agent TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS review_votes (
        id TEXT PRIMARY KEY,
        review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        ip_address TEXT,
        vote_type TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS review_reports (
        id TEXT PRIMARY KEY,
        review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        reported_by TEXT REFERENCES users(id),
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        resolved_by TEXT REFERENCES users(id),
        resolved_at INTEGER,
        resolution_notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

		logger.info('Creating database indexes...');

		// Create indexes for better performance
		const indexes = [
			// Users indexes
			'CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)',
			'CREATE INDEX IF NOT EXISTS users_role_idx ON users(role)',

			// Sessions indexes
			'CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)',
			'CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token)',

			// User profiles indexes
			'CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id)',

			// Hotels indexes
			'CREATE INDEX IF NOT EXISTS hotels_city_idx ON hotels(city)',
			'CREATE INDEX IF NOT EXISTS hotels_country_idx ON hotels(country)',
			'CREATE INDEX IF NOT EXISTS hotels_city_country_idx ON hotels(city, country)',
			'CREATE INDEX IF NOT EXISTS hotels_rating_idx ON hotels(rating)',
			'CREATE INDEX IF NOT EXISTS hotels_price_range_idx ON hotels(price_range)',
			'CREATE INDEX IF NOT EXISTS hotels_active_idx ON hotels(is_active)',
			'CREATE INDEX IF NOT EXISTS hotels_featured_idx ON hotels(is_featured)',
			'CREATE INDEX IF NOT EXISTS hotels_active_featured_idx ON hotels(is_active, is_featured)',
			'CREATE INDEX IF NOT EXISTS hotels_location_idx ON hotels(latitude, longitude)',
			'CREATE INDEX IF NOT EXISTS hotels_search_idx ON hotels(city, is_active, rating)',

			// Rooms indexes
			'CREATE INDEX IF NOT EXISTS rooms_hotel_id_idx ON rooms(hotel_id)',
			'CREATE INDEX IF NOT EXISTS rooms_type_idx ON rooms(type)',
			'CREATE INDEX IF NOT EXISTS rooms_price_idx ON rooms(base_price)',

			// Room availability indexes
			'CREATE INDEX IF NOT EXISTS room_availability_room_date_idx ON room_availability(room_id, date)',
			'CREATE INDEX IF NOT EXISTS room_availability_date_idx ON room_availability(date)',

			// Bookings indexes
			'CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings(user_id)',
			'CREATE INDEX IF NOT EXISTS bookings_hotel_id_idx ON bookings(hotel_id)',
			'CREATE INDEX IF NOT EXISTS bookings_room_id_idx ON bookings(room_id)',
			'CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status)',
			'CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON bookings(payment_status)',
			'CREATE INDEX IF NOT EXISTS bookings_check_in_idx ON bookings(check_in)',
			'CREATE INDEX IF NOT EXISTS bookings_check_out_idx ON bookings(check_out)',
			'CREATE INDEX IF NOT EXISTS bookings_email_idx ON bookings(guest_email)',
			'CREATE INDEX IF NOT EXISTS bookings_confirmation_idx ON bookings(confirmation_number)',

			// Booking related indexes
			'CREATE INDEX IF NOT EXISTS booking_status_history_booking_id_idx ON booking_status_history(booking_id)',
			'CREATE INDEX IF NOT EXISTS booking_guests_booking_id_idx ON booking_guests(booking_id)',
			'CREATE INDEX IF NOT EXISTS booking_addons_booking_id_idx ON booking_addons(booking_id)',

			// Payments indexes
			'CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments(booking_id)',
			'CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id)',
			'CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status)',
			'CREATE INDEX IF NOT EXISTS payments_transaction_id_idx ON payments(transaction_id)',

			// Refunds indexes
			'CREATE INDEX IF NOT EXISTS refunds_payment_id_idx ON refunds(payment_id)',
			'CREATE INDEX IF NOT EXISTS refunds_booking_id_idx ON refunds(booking_id)',
			'CREATE INDEX IF NOT EXISTS refunds_status_idx ON refunds(status)',

			// Payment methods indexes
			'CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id)',
			'CREATE INDEX IF NOT EXISTS payment_methods_type_idx ON payment_methods(type)',

			// Reviews indexes
			'CREATE INDEX IF NOT EXISTS reviews_hotel_id_idx ON reviews(hotel_id)',
			'CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews(user_id)',
			'CREATE INDEX IF NOT EXISTS reviews_booking_id_idx ON reviews(booking_id)',
			'CREATE INDEX IF NOT EXISTS reviews_status_idx ON reviews(status)',
			'CREATE INDEX IF NOT EXISTS reviews_rating_idx ON reviews(overall_rating)',
			'CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at)',

			// Review related indexes
			'CREATE INDEX IF NOT EXISTS review_votes_review_user_idx ON review_votes(review_id, user_id)',
			'CREATE INDEX IF NOT EXISTS review_votes_review_ip_idx ON review_votes(review_id, ip_address)',
			'CREATE INDEX IF NOT EXISTS review_reports_review_id_idx ON review_reports(review_id)',
			'CREATE INDEX IF NOT EXISTS review_reports_status_idx ON review_reports(status)',
		];

	for (const indexSql of indexes) {
		sqlite.exec(indexSql);
	}
}

async function setupSqliteDatabase() {
	try {
		logger.info('Starting SQLite database setup...');

		// Initialize the database connection
		await initializeSqliteDatabase();

		const sqlite = getSqliteConnection();
		// Create all tables by executing schema
		logger.info('Creating database tables...');
		createSqliteTables(sqlite);
		logger.info('Database setup completed successfully!');

		// Test the database
		const result = sqlite
			.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type=?')
			.get('table') as { count: number };
		logger.info(`Total tables created: ${result.count}`);
	} catch (error) {
		logger.error('Database setup failed:', error);
		throw error;
	} finally {
		await closeSqliteDatabase();
	}
}

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	setupSqliteDatabase()
		.then(() => {
			logger.info('SQLite database setup completed');
			process.exit(0);
		})
		.catch((error) => {
			logger.error('SQLite database setup failed:', error);
			process.exit(1);
		});
}

export { setupSqliteDatabase };
