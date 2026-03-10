-- Initial Schema Migration for Vibe Booking Platform
-- Database: SQLite on D: drive
-- Created: 2025-08-07

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT,
    lastName TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'hotel_owner')),
    emailVerified INTEGER DEFAULT 0,
    stripeCustomerId TEXT,
    squareCustomerId TEXT,
    profileImage TEXT,
    preferences TEXT, -- JSON string
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLoginAt DATETIME,
    deletedAt DATETIME
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_square_customer ON users(squareCustomerId);

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    externalId TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    chainId TEXT,
    brandId TEXT,
    rating REAL CHECK(rating >= 0 AND rating <= 5),
    starRating INTEGER CHECK(starRating >= 1 AND starRating <= 5),
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postalCode TEXT,
    latitude REAL,
    longitude REAL,
    phone TEXT,
    email TEXT,
    website TEXT,
    amenities TEXT, -- JSON array
    images TEXT, -- JSON array
    policies TEXT, -- JSON object
    checkInTime TEXT,
    checkOutTime TEXT,
    popularityScore REAL DEFAULT 0,
    averagePrice REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending')),
    metadata TEXT, -- JSON object
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_country ON hotels(country);
CREATE INDEX idx_hotels_rating ON hotels(rating);
CREATE INDEX idx_hotels_price ON hotels(averagePrice);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_location ON hotels(latitude, longitude);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    hotelId TEXT NOT NULL,
    externalId TEXT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    maxOccupancy INTEGER,
    bedConfiguration TEXT, -- JSON array
    size REAL,
    sizeUnit TEXT DEFAULT 'sqm',
    floor INTEGER,
    view TEXT,
    amenities TEXT, -- JSON array
    images TEXT, -- JSON array
    basePrice REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    availability TEXT DEFAULT 'available' CHECK(availability IN ('available', 'unavailable', 'maintenance')),
    metadata TEXT, -- JSON object
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotelId) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE INDEX idx_rooms_hotel ON rooms(hotelId);
CREATE INDEX idx_rooms_type ON rooms(type);
CREATE INDEX idx_rooms_price ON rooms(basePrice);
CREATE INDEX idx_rooms_availability ON rooms(availability);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    userId TEXT,
    hotelId TEXT NOT NULL,
    roomId TEXT,
    confirmationNumber TEXT UNIQUE NOT NULL,
    checkInDate DATE NOT NULL,
    checkOutDate DATE NOT NULL,
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    infants INTEGER DEFAULT 0,
    guestFirstName TEXT NOT NULL,
    guestLastName TEXT NOT NULL,
    guestEmail TEXT NOT NULL,
    guestPhone TEXT,
    specialRequests TEXT,
    totalAmount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    commissionAmount REAL,
    netAmount REAL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'canceled', 'completed', 'no_show', 'payment_failed')),
    paymentStatus TEXT DEFAULT 'pending' CHECK(paymentStatus IN ('pending', 'paid', 'partially_paid', 'refunded', 'failed', 'canceled')),
    cancellationReason TEXT,
    cancelledAt DATETIME,
    cancelledBy TEXT,
    metadata TEXT, -- JSON object
    source TEXT DEFAULT 'website',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (hotelId) REFERENCES hotels(id) ON DELETE RESTRICT,
    FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE INDEX idx_bookings_user ON bookings(userId);
CREATE INDEX idx_bookings_hotel ON bookings(hotelId);
CREATE INDEX idx_bookings_confirmation ON bookings(confirmationNumber);
CREATE INDEX idx_bookings_dates ON bookings(checkInDate, checkOutDate);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(paymentStatus);
CREATE INDEX idx_bookings_created ON bookings(createdAt);

-- Payments table (Square integration)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    bookingId TEXT NOT NULL,
    userId TEXT,
    amount TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'canceled', 'refunded')),
    method TEXT DEFAULT 'card' CHECK(method IN ('card', 'bank_transfer', 'wallet', 'cash')),
    provider TEXT DEFAULT 'square' CHECK(provider IN ('square', 'stripe', 'paypal', 'manual')),
    transactionId TEXT UNIQUE,
    providerPaymentId TEXT,
    providerResponse TEXT, -- JSON object
    errorCode TEXT,
    errorMessage TEXT,
    metadata TEXT, -- JSON object
    processedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_booking ON payments(bookingId);
CREATE INDEX idx_payments_user ON payments(userId);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_transaction ON payments(transactionId);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    paymentId TEXT,
    bookingId TEXT NOT NULL,
    amount TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
    reason TEXT,
    transactionId TEXT UNIQUE,
    providerRefundId TEXT,
    providerResponse TEXT, -- JSON object
    processedBy TEXT,
    processedAt DATETIME,
    metadata TEXT, -- JSON object
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX idx_refunds_payment ON refunds(paymentId);
CREATE INDEX idx_refunds_booking ON refunds(bookingId);
CREATE INDEX idx_refunds_status ON refunds(status);

-- Payment Methods table (for saved cards)
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    userId TEXT NOT NULL,
    provider TEXT DEFAULT 'square',
    providerMethodId TEXT NOT NULL,
    type TEXT DEFAULT 'card',
    last4 TEXT,
    brand TEXT,
    expiryMonth INTEGER,
    expiryYear INTEGER,
    isDefault INTEGER DEFAULT 0,
    metadata TEXT, -- JSON object
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_methods_user ON payment_methods(userId);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    hotelId TEXT NOT NULL,
    bookingId TEXT,
    userId TEXT,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    pros TEXT,
    cons TEXT,
    travelType TEXT,
    stayDate DATE,
    helpfulVotes INTEGER DEFAULT 0,
    totalVotes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderatedBy TEXT,
    moderatedAt DATETIME,
    images TEXT, -- JSON array
    metadata TEXT, -- JSON object
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotelId) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reviews_hotel ON reviews(hotelId);
CREATE INDEX idx_reviews_user ON reviews(userId);
CREATE INDEX idx_reviews_booking ON reviews(bookingId);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_status ON reviews(status);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    userId TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entityId TEXT,
    oldValues TEXT, -- JSON object
    newValues TEXT, -- JSON object
    ipAddress TEXT,
    userAgent TEXT,
    metadata TEXT, -- JSON object
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(userId);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entityId);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(createdAt);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(userId);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expiresAt);

-- Commission tracking table
CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    bookingId TEXT NOT NULL,
    paymentId TEXT,
    baseAmount REAL NOT NULL,
    commissionRate REAL DEFAULT 0.05,
    commissionAmount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'collected', 'paid', 'reversed')),
    payoutDate DATE,
    payoutReference TEXT,
    metadata TEXT, -- JSON object
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE INDEX idx_commissions_booking ON commissions(bookingId);
CREATE INDEX idx_commissions_payment ON commissions(paymentId);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_payout_date ON commissions(payoutDate);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_users_timestamp AFTER UPDATE ON users
BEGIN
    UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_hotels_timestamp AFTER UPDATE ON hotels
BEGIN
    UPDATE hotels SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_rooms_timestamp AFTER UPDATE ON rooms
BEGIN
    UPDATE rooms SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_bookings_timestamp AFTER UPDATE ON bookings
BEGIN
    UPDATE bookings SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_payments_timestamp AFTER UPDATE ON payments
BEGIN
    UPDATE payments SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_refunds_timestamp AFTER UPDATE ON refunds
BEGIN
    UPDATE refunds SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_payment_methods_timestamp AFTER UPDATE ON payment_methods
BEGIN
    UPDATE payment_methods SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_reviews_timestamp AFTER UPDATE ON reviews
BEGIN
    UPDATE reviews SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_commissions_timestamp AFTER UPDATE ON commissions
BEGIN
    UPDATE commissions SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;