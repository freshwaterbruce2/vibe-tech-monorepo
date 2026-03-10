# Hotel Booking Backend - SQLite Local Development Setup

This guide explains how to set up and use the SQLite database for local development of the Hotel Booking platform.

## ✅ Setup Completed Successfully

The SQLite setup has been implemented and tested. You can now run the hotel booking backend locally with SQLite instead of PostgreSQL.

## Quick Start

### Automated Setup (Recommended)

```bash
cd backend
npm run local
```

This single command will:

- Install dependencies if needed
- Set up the SQLite database on D: drive (or fallback location)
- Create all necessary tables with indexes
- Seed the database with sample data
- Start the development server

### Manual Setup

If you prefer to run each step manually:

```bash
# 1. Install dependencies
npm install

# 2. Set up the database
npm run db:setup:local

# 3. Seed with sample data
npm run db:seed:local

# 4. Start the development server
npm run dev:local
```

## Database Location

The SQLite database will be stored at:

- **Primary**: `D:/hotel-booking.db` (if D: drive exists)
- **Fallback**: `./data/hotel-booking.db` (if D: drive is not accessible)

## Sample Data

The seeded database includes:

### Users (3 accounts)

- **Admin**: <admin@hotelbooking.com> / admin123
- **User 1**: <john.doe@example.com> / password123  
- **User 2**: <jane.smith@example.com> / password123

### Hotels (3 properties)

- **Grand Palace Hotel** - Luxury 5-star in NYC
- **Seaside Resort & Spa** - Beachfront resort in Miami
- **Business Center Inn** - Business hotel in Chicago

### Sample Bookings & Payments

- Confirmed booking with Stripe test payment
- Complete payment and review history

## Environment Configuration

When using SQLite mode, the following environment variables are automatically set:

```bash
LOCAL_SQLITE=true
NODE_ENV=development
```

## API Endpoints

All existing API endpoints work with SQLite:

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`

### Hotels

- `GET /api/hotels` - Search hotels
- `GET /api/hotels/:id` - Get hotel details
- `POST /api/hotels` - Create hotel (admin)

### Bookings  

- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details

### Payments

- `POST /api/payments` - Process payment
- `GET /api/payments/:id` - Get payment details

### Reviews

- `POST /api/reviews` - Create review
- `GET /api/reviews` - Get reviews for hotel

## Features Supported

### ✅ Fully Supported

- User authentication & authorization
- Hotel search and filtering
- Booking creation and management
- Stripe payment integration (test mode)
- Review system
- Admin panel functionality
- Full-text search capabilities
- Passion-based hotel matching
- File uploads and media handling

### ⚠️ Limited Support

- Some PostgreSQL-specific optimizations are not available
- Advanced spatial queries use simplified implementations
- Full-text search uses SQLite FTS instead of PostgreSQL tsvector

## Database Schema

The SQLite schema mirrors the PostgreSQL schema with these adaptations:

- `UUID` → `TEXT` with crypto.randomUUID()
- `JSONB` → `TEXT` with JSON mode
- `TIMESTAMP` → `INTEGER` with timestamp mode
- `NUMERIC` → `REAL` for decimal values
- `BOOLEAN` → `INTEGER` with boolean mode

## Performance Optimizations

The SQLite setup includes:

- WAL mode for better concurrency
- Optimized cache size (64MB)
- Foreign key enforcement
- Comprehensive indexing strategy
- Connection pooling simulation

## Troubleshooting

### Database Not Found

If the database setup fails:

```bash
rm -f D:/hotel-booking.db  # or ./data/hotel-booking.db
npm run db:setup:local
npm run db:seed:local
```

### Permission Issues

If you can't write to D: drive:

- The system will automatically fallback to `./data/hotel-booking.db`
- Ensure the backend directory is writable

### Port Conflicts

If port 3001 is in use:

```bash
PORT=3002 npm run dev:local
```

### Missing Dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

## Testing

### Automated API Testing

```bash
# Run comprehensive API tests (includes server startup/shutdown)
npm run test:sqlite
```

### Manual Testing

```bash
# Start the server manually
npm run dev:local

# In another terminal, test specific endpoints
curl -X GET http://localhost:3001/health
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotelbooking.com","password":"admin123"}'
```

## Development Workflow

1. **Start Development**: `npm run local`
2. **Make Code Changes**: Server auto-reloads with tsx watch
3. **Test API**: Use `npm run test:sqlite`, Postman, curl, or frontend application
4. **Reset Database**: Re-run setup script to reset data
5. **Switch to Production**: Remove LOCAL_SQLITE environment variable

## Production Deployment

To deploy to production with PostgreSQL:

1. Remove or set `LOCAL_SQLITE=false`
2. Configure PostgreSQL connection in `.env`
3. Run PostgreSQL migrations
4. Deploy as normal

The codebase seamlessly switches between SQLite (local) and PostgreSQL (production) based on the `LOCAL_SQLITE` environment variable.

## Support

For issues with the SQLite setup:

1. Check the console logs for specific error messages
2. Verify database file permissions
3. Ensure all dependencies are installed
4. Try the manual setup steps individually
