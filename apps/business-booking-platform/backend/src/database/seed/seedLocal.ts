import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';
import {
	closeSqliteDatabase,
	getSqliteConnection,
	initializeSqliteDatabase,
} from '../sqlite';

async function seedSqliteDatabase() {
	try {
		logger.info('Starting SQLite database seeding...');

		// Initialize the database connection
		await initializeSqliteDatabase();
		const sqlite = getSqliteConnection();

		// Create sample users
		logger.info('Seeding users...');
		const adminPasswordHash = await bcrypt.hash('admin123', 12);
		const userPasswordHash = await bcrypt.hash('password123', 12);

		const users = [
			{
				id: crypto.randomUUID(),
				email: 'admin@hotelbooking.com',
				passwordHash: adminPasswordHash,
				firstName: 'Admin',
				lastName: 'User',
				role: 'admin',
				isActive: 1,
				emailVerified: 1,
				phone: '+1-555-0100',
			},
			{
				id: crypto.randomUUID(),
				email: 'john.doe@example.com',
				passwordHash: userPasswordHash,
				firstName: 'John',
				lastName: 'Doe',
				role: 'user',
				isActive: 1,
				emailVerified: 1,
				phone: '+1-555-0101',
			},
			{
				id: crypto.randomUUID(),
				email: 'jane.smith@example.com',
				passwordHash: userPasswordHash,
				firstName: 'Jane',
				lastName: 'Smith',
				role: 'user',
				isActive: 1,
				emailVerified: 1,
				phone: '+1-555-0102',
			},
		];
		const primaryUser = users[1]!;

		const insertUser = sqlite.prepare(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, 
        is_active, email_verified, phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		for (const user of users) {
			insertUser.run(
				user.id,
				user.email,
				user.passwordHash,
				user.firstName,
				user.lastName,
				user.role,
				user.isActive,
				user.emailVerified,
				user.phone,
				Math.floor(Date.now() / 1000),
				Math.floor(Date.now() / 1000),
			);
		}

		// Create sample hotels
		logger.info('Seeding hotels...');
		const hotels = [
			{
				id: crypto.randomUUID(),
				externalId: 'hotel_001',
				name: 'Grand Palace Hotel',
				slug: 'grand-palace-hotel',
				description:
					'A luxurious 5-star hotel in the heart of the city, offering world-class amenities and exceptional service.',
				shortDescription: 'Luxury 5-star hotel with premium amenities',
				address: '123 Grand Avenue',
				city: 'New York',
				state: 'NY',
				country: 'US',
				postalCode: '10001',
				latitude: 40.7128,
				longitude: -74.006,
				neighborhood: 'Midtown',
				rating: 4.8,
				reviewCount: 1247,
				starRating: 5,
				priceMin: 299.0,
				priceMax: 899.0,
				currency: 'USD',
				amenities: JSON.stringify([
					'wifi',
					'parking',
					'pool',
					'spa',
					'restaurant',
					'bar',
					'gym',
					'concierge',
				]),
				images: JSON.stringify([
					'/images/hotel1-1.jpg',
					'/images/hotel1-2.jpg',
					'/images/hotel1-3.jpg',
				]),
				policies: JSON.stringify({
					checkIn: '15:00',
					checkOut: '11:00',
					cancellation: '24h',
				}),
				phone: '+1-555-0200',
				email: 'reservations@grandpalace.com',
				website: 'https://grandpalacehotel.com',
				totalRooms: 250,
				isActive: 1,
				isFeatured: 1,
				passionScores: JSON.stringify({
					luxury: 9.5,
					business: 8.8,
					romance: 9.0,
					adventure: 6.5,
					culture: 8.0,
					relaxation: 9.2,
					family: 7.5,
				}),
			},
			{
				id: crypto.randomUUID(),
				externalId: 'hotel_002',
				name: 'Seaside Resort & Spa',
				slug: 'seaside-resort-spa',
				description:
					'Beautiful beachfront resort perfect for relaxation and adventure, featuring ocean views and world-class spa services.',
				shortDescription: 'Beachfront resort with spa and ocean views',
				address: '456 Ocean Drive',
				city: 'Miami',
				state: 'FL',
				country: 'US',
				postalCode: '33139',
				latitude: 25.7617,
				longitude: -80.1918,
				neighborhood: 'South Beach',
				rating: 4.6,
				reviewCount: 892,
				starRating: 4,
				priceMin: 199.0,
				priceMax: 599.0,
				currency: 'USD',
				amenities: JSON.stringify([
					'wifi',
					'beach',
					'pool',
					'spa',
					'restaurant',
					'bar',
					'water-sports',
					'kids-club',
				]),
				images: JSON.stringify([
					'/images/hotel2-1.jpg',
					'/images/hotel2-2.jpg',
					'/images/hotel2-3.jpg',
				]),
				policies: JSON.stringify({
					checkIn: '16:00',
					checkOut: '11:00',
					cancellation: '48h',
				}),
				phone: '+1-555-0201',
				email: 'info@seasideresort.com',
				website: 'https://seasideresort.com',
				totalRooms: 180,
				isActive: 1,
				isFeatured: 1,
				passionScores: JSON.stringify({
					luxury: 7.8,
					business: 6.5,
					romance: 9.5,
					adventure: 8.5,
					culture: 6.0,
					relaxation: 9.8,
					family: 8.8,
				}),
			},
			{
				id: crypto.randomUUID(),
				externalId: 'hotel_003',
				name: 'Business Center Inn',
				slug: 'business-center-inn',
				description:
					'Modern business hotel with state-of-the-art conference facilities and convenient downtown location.',
				shortDescription: 'Modern business hotel with conference facilities',
				address: '789 Business Blvd',
				city: 'Chicago',
				state: 'IL',
				country: 'US',
				postalCode: '60601',
				latitude: 41.8781,
				longitude: -87.6298,
				neighborhood: 'Loop',
				rating: 4.3,
				reviewCount: 654,
				starRating: 4,
				priceMin: 149.0,
				priceMax: 399.0,
				currency: 'USD',
				amenities: JSON.stringify([
					'wifi',
					'business-center',
					'meeting-rooms',
					'gym',
					'restaurant',
					'parking',
				]),
				images: JSON.stringify([
					'/images/hotel3-1.jpg',
					'/images/hotel3-2.jpg',
					'/images/hotel3-3.jpg',
				]),
				policies: JSON.stringify({
					checkIn: '15:00',
					checkOut: '12:00',
					cancellation: '24h',
				}),
				phone: '+1-555-0202',
				email: 'bookings@businesscenterinn.com',
				website: 'https://businesscenterinn.com',
				totalRooms: 120,
				isActive: 1,
				isFeatured: 0,
				passionScores: JSON.stringify({
					luxury: 6.5,
					business: 9.5,
					romance: 5.0,
					adventure: 4.5,
					culture: 7.0,
					relaxation: 6.0,
					family: 6.5,
				}),
			},
		];
		const grandPalaceHotel = hotels[0]!;
		const seasideResort = hotels[1]!;

		const insertHotel = sqlite.prepare(`
      INSERT INTO hotels (
        id, external_id, name, slug, description, short_description,
        address, city, state, country, postal_code, latitude, longitude, neighborhood,
        rating, review_count, star_rating, price_min, price_max, currency,
        amenities, images, policies, phone, email, website, total_rooms,
        is_active, is_featured, passion_scores, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		for (const hotel of hotels) {
			insertHotel.run(
				hotel.id,
				hotel.externalId,
				hotel.name,
				hotel.slug,
				hotel.description,
				hotel.shortDescription,
				hotel.address,
				hotel.city,
				hotel.state,
				hotel.country,
				hotel.postalCode,
				hotel.latitude,
				hotel.longitude,
				hotel.neighborhood,
				hotel.rating,
				hotel.reviewCount,
				hotel.starRating,
				hotel.priceMin,
				hotel.priceMax,
				hotel.currency,
				hotel.amenities,
				hotel.images,
				hotel.policies,
				hotel.phone,
				hotel.email,
				hotel.website,
				hotel.totalRooms,
				hotel.isActive,
				hotel.isFeatured,
				hotel.passionScores,
				Math.floor(Date.now() / 1000),
				Math.floor(Date.now() / 1000),
			);
		}

		// Create sample rooms
		logger.info('Seeding rooms...');
		const rooms = [
			// Grand Palace Hotel rooms
			{
				id: crypto.randomUUID(),
				hotelId: grandPalaceHotel.id,
				externalId: 'room_001',
				name: 'Executive Suite',
				type: 'suite',
				description:
					'Spacious executive suite with city view and premium amenities',
				maxOccupancy: 4,
				adults: 2,
				children: 2,
				basePrice: 599.0,
				size: 750,
				bedConfiguration: JSON.stringify([
					{ type: 'king', count: 1 },
					{ type: 'sofa_bed', count: 1 },
				]),
				amenities: JSON.stringify([
					'wifi',
					'minibar',
					'safe',
					'city-view',
					'work-desk',
					'premium-bedding',
				]),
			},
			{
				id: crypto.randomUUID(),
				hotelId: grandPalaceHotel.id,
				externalId: 'room_002',
				name: 'Deluxe King Room',
				type: 'deluxe',
				description: 'Comfortable king room with modern amenities',
				maxOccupancy: 2,
				adults: 2,
				children: 0,
				basePrice: 299.0,
				size: 400,
				bedConfiguration: JSON.stringify([{ type: 'king', count: 1 }]),
				amenities: JSON.stringify(['wifi', 'minibar', 'safe', 'work-desk']),
			},
			// Seaside Resort rooms
			{
				id: crypto.randomUUID(),
				hotelId: seasideResort.id,
				externalId: 'room_003',
				name: 'Ocean View Suite',
				type: 'suite',
				description: 'Stunning ocean view suite with private balcony',
				maxOccupancy: 4,
				adults: 2,
				children: 2,
				basePrice: 599.0,
				size: 650,
				bedConfiguration: JSON.stringify([
					{ type: 'king', count: 1 },
					{ type: 'sofa_bed', count: 1 },
				]),
				amenities: JSON.stringify([
					'wifi',
					'ocean-view',
					'balcony',
					'minibar',
					'safe',
					'premium-bedding',
				]),
			},
			{
				id: crypto.randomUUID(),
				hotelId: seasideResort.id,
				externalId: 'room_004',
				name: 'Standard Double Room',
				type: 'standard',
				description: 'Comfortable double room with garden view',
				maxOccupancy: 2,
				adults: 2,
				children: 0,
				basePrice: 199.0,
				size: 320,
				bedConfiguration: JSON.stringify([{ type: 'double', count: 1 }]),
				amenities: JSON.stringify(['wifi', 'garden-view', 'work-desk']),
			},
		];

		const insertRoom = sqlite.prepare(`
      INSERT INTO rooms (
        id, hotel_id, external_id, name, type, description,
        max_occupancy, adults, children, base_price, size,
        bed_configuration, amenities, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		for (const room of rooms) {
			insertRoom.run(
				room.id,
				room.hotelId,
				room.externalId,
				room.name,
				room.type,
				room.description,
				room.maxOccupancy,
				room.adults,
				room.children,
				room.basePrice,
				room.size,
				room.bedConfiguration,
				room.amenities,
				Math.floor(Date.now() / 1000),
				Math.floor(Date.now() / 1000),
			);
		}
		const executiveSuite = rooms[0]!;

		// Create sample bookings
		logger.info('Seeding bookings...');
		const bookings = [
			{
				id: crypto.randomUUID(),
				confirmationNumber: `HB${Date.now().toString().slice(-8)}`,
				userId: primaryUser.id,
				guestEmail: primaryUser.email,
				guestFirstName: primaryUser.firstName,
				guestLastName: primaryUser.lastName,
				guestPhone: primaryUser.phone,
				hotelId: grandPalaceHotel.id,
				roomId: executiveSuite.id,
				checkIn: Math.floor(new Date('2024-09-15').getTime() / 1000),
				checkOut: Math.floor(new Date('2024-09-18').getTime() / 1000),
				nights: 3,
				adults: 2,
				children: 0,
				roomRate: 599.0,
				taxes: 89.85,
				fees: 25.0,
				totalAmount: 1888.85, // (599 * 3) + taxes + fees
				status: 'confirmed',
				paymentStatus: 'paid',
				specialRequests: 'Late check-in requested',
			},
		];

		const insertBooking = sqlite.prepare(`
      INSERT INTO bookings (
        id, confirmation_number, user_id, guest_email, guest_first_name, guest_last_name, guest_phone,
        hotel_id, room_id, check_in, check_out, nights, adults, children,
        room_rate, taxes, fees, total_amount, status, payment_status, special_requests,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		for (const booking of bookings) {
			insertBooking.run(
				booking.id,
				booking.confirmationNumber,
				booking.userId,
				booking.guestEmail,
				booking.guestFirstName,
				booking.guestLastName,
				booking.guestPhone,
				booking.hotelId,
				booking.roomId,
				booking.checkIn,
				booking.checkOut,
				booking.nights,
				booking.adults,
				booking.children,
				booking.roomRate,
				booking.taxes,
				booking.fees,
				booking.totalAmount,
				booking.status,
				booking.paymentStatus,
				booking.specialRequests,
				Math.floor(Date.now() / 1000),
				Math.floor(Date.now() / 1000),
			);
		}

		// Create sample payments
		logger.info('Seeding payments...');
		const payments = [
			{
				id: crypto.randomUUID(),
				bookingId: bookings[0]!.id,
				userId: primaryUser.id,
				amount: 1888.85,
				currency: 'USD',
				status: 'succeeded',
				method: 'card',
				provider: 'stripe',
				transactionId: `pi_test_${Date.now()}`,
				cardLast4: '4242',
				cardBrand: 'visa',
				cardExpMonth: '12',
				cardExpYear: '2025',
				processedAt: Math.floor(Date.now() / 1000),
			},
		];

		const insertPayment = sqlite.prepare(`
      INSERT INTO payments (
        id, booking_id, user_id, amount, currency, status, method, provider,
        transaction_id, card_last4, card_brand, card_exp_month, card_exp_year,
        processed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		for (const payment of payments) {
			insertPayment.run(
				payment.id,
				payment.bookingId,
				payment.userId,
				payment.amount,
				payment.currency,
				payment.status,
				payment.method,
				payment.provider,
				payment.transactionId,
				payment.cardLast4,
				payment.cardBrand,
				payment.cardExpMonth,
				payment.cardExpYear,
				payment.processedAt,
				Math.floor(Date.now() / 1000),
				Math.floor(Date.now() / 1000),
			);
		}

		// Create sample reviews
		logger.info('Seeding reviews...');
		const reviews = [
			{
				id: crypto.randomUUID(),
				hotelId: grandPalaceHotel.id,
				userId: primaryUser.id,
				bookingId: bookings[0]!.id,
				reviewerName: `${primaryUser.firstName} ${primaryUser.lastName}`,
				reviewerEmail: primaryUser.email,
				isVerifiedBooking: 1,
				overallRating: 5.0,
				cleanliness: 5.0,
				location: 5.0,
				service: 5.0,
				value: 4.0,
				comfort: 5.0,
				facilities: 5.0,
				title: 'Exceptional Stay!',
				comment:
					'The Grand Palace Hotel exceeded all expectations. The staff was incredibly friendly and professional, the room was spotless and luxurious, and the location was perfect for exploring the city. I would definitely stay here again!',
				pros: 'Amazing service, beautiful rooms, great location',
				cons: 'A bit pricey, but worth it',
				tripType: 'leisure',
				stayDate: Math.floor(new Date('2024-09-15').getTime() / 1000),
				roomType: 'Executive Suite',
				status: 'approved',
				sentiment: 'positive',
				sentimentScore: 0.95,
			},
		];

		const insertReview = sqlite.prepare(`
      INSERT INTO reviews (
        id, hotel_id, user_id, booking_id, reviewer_name, reviewer_email, is_verified_booking,
        overall_rating, cleanliness, location, service, value, comfort, facilities,
        title, comment, pros, cons, trip_type, stay_date, room_type,
        status, sentiment, sentiment_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		for (const review of reviews) {
			insertReview.run(
				review.id,
				review.hotelId,
				review.userId,
				review.bookingId,
				review.reviewerName,
				review.reviewerEmail,
				review.isVerifiedBooking,
				review.overallRating,
				review.cleanliness,
				review.location,
				review.service,
				review.value,
				review.comfort,
				review.facilities,
				review.title,
				review.comment,
				review.pros,
				review.cons,
				review.tripType,
				review.stayDate,
				review.roomType,
				review.status,
				review.sentiment,
				review.sentimentScore,
				Math.floor(Date.now() / 1000),
				Math.floor(Date.now() / 1000),
			);
		}

		logger.info('Database seeding completed successfully!');
		logger.info(
			`Seeded ${users.length} users, ${hotels.length} hotels, ${rooms.length} rooms, ${bookings.length} bookings, ${payments.length} payments, and ${reviews.length} reviews`,
		);
	} catch (error) {
		logger.error('Database seeding failed:', error);
		throw error;
	} finally {
		await closeSqliteDatabase();
	}
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seedSqliteDatabase()
		.then(() => {
			logger.info('SQLite database seeding completed');
			process.exit(0);
		})
		.catch((error) => {
			logger.error('SQLite database seeding failed:', error);
			process.exit(1);
		});
}

export { seedSqliteDatabase };
