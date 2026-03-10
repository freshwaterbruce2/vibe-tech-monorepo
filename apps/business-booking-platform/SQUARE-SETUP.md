# Square Payment Setup Guide

## Overview

Complete guide to set up **real Square payments** for the VIBE HOTELS booking platform.

## Square Developer Account Setup

### 1. Create Square Developer Account

1. Visit [Square Developer Dashboard](https://developer.squareup.com/)
2. Sign up or log in with your Square business account
3. Create a new application: **"VIBE HOTELS Booking Platform"**
4. Note your **Application ID** from the dashboard

### 2. Get Sandbox Credentials (Development)

```bash
# From Square Developer Dashboard > Applications > Your App > Sandbox
SANDBOX_APPLICATION_ID="sandbox-sq0idb-XXXXXXXXXXXXXXXXXX"
SANDBOX_ACCESS_TOKEN="sandbox-sq0atb-XXXXXXXXXXXXXXXXXX"  
SANDBOX_LOCATION_ID="LXXXXXXXXXXXXXXXXX"
```

### 3. Get Production Credentials (Live Payments)  

```bash
# From Square Developer Dashboard > Applications > Your App > Production
PRODUCTION_APPLICATION_ID="sq0idb-XXXXXXXXXXXXXXXXXX"
PRODUCTION_ACCESS_TOKEN="sq0atr-XXXXXXXXXXXXXXXXXX"
PRODUCTION_LOCATION_ID="LXXXXXXXXXXXXXXXXX"
```

## Frontend Configuration

### 1. Environment Variables (`.env`)

```bash
# Square Frontend Configuration
VITE_SQUARE_APPLICATION_ID="sandbox-sq0idb-XXXXXXXXXXXXXXXXXX"
VITE_SQUARE_LOCATION_ID="LXXXXXXXXXXXXXXXXX"
```

## Backend Configuration

### 1. Environment Variables (`backend/.env`)

```bash
# Square Backend Configuration  
SQUARE_ACCESS_TOKEN="sandbox-sq0atb-XXXXXXXXXXXXXXXXXX"
SQUARE_APPLICATION_ID="sandbox-sq0idb-XXXXXXXXXXXXXXXXXX"
SQUARE_ENVIRONMENT="sandbox"
SQUARE_LOCATION_ID="LXXXXXXXXXXXXXXXXX"
SQUARE_WEBHOOK_SIGNATURE_KEY="your_webhook_signature_key"
```

## Testing

### Test Card Numbers (Sandbox Only)

```bash
# Successful Payments
4111111111111111  # Visa
5555555555554444  # Mastercard
378282246310005   # American Express

# Declined Payments  
4000000000000002  # Generic decline
4000000000009995  # Insufficient funds
```

### Test Flow

1. **Start Backend**: `cd backend && npm run dev:local`
2. **Start Frontend**: `npm run dev`
3. **Navigate to Booking**: Complete hotel selection
4. **Enter Payment**: Use test card `4111111111111111`
5. **Submit Payment**: Verify success/failure handling

## Key Features

- ✅ **PCI DSS Compliant** - Card details never touch your servers
- ✅ **Real-time Processing** - Instant payment authorization
- ✅ **Refund Support** - Automated refund processing
- ✅ **Receipt Generation** - Square-hosted receipt URLs
- ✅ **Webhook Integration** - Real-time payment status updates

**Ready to process real payments! 💳✨**
