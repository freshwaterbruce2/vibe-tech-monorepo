import { getDatabasePath } from '@vibetech/shared-config';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface AppDatabaseConfig {
    path?: string;
    readOnly?: boolean;
    verbose?: boolean;
}

export class AppDatabase {
    private db: Database.Database;
    private static instance: AppDatabase | null = null;

    constructor(config: AppDatabaseConfig = {}) {
        const dbPath = config.path ?? getDatabasePath('app');

        // Ensure directory exists
        const dir = dirname(dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath, {
            readonly: config.readOnly ?? false,
            verbose: config.verbose ? (msg: unknown) => process.stdout.write(`[db-app] ${String(msg)}\n`) : undefined,
        });

        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');

        // Optimize for Windows SSD
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = -64000'); // 64MB cache
        this.db.pragma('temp_store = MEMORY');
        this.db.pragma('mmap_size = 30000000000'); // 30GB

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
    }

    public static getInstance(config?: AppDatabaseConfig): AppDatabase {
        if (!AppDatabase.instance) {
            AppDatabase.instance = new AppDatabase(config);
        } else if (config) {
            console.warn('[AppDatabase] getInstance() called with config but instance already exists. Config ignored. Use close() first to reinitialize.');
        }
        return AppDatabase.instance;
    }

    public static resetInstance(): void {
        if (AppDatabase.instance) {
            AppDatabase.instance.close();
        }
    }

    public getDatabase(): Database.Database {
        return this.db;
    }

    public async backup(destination: string): Promise<unknown> {
        return await this.db.backup(destination);
    }

    public vacuum(): void {
        this.db.exec('VACUUM');
    }

    public analyze(): void {
        this.db.exec('ANALYZE');
    }

    public checkpoint(): void {
        this.db.pragma('wal_checkpoint(TRUNCATE)');
    }

    public close(): void {
        if (this.db.open) {
            this.db.close();
        }
        AppDatabase.instance = null;
    }
}

// Database Interfaces
export interface BookingUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface VibeBooking {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid';
  createdAt: string;
  bookingType?: 'individual' | 'team';
  teamName?: string;
  billingMethod?: 'personal' | 'corporate_invoice' | 'bleisure_split';
  businessNights?: number;
  leisureNights?: number;
}

export interface VibePayment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
}

export interface VibeReview {
  id: string;
  hotelId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface VibePromo {
  code: string;
  discountPercentage: number;
  isActive: number;
}

// Booking Repository helper for standard app queries
export class BookingRepository {
  private db: Database.Database;

  constructor(appDatabase: AppDatabase = AppDatabase.getInstance()) {
    this.db = appDatabase.getDatabase();
    this.setupSchemas();
  }

  private setupSchemas() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS booking_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vibe_bookings (
        id TEXT PRIMARY KEY,
        hotelId TEXT NOT NULL,
        userId TEXT NOT NULL,
        checkIn TEXT NOT NULL,
        checkOut TEXT NOT NULL,
        guests INTEGER NOT NULL,
        totalPrice REAL NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        paymentStatus TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        bookingType TEXT,
        teamName TEXT,
        billingMethod TEXT,
        businessNights INTEGER,
        leisureNights INTEGER
      );
    `);

    // Run dynamic migrations for existing schemas
    try {
      this.db.exec("ALTER TABLE vibe_bookings ADD COLUMN bookingType TEXT");
    } catch {}
    try {
      this.db.exec("ALTER TABLE vibe_bookings ADD COLUMN teamName TEXT");
    } catch {}
    try {
      this.db.exec("ALTER TABLE vibe_bookings ADD COLUMN billingMethod TEXT");
    } catch {}
    try {
      this.db.exec("ALTER TABLE vibe_bookings ADD COLUMN businessNights INTEGER");
    } catch {}
    try {
      this.db.exec("ALTER TABLE vibe_bookings ADD COLUMN leisureNights INTEGER");
    } catch {}

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vibe_payments (
        id TEXT PRIMARY KEY,
        bookingId TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vibe_reviews (
        id TEXT PRIMARY KEY,
        hotelId TEXT NOT NULL,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vibe_promos (
        code TEXT PRIMARY KEY,
        discountPercentage REAL NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1
      );
    `);

    // Insert fallback/starter promo code
    try {
      this.db.prepare("INSERT OR IGNORE INTO vibe_promos (code, discountPercentage, isActive) VALUES ('VIBE20', 20.0, 1)").run();
    } catch {
      // Ignore if table exists or is locked
    }
  }

  // Users Management
  public getUserByEmail(email: string): BookingUser | null {
    return this.db.prepare('SELECT * FROM booking_users WHERE email = ?').get(email) as BookingUser | null;
  }

  public createUser(user: BookingUser): void {
    this.db.prepare('INSERT INTO booking_users (id, email, passwordHash, firstName, lastName) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, user.email, user.passwordHash, user.firstName, user.lastName);
  }

  // Bookings Management
  public getBookingById(bookingId: string): VibeBooking | null {
    return this.db.prepare('SELECT * FROM vibe_bookings WHERE id = ?').get(bookingId) as VibeBooking | null;
  }

  public getBookingByIdAndUser(bookingId: string, userId: string): VibeBooking | null {
    return this.db.prepare('SELECT * FROM vibe_bookings WHERE id = ? AND userId = ?').get(bookingId, userId) as VibeBooking | null;
  }

  public getUserBookings(userId: string): VibeBooking[] {
    return this.db.prepare('SELECT * FROM vibe_bookings WHERE userId = ?').all(userId) as VibeBooking[];
  }

  public createBooking(booking: VibeBooking): void {
    this.db.prepare(`
      INSERT INTO vibe_bookings (id, hotelId, userId, checkIn, checkOut, guests, totalPrice, currency, status, paymentStatus, createdAt, bookingType, teamName, billingMethod, businessNights, leisureNights)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      booking.id,
      booking.hotelId,
      booking.userId,
      booking.checkIn,
      booking.checkOut,
      booking.guests,
      booking.totalPrice,
      booking.currency,
      booking.status,
      booking.paymentStatus,
      booking.createdAt,
      booking.bookingType ?? 'individual',
      booking.teamName ?? null,
      booking.billingMethod ?? 'personal',
      booking.businessNights ?? null,
      booking.leisureNights ?? null
    );
  }

  public confirmBookingPayment(bookingId: string): void {
    this.db.prepare("UPDATE vibe_bookings SET paymentStatus = 'paid', status = 'confirmed' WHERE id = ?").run(bookingId);
  }

  public cancelBooking(bookingId: string): void {
    this.db.prepare("UPDATE vibe_bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
  }

  // Payments Management
  public getPaymentById(paymentId: string): VibePayment | null {
    return this.db.prepare('SELECT * FROM vibe_payments WHERE id = ?').get(paymentId) as VibePayment | null;
  }

  public createPayment(payment: VibePayment): void {
    this.db.prepare('INSERT INTO vibe_payments (id, bookingId, amount, currency, provider, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(payment.id, payment.bookingId, payment.amount, payment.currency, payment.provider, payment.status, payment.createdAt);
  }

  // Promo Codes Management
  public getPromoCode(code: string): VibePromo | null {
    return this.db.prepare('SELECT * FROM vibe_promos WHERE code = ? AND isActive = 1').get(code) as VibePromo | null;
  }

  // Reviews Management
  public getReviewsByHotel(hotelId: string): VibeReview[] {
    return this.db.prepare('SELECT * FROM vibe_reviews WHERE hotelId = ? ORDER BY createdAt DESC').all(hotelId) as VibeReview[];
  }

  public createReview(review: VibeReview): void {
    this.db.prepare('INSERT INTO vibe_reviews (id, hotelId, userId, userName, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(review.id, review.hotelId, review.userId, review.userName, review.rating, review.comment, review.createdAt);
  }
}

export default AppDatabase;
