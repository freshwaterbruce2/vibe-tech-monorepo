# Vibe Booking - Luxury Hotel Booking Platform

A professional hotel booking platform built with React, TypeScript, and AI-powered search capabilities. Featuring a **2025 luxury design system** with hospitality-grade UI matching Marriott/Hilton standards. Vibe Booking combines cutting-edge technology with sophisticated design to create the ultimate luxury hotel booking experience.

**✨ Latest Update (August 2025)**: Complete professional redesign with research-backed color psychology, luxury visual elements, and industry-standard sophistication.

## Features

### 🎨 **Luxury Design System (2025)**

- **Professional Color Palette**: Research-backed navy/gold/mocha combinations
- **Luxury Shadows**: 5-tier shadow system with professional depth
- **Uniform Components**: Standardized button sizing and sophisticated gradients
- **Premium Typography**: Gradient headlines and refined font hierarchy
- **Elegant Animations**: Hardware-accelerated micro-interactions

### 🚀 **Core Functionality**

- 🤖 **AI-Powered Search**: Natural language hotel search using OpenAI
- 💎 **Luxury Passion Matching**: 7 sophisticated travel categories with professional cards
- 🏨 **Comprehensive Booking**: Multi-step booking flow with payment integration
- 🌍 **Global Hotels**: Integration with LiteAPI for real hotel data
- 💳 **Square Payments**: Primary provider with idempotent booking payments
- 🅿️ **PayPal (Simulated)**: Optional order/capture flow scaffold

### 📱 **Technical Excellence**

- **PWA Ready**: Progressive Web App capabilities
- **Dark Mode**: Luxury dark theme with sophisticated colors
- **Accessible**: WCAG 2.1 AA compliant with professional focus states
- **Performance**: 95.91 kB JS (gzipped), <8s build time
- **Mobile-First**: Responsive luxury design across all devices

## Tech Stack

- **Frontend**: React 19, TypeScript 5.9+, Vite 7
- **Styling**: Tailwind CSS, Framer Motion
- **State Management**: Zustand with persistence
- **Routing**: React Router v6
- **API**: Axios, React Query
- **Testing**: Vitest, React Testing Library, Playwright
- **Backend**: Express.js (legacy integration)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start backend server (for API integration)
cd backend
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

## Project Structure

```text
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, Card)
│   ├── layout/         # Layout components (Header, Footer)
│   ├── search/         # Search-related components
│   ├── hotels/         # Hotel display components
│   ├── booking/        # Booking flow components
│   └── passion/        # Passion-based features
├── pages/              # Page components
├── store/              # Zustand stores
├── services/           # API services
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
VITE_API_URL=http://localhost:3001
VITE_OPENAI_API_KEY=your_openai_key
VITE_LITEAPI_KEY=your_liteapi_key
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_WEBHOOK_SIGNATURE_KEY=optional_signature_key
# Optional simulated PayPal (no real API calls yet)
PAYPAL_CLIENT_ID=placeholder
PAYPAL_CLIENT_SECRET=placeholder
PAYPAL_ENVIRONMENT=sandbox
```

## API Integration

The frontend connects to the modern TypeScript backend in `backend/` which provides:

- Hotel search via LiteAPI
- OpenAI natural language processing
- Booking management
- Payment processing

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/create | Create & capture Square payment (sourceId nonce) |
| POST | /api/payments/paypal/order | Create simulated PayPal order (records pending payment) |
| POST | /api/payments/paypal/capture | Capture simulated PayPal order (marks succeeded) |
| GET | /api/payments/booking/:id | List payments & refunds for booking |
| POST | /api/payments/refund | Create Square refund |
| GET | /api/payments/history | Paginated user payment history |
| GET | /api/payments/stats | Basic revenue stats |

Notes:

- Idempotent booking payments: second succeeded attempt returns existing record.
- Booking auto-confirm only when payment status transitions to succeeded.
- Square webhook endpoint at `/api/payments/webhook/square` expects raw body (configure in Square dashboard).
- Legacy Stripe code replaced with inert stubs and safe to remove later.

## Passion-Based Matching

The application includes a sophisticated luxury passion-based recommendation system with 7 professionally curated travel categories:

### 🍽️ **Culinary Excellence**

Michelin-starred dining, wine tastings, and gourmet experiences with sommelier services

### 🧘 **Wellness Sanctuary** 

World-class spas, meditation retreats, and holistic wellness programs

### 🏛️ **Cultural Immersion**

Historic landmarks, world-class museums, and artistic heritage experiences

### 🏔️ **Adventure Escapes**

Exclusive outdoor experiences and luxury adventure activities with premium guides

### 💼 **Business Elite**

Executive lounges, conference facilities, and premium business services

### 👨‍👩‍👧‍👦 **Family Luxury**

Premium family suites, sophisticated kids clubs, and elegant family experiences

### 💕 **Romantic Elegance**

Private villas, couples spa treatments, and intimate luxury settings

Each category features:

- **Uniform Card Design**: 320px height with professional gradients
- **Luxury Icons**: Professional Lucide React icons with sophisticated backgrounds
- **Smooth Interactions**: 500ms transitions with elegant hover effects
- **Research-Based Colors**: Hospitality psychology-optimized color combinations

## Development

### Code Style

- Use TypeScript for all new code
- Follow React best practices with functional components and hooks
- Use Tailwind CSS for styling
- Implement proper error boundaries
- Write tests for critical functionality

### Git Workflow

```bash
git checkout -b feature/your-feature
# Make changes
npm run lint && npm run typecheck && npm test
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

## Production Deployment

**Current Deployment**: [https://vibe-booking.netlify.app/](https://vibe-booking.netlify.app/)

### Build Performance (August 2025)

- **CSS**: 70.67 kB (gzipped: 10.97 kB) - Includes luxury design system
- **JavaScript**: 95.91 kB (gzipped) - Optimized with code splitting
- **Build Time**: ~7-8 seconds for complete production build
- **Bundle Chunks**: Optimized vendor, UI, and forms separation

### Deployment Steps

```bash
npm run build
# Drag the dist/ folder to Netlify dashboard for instant deployment
```

The application is optimized for static hosting platforms with:

- Fast search with 1-second timeout fallback to mock data
- Professional luxury animations with hardware acceleration
- Efficient CSS custom properties for luxury shadow system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all checks pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details
