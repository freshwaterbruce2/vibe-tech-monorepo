-- Hotel Booking Development Seed Data
-- Version: Development
-- Description: Comprehensive seed data for development and testing

-- =====================================================
-- 1. USERS SEED DATA
-- =====================================================

-- Insert test users (passwords are bcrypt hashed for 'password123')
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active, email_verified, preferences) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'admin@hotelbooking.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', '+1-555-0001', 'admin', true, true, '{"currency": "USD", "language": "en", "notifications": {"email": true, "push": true, "sms": false}}'),
('550e8400-e29b-41d4-a716-446655440002', 'john.doe@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', '+1-555-0002', 'user', true, true, '{"currency": "USD", "language": "en", "notifications": {"email": true, "push": false, "sms": true}}'),
('550e8400-e29b-41d4-a716-446655440003', 'jane.smith@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', '+1-555-0003', 'user', true, true, '{"currency": "EUR", "language": "en", "notifications": {"email": true, "push": true, "sms": false}}'),
('550e8400-e29b-41d4-a716-446655440004', 'mike.wilson@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Wilson', '+1-555-0004', 'user', true, false, '{"currency": "USD", "language": "en", "notifications": {"email": false, "push": false, "sms": false}}'),
('550e8400-e29b-41d4-a716-446655440005', 'sarah.jones@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Jones', '+1-555-0005', 'user', true, true, '{"currency": "GBP", "language": "en", "notifications": {"email": true, "push": true, "sms": true}}')
ON CONFLICT (id) DO NOTHING;

-- Insert user profiles
INSERT INTO user_profiles (id, user_id, date_of_birth, nationality, travel_preferences, loyalty_programs) VALUES 
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '1985-06-15', 'US', '{"seatPreference": "window", "mealPreference": "vegetarian", "roomPreference": {"bedType": "king", "floor": "high", "smoking": false}}', '[]'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '1990-03-22', 'US', '{"seatPreference": "aisle", "mealPreference": "any", "roomPreference": {"bedType": "queen", "floor": "any", "smoking": false}}', '[{"program": "Marriott Bonvoy", "number": "MB123456789", "tier": "Gold"}]'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '1988-11-08', 'GB', '{"seatPreference": "any", "mealPreference": "gluten-free", "roomPreference": {"bedType": "twin", "floor": "low", "smoking": false}}', '[]'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', '1992-01-30', 'CA', '{"seatPreference": "window", "mealPreference": "vegan", "roomPreference": {"bedType": "king", "floor": "high", "smoking": false}}', '[{"program": "Hilton Honors", "number": "HH987654321", "tier": "Diamond"}]')
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 2. HOTELS SEED DATA
-- =====================================================

-- Insert sample hotels across different cities and price ranges
INSERT INTO hotels (id, external_id, name, slug, description, short_description, address, city, state, country, postal_code, latitude, longitude, neighborhood, rating, review_count, star_rating, price_min, price_max, currency, amenities, images, policies, nearby_attractions, phone, email, website, check_in_time, check_out_time, total_rooms, is_active, is_featured, passion_scores, sustainability_score) VALUES 

-- Luxury Hotels
('770e8400-e29b-41d4-a716-446655440001', 'LUXURY_NYC_001', 'The Grand Manhattan', 'grand-manhattan', 
'Experience unparalleled luxury in the heart of Manhattan. Our iconic hotel offers world-class dining, a full-service spa, and breathtaking city views from every room. Perfect for both business travelers and leisure guests seeking the ultimate New York experience.',
'Luxury hotel in Manhattan with spa and city views',
'123 Fifth Avenue', 'New York', 'NY', 'US', '10001', 40.7589, -73.9851, 'Midtown', 4.8, 1247, 5, 450.00, 1200.00, 'USD',
'["WiFi", "Spa", "Fitness Center", "Restaurant", "Room Service", "Concierge", "Valet Parking", "Business Center", "Pet Friendly", "Airport Shuttle"]',
'[{"url": "hotel1-1.jpg", "alt": "Lobby"}, {"url": "hotel1-2.jpg", "alt": "Suite"}, {"url": "hotel1-3.jpg", "alt": "Spa"}]',
'{"cancellation": "Free cancellation up to 24 hours before check-in", "pets": "Pets allowed with $50 fee", "smoking": "Non-smoking property"}',
'[{"name": "Empire State Building", "distance": "0.5 miles"}, {"name": "Times Square", "distance": "0.8 miles"}]',
'+1-212-555-0001', 'reservations@grandmanhattan.com', 'https://grandmanhattan.com', '15:00', '11:00', 300, true, true,
'{"gourmet_foodie": 95, "luxury_seeker": 98, "business_traveler": 92, "culture_enthusiast": 85, "nightlife_lover": 78, "outdoor_adventure": 25, "family_friendly": 65}', 4.2),

('770e8400-e29b-41d4-a716-446655440002', 'LUXURY_SF_001', 'Pacific Heights Grand Hotel', 'pacific-heights-grand',
'Nestled in San Franciscos prestigious Pacific Heights neighborhood, our boutique luxury hotel combines Victorian elegance with modern amenities. Enjoy panoramic bay views, Michelin-starred dining, and personalized service that defines California hospitality.',
'Boutique luxury hotel in Pacific Heights with bay views',
'1800 Fillmore Street', 'San Francisco', 'CA', 'US', '94115', 37.7849, -122.4311, 'Pacific Heights', 4.7, 892, 5, 380.00, 950.00, 'USD',
'["WiFi", "Spa", "Fitness Center", "Restaurant", "Room Service", "Concierge", "Valet Parking", "Business Center", "Pet Friendly", "Electric Car Charging"]',
'[{"url": "hotel2-1.jpg", "alt": "Exterior"}, {"url": "hotel2-2.jpg", "alt": "Bay View Room"}, {"url": "hotel2-3.jpg", "alt": "Restaurant"}]',
'{"cancellation": "Free cancellation up to 48 hours before check-in", "pets": "Pets welcome with advance notice", "smoking": "Non-smoking property"}',
'[{"name": "Golden Gate Park", "distance": "1.2 miles"}, {"name": "Union Square", "distance": "2.1 miles"}]',
'+1-415-555-0002', 'concierge@pacificheightsgrand.com', 'https://pacificheightsgrand.com', '16:00', '12:00', 125, true, true,
'{"gourmet_foodie": 92, "luxury_seeker": 96, "culture_enthusiast": 88, "business_traveler": 85, "outdoor_adventure": 70, "nightlife_lover": 72, "family_friendly": 60}', 4.6),

-- Mid-Range Hotels
('770e8400-e29b-41d4-a716-446655440003', 'MIDRANGE_CHI_001', 'Chicago Riverwalk Inn', 'chicago-riverwalk-inn',
'Discover the charm of Chicago from our contemporary hotel overlooking the famous Riverwalk. Modern rooms, excellent dining options, and easy access to Millennium Park and the Magnificent Mile make us the perfect base for exploring the Windy City.',
'Contemporary hotel on Chicago Riverwalk',
'456 North Michigan Ave', 'Chicago', 'IL', 'US', '60611', 41.8781, -87.6298, 'River North', 4.3, 654, 4, 189.00, 320.00, 'USD',
'["WiFi", "Fitness Center", "Restaurant", "Room Service", "Business Center", "Indoor Pool", "Pet Friendly", "Self Parking"]',
'[{"url": "hotel3-1.jpg", "alt": "Riverwalk View"}, {"url": "hotel3-2.jpg", "alt": "Standard Room"}, {"url": "hotel3-3.jpg", "alt": "Pool"}]',
'{"cancellation": "Free cancellation up to 24 hours before check-in", "pets": "Pets allowed with $25 fee", "smoking": "Designated smoking rooms available"}',
'[{"name": "Millennium Park", "distance": "0.3 miles"}, {"name": "Navy Pier", "distance": "0.7 miles"}]',
'+1-312-555-0003', 'reservations@chicagoriverwalk.com', 'https://chicagoriverwalk.com', '15:00', '11:00', 200, true, false,
'{"culture_enthusist": 85, "business_traveler": 88, "family_friendly": 75, "nightlife_lover": 80, "gourmet_foodie": 70, "outdoor_adventure": 65, "luxury_seeker": 60}', 3.8),

('770e8400-e29b-41d4-a716-446655440004', 'MIDRANGE_LA_001', 'Sunset Boulevard Hotel', 'sunset-boulevard-hotel',
'Experience the glamour of Hollywood from our stylish hotel on the famous Sunset Boulevard. Retro-chic design meets modern comfort, with easy access to entertainment venues, shopping, and dining. Perfect for music lovers and entertainment industry professionals.',
'Stylish hotel on Sunset Boulevard in Hollywood',
'7890 Sunset Boulevard', 'Los Angeles', 'CA', 'US', '90046', 34.0928, -118.3287, 'West Hollywood', 4.1, 543, 3, 165.00, 285.00, 'USD',
'["WiFi", "Fitness Center", "Restaurant", "Bar", "Outdoor Pool", "Spa Services", "Pet Friendly", "Valet Parking", "Electric Car Charging"]',
'[{"url": "hotel4-1.jpg", "alt": "Pool Area"}, {"url": "hotel4-2.jpg", "alt": "Hotel Exterior"}, {"url": "hotel4-3.jpg", "alt": "Bar"}]',
'{"cancellation": "Free cancellation up to 24 hours before check-in", "pets": "Pets welcome with $30 fee", "smoking": "Non-smoking property"}',
'[{"name": "Hollywood Walk of Fame", "distance": "1.5 miles"}, {"name": "Griffith Observatory", "distance": "3.2 miles"}]',
'+1-323-555-0004', 'info@sunsetboulevardhotel.com', 'https://sunsetboulevardhotel.com', '15:00', '11:00', 180, true, false,
'{"nightlife_lover": 95, "culture_enthusiast": 88, "business_traveler": 75, "luxury_seeker": 70, "gourmet_foodie": 72, "outdoor_adventure": 60, "family_friendly": 55}', 3.5),

-- Budget Hotels
('770e8400-e29b-41d4-a716-446655440005', 'BUDGET_MIA_001', 'Miami Beach Budget Inn', 'miami-beach-budget-inn',
'Clean, comfortable accommodations just steps from South Beach. Our no-frills approach focuses on value and location, making it perfect for budget-conscious travelers who want to experience Miami Beach without breaking the bank.',
'Budget-friendly hotel near South Beach',
'321 Collins Avenue', 'Miami Beach', 'FL', 'US', '33139', 25.7907, -80.1300, 'South Beach', 3.8, 329, 2, 89.00, 145.00, 'USD',
'["WiFi", "Outdoor Pool", "Beach Access", "Parking", "24/7 Front Desk", "Laundry Facilities"]',
'[{"url": "hotel5-1.jpg", "alt": "Pool"}, {"url": "hotel5-2.jpg", "alt": "Beach View"}, {"url": "hotel5-3.jpg", "alt": "Room"}]',
'{"cancellation": "Free cancellation up to 48 hours before check-in", "pets": "No pets allowed", "smoking": "Designated smoking areas"}',
'[{"name": "South Beach", "distance": "0.2 miles"}, {"name": "Lincoln Road", "distance": "0.5 miles"}]',
'+1-305-555-0005', 'front-desk@miamibeachbudget.com', 'https://miamibeachbudget.com', '15:00', '11:00', 95, true, false,
'{"outdoor_adventure": 85, "nightlife_lover": 90, "family_friendly": 70, "culture_enthusiast": 45, "business_traveler": 40, "gourmet_foodie": 50, "luxury_seeker": 25}', 2.8),

('770e8400-e29b-41d4-a716-446655440006', 'BUDGET_LV_001', 'Vegas Downtown Express', 'vegas-downtown-express',
'Experience the excitement of Las Vegas from our centrally located budget hotel. Clean rooms, friendly service, and unbeatable prices put you in the heart of the action without the premium cost. Perfect for adventurous travelers and groups.',
'Budget hotel in downtown Las Vegas',
'555 Fremont Street', 'Las Vegas', 'NV', 'US', '89101', 36.1699, -115.1398, 'Downtown', 3.6, 876, 2, 75.00, 125.00, 'USD',
'["WiFi", "Casino", "Restaurant", "Bar", "Parking", "24/7 Front Desk", "ATM", "Gift Shop"]',
'[{"url": "hotel6-1.jpg", "alt": "Casino Floor"}, {"url": "hotel6-2.jpg", "alt": "Standard Room"}, {"url": "hotel6-3.jpg", "alt": "Fremont Street"}]',
'{"cancellation": "Free cancellation up to 24 hours before check-in", "pets": "No pets allowed", "smoking": "Smoking and non-smoking rooms available"}',
'[{"name": "Fremont Street Experience", "distance": "0.1 miles"}, {"name": "Las Vegas Strip", "distance": "2.5 miles"}]',
'+1-702-555-0006', 'reservations@vegasdowntown.com', 'https://vegasdowntown.com', '15:00', '11:00', 250, true, false,
'{"nightlife_lover": 98, "outdoor_adventure": 70, "culture_enthusiast": 55, "business_traveler": 60, "family_friendly": 45, "gourmet_foodie": 65, "luxury_seeker": 40}', 2.5),

-- International Hotels
('770e8400-e29b-41d4-a716-446655440007', 'INTL_LONDON_001', 'London Heritage Hotel', 'london-heritage-hotel',
'A charming Victorian hotel in the heart of London, combining historic elegance with modern amenities. Located near Hyde Park and Oxford Street, our hotel offers the perfect blend of British tradition and contemporary comfort for the discerning traveler.',
'Victorian hotel near Hyde Park and Oxford Street',
'25 Marble Arch', 'London', '', 'GB', 'W1H 7EJ', 51.5139, -0.1580, 'Marylebone', 4.4, 732, 4, 280.00, 485.00, 'GBP',
'["WiFi", "Restaurant", "Room Service", "Concierge", "Business Center", "Fitness Center", "Pet Friendly", "Dry Cleaning"]',
'[{"url": "hotel7-1.jpg", "alt": "Victorian Facade"}, {"url": "hotel7-2.jpg", "alt": "Traditional Room"}, {"url": "hotel7-3.jpg", "alt": "Afternoon Tea"}]',
'{"cancellation": "Free cancellation up to 24 hours before check-in", "pets": "Pets welcome with advance notice", "smoking": "Non-smoking property"}',
'[{"name": "Hyde Park", "distance": "0.2 miles"}, {"name": "Oxford Street", "distance": "0.3 miles"}]',
'+44-20-7555-0007', 'bookings@londonheritage.co.uk', 'https://londonheritage.co.uk', '14:00', '11:00', 150, true, true,
'{"culture_enthusiast": 95, "luxury_seeker": 80, "business_traveler": 85, "gourmet_foodie": 88, "family_friendly": 75, "nightlife_lover": 70, "outdoor_adventure": 60}', 4.1),

('770e8400-e29b-41d4-a716-446655440008', 'INTL_PARIS_001', 'Boutique Montmartre', 'boutique-montmartre',
'Discover the artistic soul of Paris from our intimate boutique hotel in historic Montmartre. Each room is uniquely designed, reflecting the neighborhoods bohemian spirit. Steps from Sacré-Cœur and the vibrant artists quarter.',
'Boutique hotel in artistic Montmartre district',
'18 Rue des Abbesses', 'Paris', 'Île-de-France', 'FR', '75018', 48.8841, 2.3385, 'Montmartre', 4.6, 445, 4, 220.00, 420.00, 'EUR',
'["WiFi", "Restaurant", "Bar", "Concierge", "Room Service", "Pet Friendly", "Bicycle Rental", "Art Gallery"]',
'[{"url": "hotel8-1.jpg", "alt": "Artistic Room"}, {"url": "hotel8-2.jpg", "alt": "Montmartre View"}, {"url": "hotel8-3.jpg", "alt": "French Bistro"}]',
'{"cancellation": "Free cancellation up to 48 hours before check-in", "pets": "Pets welcome", "smoking": "Non-smoking property"}',
'[{"name": "Sacré-Cœur", "distance": "0.3 miles"}, {"name": "Moulin Rouge", "distance": "0.5 miles"}]',
'+33-1-42-55-0008', 'contact@boutiquemontmartre.fr', 'https://boutiquemontmartre.fr', '15:00', '12:00', 45, true, true,
'{"culture_enthusiast": 98, "gourmet_foodie": 92, "luxury_seeker": 85, "nightlife_lover": 88, "business_traveler": 65, "outdoor_adventure": 55, "family_friendly": 70}', 4.3)

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. ROOMS SEED DATA
-- =====================================================

-- Insert rooms for each hotel
INSERT INTO rooms (id, hotel_id, external_id, name, type, description, max_occupancy, adults, children, base_price, currency, size, bed_configuration, amenities, images, total_quantity, is_active) VALUES 

-- Rooms for The Grand Manhattan
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'GM_DELUXE_01', 'Deluxe City View', 'deluxe', 'Spacious room with stunning Manhattan skyline views', 2, 2, 0, 450.00, 'USD', 400, '[{"type": "King", "count": 1}]', '["City View", "Marble Bathroom", "Mini Bar", "Safe", "Robes", "Turndown Service"]', '[{"url": "room1-1.jpg", "alt": "Deluxe Room"}]', 150, true),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'GM_SUITE_01', 'Presidential Suite', 'suite', 'Ultimate luxury suite with separate living area and panoramic views', 4, 3, 1, 1200.00, 'USD', 800, '[{"type": "King", "count": 1}, {"type": "Sofa Bed", "count": 1}]', '["Panoramic View", "Separate Living Area", "Marble Bathroom", "Butler Service", "Premium Amenities"]', '[{"url": "suite1-1.jpg", "alt": "Presidential Suite"}]', 10, true),

-- Rooms for Pacific Heights Grand Hotel
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'PH_BAY_01', 'Bay View Room', 'standard', 'Elegant room with San Francisco Bay views', 2, 2, 0, 380.00, 'USD', 350, '[{"type": "Queen", "count": 1}]', '["Bay View", "Marble Bathroom", "WiFi", "Safe", "Coffee Maker"]', '[{"url": "room2-1.jpg", "alt": "Bay View Room"}]', 80, true),
('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'PH_SUITE_01', 'Victorian Suite', 'suite', 'Luxurious suite combining Victorian charm with modern amenities', 3, 2, 1, 950.00, 'USD', 600, '[{"type": "King", "count": 1}, {"type": "Twin", "count": 1}]', '["Historic Architecture", "Separate Living Area", "Bay View", "Premium Amenities"]', '[{"url": "suite2-1.jpg", "alt": "Victorian Suite"}]', 15, true),

-- Rooms for Chicago Riverwalk Inn
('880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440003', 'CR_RIVER_01', 'Riverwalk Standard', 'standard', 'Contemporary room overlooking the Chicago River', 2, 2, 0, 189.00, 'USD', 300, '[{"type": "Queen", "count": 1}]', '["River View", "Modern Bathroom", "WiFi", "Work Desk", "Coffee Maker"]', '[{"url": "room3-1.jpg", "alt": "Riverwalk Room"}]', 120, true),
('880e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440003', 'CR_FAMILY_01', 'Family Room', 'family', 'Spacious room perfect for families visiting Chicago', 4, 2, 2, 320.00, 'USD', 450, '[{"type": "Queen", "count": 2}]', '["River View", "Separate Seating Area", "Mini Fridge", "Extra Space"]', '[{"url": "room3-2.jpg", "alt": "Family Room"}]', 30, true)

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. BOOKINGS SEED DATA
-- =====================================================

-- Insert sample bookings with various statuses and dates
INSERT INTO bookings (id, confirmation_number, user_id, guest_email, guest_first_name, guest_last_name, guest_phone, hotel_id, room_id, check_in, check_out, nights, adults, children, room_rate, taxes, fees, total_amount, currency, status, payment_status, special_requests, is_cancellable, cancellation_deadline, source, created_at) VALUES 

('990e8400-e29b-41d4-a716-446655440001', 'BK20250101-ABC123', '550e8400-e29b-41d4-a716-446655440002', 'john.doe@email.com', 'John', 'Doe', '+1-555-0002', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '2025-02-15', '2025-02-18', 3, 2, 0, 450.00, 135.00, 25.00, 1510.00, 'USD', 'confirmed', 'paid', 'High floor room preferred', true, '2025-02-14 15:00:00', 'website', '2025-01-15 10:30:00'),

('990e8400-e29b-41d4-a716-446655440002', 'BK20250102-DEF456', '550e8400-e29b-41d4-a716-446655440003', 'jane.smith@email.com', 'Jane', 'Smith', '+1-555-0003', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', '2025-03-01', '2025-03-05', 4, 2, 0, 380.00, 152.00, 20.00, 1692.00, 'USD', 'confirmed', 'paid', 'Late checkout requested', true, '2025-02-28 15:00:00', 'website', '2025-01-20 14:22:00'),

('990e8400-e29b-41d4-a716-446655440003', 'BK20250103-GHI789', '550e8400-e29b-41d4-a716-446655440004', 'mike.wilson@email.com', 'Mike', 'Wilson', '+1-555-0004', '770e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440005', '2025-02-20', '2025-02-23', 3, 1, 0, 189.00, 56.70, 15.00, 638.70, 'USD', 'pending', 'pending', '', true, '2025-02-19 15:00:00', 'website', '2025-01-25 09:15:00'),

('990e8400-e29b-41d4-a716-446655440004', 'BK20250104-JKL012', '550e8400-e29b-41d4-a716-446655440005', 'sarah.jones@email.com', 'Sarah', 'Jones', '+1-555-0005', '770e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440003', '2025-04-10', '2025-04-14', 4, 2, 0, 280.00, 112.00, 18.00, 1250.00, 'GBP', 'confirmed', 'paid', 'Vegetarian breakfast preferred', true, '2025-04-09 14:00:00', 'website', '2025-01-28 16:45:00'),

('990e8400-e29b-41d4-a716-446655440005', 'BK20250105-MNO345', null, 'guest@email.com', 'Guest', 'User', '+1-555-9999', '770e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440005', '2025-03-15', '2025-03-17', 2, 2, 0, 89.00, 26.70, 10.00, 214.70, 'USD', 'cancelled', 'refunded', 'Beach view preferred', false, '2025-03-14 15:00:00', 'website', '2025-02-01 11:20:00')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. PAYMENTS SEED DATA
-- =====================================================

-- Insert payment records for the bookings
INSERT INTO payments (id, booking_id, user_id, amount, currency, status, method, provider, transaction_id, card_last4, card_brand, billing_address, processed_at) VALUES 

('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 1510.00, 'USD', 'completed', 'card', 'stripe', 'pi_1234567890abcdef', '4242', 'visa', '{"street": "123 Main St", "city": "New York", "state": "NY", "zip": "10001", "country": "US"}', '2025-01-15 10:35:00'),

('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 1692.00, 'USD', 'completed', 'card', 'stripe', 'pi_abcdef1234567890', '5555', 'mastercard', '{"street": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102", "country": "US"}', '2025-01-20 14:25:00'),

('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 1250.00, 'GBP', 'completed', 'card', 'stripe', 'pi_gbp1234567890abc', '1234', 'amex', '{"street": "789 High Street", "city": "London", "state": "", "zip": "SW1A 1AA", "country": "GB"}', '2025-01-28 16:50:00'),

('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440005', null, 214.70, 'USD', 'refunded', 'card', 'stripe', 'pi_refund1234567890', '9876', 'visa', '{"street": "321 Beach Rd", "city": "Miami", "state": "FL", "zip": "33139", "country": "US"}', '2025-02-01 11:25:00')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. SEARCH ANALYTICS SEED DATA
-- =====================================================

-- Insert sample search analytics data
INSERT INTO search_analytics (id, query, query_type, normalized_query, filters, total_results, clicked_results, booked_results, execution_time_ms, cache_hit, session_id, user_id, created_at) VALUES 

('bb0e8400-e29b-41d4-a716-446655440001', 'luxury hotels in Manhattan', 'natural_language', 'luxury hotels manhattan', '{"city": "New York", "priceRange": "luxury"}', 5, 2, 1, 245, false, 'sess_1234567890', '550e8400-e29b-41d4-a716-446655440002', '2025-01-15 10:25:00'),

('bb0e8400-e29b-41d4-a716-446655440002', 'budget hotels near beach Miami', 'natural_language', 'budget hotels beach miami', '{"city": "Miami", "priceRange": "budget", "amenities": ["beach"]}', 8, 3, 0, 189, true, 'sess_abcdef12345', null, '2025-01-18 15:30:00'),

('bb0e8400-e29b-41d4-a716-446655440003', 'San Francisco bay view hotel', 'natural_language', 'san francisco bay view hotel', '{"city": "San Francisco", "amenities": ["bay view"]}', 3, 1, 1, 167, false, 'sess_xyz789012', '550e8400-e29b-41d4-a716-446655440003', '2025-01-20 14:15:00'),

('bb0e8400-e29b-41d4-a716-446655440004', 'Chicago downtown hotels under 200', 'filtered', 'chicago downtown hotels under 200', '{"city": "Chicago", "maxPrice": 200}', 12, 4, 0, 134, true, 'sess_chicago123', '550e8400-e29b-41d4-a716-446655440004', '2025-01-22 09:45:00'),

('bb0e8400-e29b-41d4-a716-446655440005', 'London heritage hotel near parks', 'natural_language', 'london heritage hotel parks', '{"city": "London", "amenities": ["historic", "parks"]}', 6, 2, 1, 203, false, 'sess_london567', '550e8400-e29b-41d4-a716-446655440005', '2025-01-25 12:20:00')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. ROOM AVAILABILITY SEED DATA
-- =====================================================

-- Insert room availability for the next 90 days
DO $$
DECLARE
    room_record RECORD;
    date_record DATE;
    base_price NUMERIC;
    weekend_multiplier NUMERIC;
    season_multiplier NUMERIC;
    final_price NUMERIC;
BEGIN
    -- Loop through all rooms
    FOR room_record IN SELECT id, base_price FROM rooms WHERE is_active = true LOOP
        -- Loop through next 90 days
        FOR date_record IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', '1 day'::interval)::date LOOP
            
            -- Calculate dynamic pricing
            base_price := room_record.base_price;
            
            -- Weekend pricing (Friday/Saturday +20%)
            IF EXTRACT(DOW FROM date_record) IN (5, 6) THEN
                weekend_multiplier := 1.2;
            ELSE
                weekend_multiplier := 1.0;
            END IF;
            
            -- Seasonal pricing (summer months +15%)
            IF EXTRACT(MONTH FROM date_record) IN (6, 7, 8) THEN
                season_multiplier := 1.15;
            ELSE
                season_multiplier := 1.0;
            END IF;
            
            final_price := base_price * weekend_multiplier * season_multiplier;
            
            -- Insert availability record
            INSERT INTO room_availability (room_id, date, available, booked, price, currency, restrictions)
            VALUES (
                room_record.id,
                date_record,
                FLOOR(RANDOM() * 8) + 2, -- 2-9 rooms available
                FLOOR(RANDOM() * 3), -- 0-2 rooms booked
                final_price,
                'USD',
                jsonb_build_object(
                    'minStay', CASE WHEN EXTRACT(DOW FROM date_record) IN (5, 6) THEN 2 ELSE 1 END,
                    'maxStay', 14,
                    'closedToArrival', false,
                    'closedToDeparture', false
                )
            )
            ON CONFLICT (room_id, date) DO NOTHING;
            
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 8. UPDATE SEARCH INDEXES
-- =====================================================

-- Refresh hotel search data
SELECT refresh_hotel_search_indexes();

-- Update hotel statistics
UPDATE hotels SET 
    updated_at = NOW(),
    last_synced_at = NOW()
WHERE id IN (
    SELECT DISTINCT hotel_id 
    FROM bookings 
    WHERE created_at >= NOW() - INTERVAL '30 days'
);

-- =====================================================
-- 9. PERFORMANCE OPTIMIZATION
-- =====================================================

-- Analyze tables for better query planning
ANALYZE users;
ANALYZE hotels;
ANALYZE rooms;
ANALYZE bookings;
ANALYZE payments;
ANALYZE room_availability;
ANALYZE search_analytics;
ANALYZE hotel_search;

-- Vacuum to reclaim space and update statistics
VACUUM ANALYZE;

COMMIT;