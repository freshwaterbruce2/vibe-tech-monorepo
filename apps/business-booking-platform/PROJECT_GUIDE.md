# Business Booking Platform - Project Guide

**Project Path:** `C:\dev\apps\business-booking-platform`  
**Type:** Full-Stack Web Application (React/TypeScript)  
**Deployment:** Netlify/Railway  
**Status:** Production Ready

---

## 🎯 Project Overview

Full-stack booking and reservation platform for businesses. Features payment processing (Square integration), booking management, customer portal, and admin dashboard. Built with modern web technologies and ready for production deployment.

### Key Features

- Online booking system
- Payment processing (Square)
- Customer management
- Admin dashboard
- Email notifications
- Calendar integration
- Real-time availability
- Responsive design
- PWA support

---

## 📁 Project Structure

```
business-booking-platform/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utilities
│   ├── store/           # State management
│   └── types/           # TypeScript types
├── backend/             # Backend services
│   ├── api/            # API endpoints
│   ├── services/       # Business logic
│   ├── database/       # Database operations
│   └── middleware/     # Express middleware
├── public/             # Static assets
├── tests/              # Test files
├── deployment/         # Deployment configs
├── docs/               # Documentation
├── .env.example        # Environment template
└── package.json
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\business-booking-platform

# Install dependencies
pnpm install

# Copy environment template
Copy-Item .env.example .env
code .env

# Initialize database (if using local)
pnpm db:init

# Start development server
pnpm dev
```

### Required Environment Variables

```bash
# .env file
# Square Payment
VITE_SQUARE_APPLICATION_ID=your_app_id
VITE_SQUARE_LOCATION_ID=your_location_id
SQUARE_ACCESS_TOKEN=your_access_token

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bookings

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password

# App URL
VITE_APP_URL=http://localhost:5173
```

### Development Server

```powershell
# Start frontend + backend
pnpm dev

# Frontend only
pnpm dev:frontend

# Backend only
pnpm dev:backend

# With mock data
pnpm dev --mock

# Access at: http://localhost:5173
```

---

## 🏗️ Building & Deployment

### Local Build

```powershell
# Production build
pnpm build

# Preview production build
pnpm preview

# Test production build locally
pnpm build && pnpm preview
```

### Build Output

```
dist/
├── assets/          # Compiled JS/CSS
├── index.html       # Entry HTML
└── ...
```

### Deployment

#### Netlify

```powershell
# Install Netlify CLI (first time)
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# Or use automatic deployment
# Push to main branch → auto-deploy
```

**Config:** `netlify.toml`

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Railway

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up

# Or connect GitHub repo for auto-deploy
```

**Config:** `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## 💳 Square Payment Integration

### Setup

1. **Get Square Credentials:**
   - Create account at <https://squareup.com>
   - Get Application ID and Location ID
   - Generate Access Token

2. **Configure Environment:**

```bash
VITE_SQUARE_APPLICATION_ID=sandbox-sq0idb-xxx
VITE_SQUARE_LOCATION_ID=LXXX
SQUARE_ACCESS_TOKEN=EAAAEOxxx
```

1. **Test Mode:**
   - Use sandbox credentials for testing
   - Test card: 4111 1111 1111 1111

### Implementation

```typescript
// src/services/payment.ts
import { Square } from '@square/web-sdk';

export async function initializeSquare() {
  const payments = Square.payments(
    process.env.VITE_SQUARE_APPLICATION_ID!,
    process.env.VITE_SQUARE_LOCATION_ID!
  );
  
  return payments;
}

export async function processPayment(amount: number, cardToken: string) {
  const response = await fetch('/api/payments/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, cardToken })
  });
  
  return response.json();
}
```

### Testing Payments

```powershell
# Run payment test server
pnpm dev:payment

# Test payment flow
pnpm test:payment

# Simple payment server
node simple-payment-server.cjs
```

---

## 📊 Database Management

### Schema

```sql
-- Bookings
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    service_id INTEGER,
    booking_date TIMESTAMP,
    status VARCHAR(50),
    payment_status VARCHAR(50),
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    duration INTEGER,
    price DECIMAL(10,2),
    active BOOLEAN DEFAULT true
);
```

### Database Operations

```powershell
# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Reset database
pnpm db:reset

# Backup
pnpm db:backup
```

---

## 🧪 Testing

### Unit Tests

```powershell
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### E2E Tests

```powershell
# Playwright tests
pnpm test:e2e

# With UI
pnpm test:e2e:ui

# Specific test
pnpm test:e2e tests/booking-flow.spec.ts
```

### Test Files

```
tests/
├── unit/
│   ├── components/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   └── booking-flow/
└── e2e/
    ├── booking.spec.ts
    ├── payment.spec.ts
    └── admin.spec.ts
```

---

## 🎨 Frontend Development

### Component Structure

```typescript
// src/components/BookingForm.tsx
import { useState } from 'react';
import { useBooking } from '@/hooks/useBooking';

export const BookingForm = () => {
  const { createBooking, loading } = useBooking();
  const [formData, setFormData] = useState({
    service: '',
    date: '',
    time: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBooking(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

### Custom Hooks

```typescript
// src/hooks/useBooking.ts
import { useState } from 'react';
import { bookingService } from '@/services/booking';

export const useBooking = () => {
  const [loading, setLoading] = useState(false);

  const createBooking = async (data: BookingData) => {
    setLoading(true);
    try {
      const result = await bookingService.create(data);
      return result;
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, loading };
};
```

---

## 🔧 Backend Development

### API Endpoints

```typescript
// backend/api/bookings.ts
import express from 'express';

const router = express.Router();

// Get all bookings
router.get('/bookings', async (req, res) => {
  const bookings = await db.getBookings();
  res.json(bookings);
});

// Create booking
router.post('/bookings', async (req, res) => {
  const booking = await db.createBooking(req.body);
  res.json(booking);
});

export default router;
```

### Services

```typescript
// backend/services/booking.ts
export class BookingService {
  async createBooking(data: BookingData) {
    // Validate
    this.validate(data);
    
    // Check availability
    const available = await this.checkAvailability(data);
    if (!available) throw new Error('Not available');
    
    // Create booking
    const booking = await db.create(data);
    
    // Send confirmation email
    await emailService.sendConfirmation(booking);
    
    return booking;
  }
}
```

---

## 🔧 Troubleshooting

### Build Issues

```powershell
# Clear cache
Remove-Item -Recurse -Force node_modules, .next, dist
pnpm install
pnpm build
```

### Square Payment Issues

```powershell
# Verify credentials
node -e "console.log(process.env.VITE_SQUARE_APPLICATION_ID)"

# Test connection
pnpm test:square

# Check Square dashboard for errors
# https://squareup.com/dashboard
```

### Database Connection Issues

```powershell
# Test connection
pnpm db:test

# Check DATABASE_URL
echo $env:DATABASE_URL

# Reset connection pool
pnpm db:reset-pool
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview
- `DEPLOYMENT.md` - Deployment guide
- `PRODUCTION-DEPLOYMENT.md` - Production checklist
- `STATUS.md` - Current status
- `SQUARE-SETUP.md` - Square integration

### Deployment Docs

- `GITHUB-SETUP.md` - GitHub CI/CD
- `IMMEDIATE-REVENUE.md` - Monetization

---

## 🔄 Maintenance

### Daily

```powershell
# Check error logs
# View in Netlify/Railway dashboard

# Monitor uptime
# Use UptimeRobot or similar
```

### Weekly

```powershell
# Update dependencies
pnpm update

# Review analytics
# Check booking metrics

# Test payment flow
pnpm test:payment
```

### Monthly

```powershell
# Security audit
pnpm audit

# Performance check
pnpm lighthouse

# Backup database
pnpm db:backup
```

---

## 🎯 Key Features

### Booking Management

- Service selection
- Date/time picker
- Availability check
- Booking confirmation

### Payment Processing

- Square integration
- Secure checkout
- Payment confirmation
- Receipt generation

### Customer Portal

- View bookings
- Modify bookings
- Payment history
- Profile management

### Admin Dashboard

- Booking overview
- Customer management
- Service management
- Analytics

---

**Last Updated:** January 2, 2026  
**Deployment:** Netlify/Railway  
**Status:** Production Ready

