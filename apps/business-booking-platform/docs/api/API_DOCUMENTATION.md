# Enhanced Hotel Booking API Documentation

## Overview

The enhanced hotel booking backend provides comprehensive 2025-level features including transparent pricing, multi-currency support, real-time updates via WebSocket, advanced caching, and intelligent error handling.

## Base URL

- Development: `http://localhost:3001`
- Production: `https://your-domain.com`

## Authentication

- Environment-based API keys (sandbox/production)
- Rate limiting: 100 requests per 15 minutes per IP
- Search endpoint: 30 requests per minute per IP

## Enhanced Endpoints

### 1. Search Hotels (Enhanced)

```
GET /api/search-hotels
```

**Parameters:**

- `q` (required): Natural language search query
- `environment` (required): "sandbox" or "production"
- `currency` (optional): Currency code (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY)
- `locale` (optional): Language locale (default: "en")

**Enhanced Features:**

- AI-powered natural language processing
- Fallback parsing when AI is unavailable
- Multi-currency conversion with real-time rates
- Transparent price breakdowns
- Response caching (5 minutes)
- Search analytics tracking
- Enhanced error handling with suggestions

**Example Request:**

```
GET /api/search-hotels?q=hotels in Paris for 2 adults next weekend&environment=sandbox&currency=EUR
```

**Enhanced Response:**

```json
{
  "funnyResponse": "Paris for the weekend? Très bon choice! Let me find you the perfect Parisian hideaway.",
  "hotelData": {
    "rates": [
      {
        "hotelId": "123456",
        "hotel": {
          "name": "Hotel Paris Central",
          "starRating": 4,
          "amenities": ["wifi", "breakfast", "gym"],
          "distanceFromCity": "0.5 km",
          "lastUpdated": "2025-08-03T10:30:00.000Z"
        },
        "roomTypes": [
          {
            "rates": [
              {
                "name": "Standard Double Room",
                "originalPrice": 150.0,
                "convertedPrice": 127.5,
                "currency": "EUR",
                "averageNightlyRate": 63.75,
                "totalNights": 2,
                "priceBreakdown": {
                  "subtotal": 127.5,
                  "taxes": 15.3,
                  "serviceFee": 5.0,
                  "cleaningFee": 15.0,
                  "totalTaxesAndFees": 35.3,
                  "total": 162.8,
                  "currency": "EUR"
                },
                "cancellationPolicies": {
                  "refundableTag": "RFN"
                },
                "lastUpdated": "2025-08-03T10:30:00.000Z"
              }
            ]
          }
        ],
        "searchParams": {
          "city": "Paris",
          "countryCode": "FR",
          "checkin": "2025-08-09",
          "checkout": "2025-08-11",
          "adults": 2
        },
        "responseTime": 1250
      }
    ],
    "totalResults": 15,
    "currency": "EUR",
    "currencyRate": 0.85,
    "responseTime": 1250,
    "timestamp": "2025-08-03T10:30:00.000Z"
  },
  "analytics": {
    "totalSearches": 1247,
    "avgResponseTime": 987
  },
  "cached": false
}
```

### 2. Price Breakdown (NEW)

```
GET /api/price-breakdown
```

**Parameters:**

- `basePrice` (required): Base price amount
- `currency` (optional): Currency code (default: USD)
- `nights` (optional): Number of nights (default: 1)

**Response:**

```json
{
  "breakdown": {
    "subtotal": 150.0,
    "taxes": 18.0,
    "serviceFee": 5.0,
    "cleaningFee": 15.0,
    "totalTaxesAndFees": 38.0,
    "total": 188.0,
    "currency": "USD"
  },
  "availableCurrencies": ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"],
  "lastUpdated": "2025-08-03T10:30:00.000Z"
}
```

### 3. Search Suggestions (NEW)

```
GET /api/search-suggestions
```

**Parameters:**

- `query` (required): Partial search query (min 2 characters)
- `limit` (optional): Number of suggestions (default: 5)

**Response:**

```json
{
  "suggestions": [
    {
      "city": "Paris",
      "searchCount": 245,
      "suggestion": "Hotels in Paris for weekend getaway"
    },
    {
      "city": "London",
      "suggestion": "Hotels in London for business trip"
    }
  ],
  "totalSearches": 1247,
  "timestamp": "2025-08-03T10:30:00.000Z"
}
```

### 4. Enhanced Rate Search

```
GET /search-rates
```

**Enhanced Parameters:**

- `checkin` (required): Check-in date (YYYY-MM-DD)
- `checkout` (required): Check-out date (YYYY-MM-DD)
- `adults` (required): Number of adults
- `hotelId` (required): Hotel ID
- `environment` (required): "sandbox" or "production"
- `currency` (optional): Currency code (default: USD)

**Enhanced Features:**

- Response caching (5 minutes)
- Multi-currency conversion
- Transparent price breakdowns
- Enhanced validation
- Parallel API calls for better performance

### 5. Analytics (NEW)

```
GET /api/analytics
```

**Response:**

```json
{
  "totalSearches": 1247,
  "searchErrors": 23,
  "avgResponseTime": 987,
  "successRate": 98,
  "topDestinations": [
    { "city": "Paris", "searches": 245 },
    { "city": "London", "searches": 189 }
  ],
  "cacheStats": {
    "keys": 42,
    "hits": 156,
    "misses": 89
  },
  "timestamp": "2025-08-03T10:30:00.000Z"
}
```

### 6. Health Check (NEW)

```
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-08-03T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "openai": true,
    "liteapi_sandbox": true,
    "liteapi_production": true,
    "cache": true,
    "database": true
  },
  "performance": {
    "uptime": 3600,
    "memoryUsage": {
      "rss": 45678912,
      "heapTotal": 25165824,
      "heapUsed": 18456789
    },
    "avgResponseTime": 987
  }
}
```

## WebSocket Real-time Updates

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'analytics_update') {
    console.log('Live analytics:', data.data);
  }
};
```

**Message Types:**

- `connection`: Initial connection confirmation
- `analytics_update`: Periodic analytics updates (every 30 seconds)

## Error Handling

### Enhanced Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "suggestions": ["Helpful suggestion 1", "Helpful suggestion 2"],
  "timestamp": "2025-08-03T10:30:00.000Z"
}
```

### Common Error Codes

- `INVALID_QUERY`: Search query validation failed
- `AI_SERVICE_UNAVAILABLE`: OpenAI service temporarily unavailable
- `INCOMPLETE_SEARCH_PARAMS`: Missing required search parameters
- `INVALID_CHECKIN_DATE`: Check-in date is in the past
- `INVALID_CHECKOUT_DATE`: Check-out date is invalid
- `NO_HOTELS_FOUND`: No hotels available for location/dates
- `API_KEY_MISSING`: LiteAPI key not configured
- `LITEAPI_ERROR`: Error from LiteAPI service
- `RATES_FETCH_ERROR`: Error fetching hotel rates
- `PREBOOK_ERROR`: Error during prebook process

## Performance Features

### Caching Strategy

- Search results: 5 minutes TTL
- Currency rates: 1 hour TTL
- Hotel rates: 5 minutes TTL

### Response Optimization

- Request batching for parallel API calls
- Exponential backoff retry mechanism (max 3 attempts)
- Response compression enabled
- Memory-efficient caching with cleanup

### Rate Limiting

- Global API limit: 100 requests/15min per IP
- Search endpoint: 30 requests/min per IP
- WebSocket connections: No limit

## Security Features

### Headers & Protection

- Helmet.js security headers
- Content Security Policy configured
- CORS properly configured for production
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Logging & Monitoring

- Comprehensive request logging
- Error tracking with stack traces
- Performance metrics collection
- Winston logger with file rotation
- IP-based request tracking

## Currency Support

**Supported Currencies:**

- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- CHF (Swiss Franc)
- CNY (Chinese Yuan)

**Exchange Rate Provider:**

- Primary: ExchangeRate-API
- Fallback: Hardcoded rates
- Update frequency: 1 hour
- Cache duration: 1 hour

## Environment Variables

```bash
# Required
OPEN_API_KEY=your_openai_api_key
SAND_API_KEY=your_liteapi_sandbox_key
PROD_API_KEY=your_liteapi_production_key

# Optional
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Migration from Original API

The enhanced API maintains backward compatibility with the original endpoints:

- `/api/search-hotels` - Enhanced with new features
- `/search-rates` - Enhanced with currency support
- `/prebook` - Enhanced with better error handling
- `/book` - Enhanced with validation

**New Endpoints Added:**

- `/api/price-breakdown`
- `/api/search-suggestions`
- `/api/analytics`
- `/api/health`
- WebSocket endpoint for real-time updates

## Usage Examples

### Basic Search with AI

```javascript
const response = await fetch(
  '/api/search-hotels?q=luxury hotels in Tokyo for 2 adults next month&environment=sandbox&currency=JPY',
);
const data = await response.json();
```

### Get Price Breakdown

```javascript
const response = await fetch('/api/price-breakdown?basePrice=200&currency=EUR&nights=3');
const breakdown = await response.json();
```

### Check System Health

```javascript
const response = await fetch('/api/health');
const health = await response.json();
if (health.status === 'healthy') {
  console.log('All systems operational');
}
```

This enhanced API provides a modern, scalable, and user-friendly hotel booking experience with transparent pricing, intelligent search, and comprehensive error handling.
