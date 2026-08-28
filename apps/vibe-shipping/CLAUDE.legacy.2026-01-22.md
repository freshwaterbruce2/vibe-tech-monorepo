# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Progressive Web Application (PWA) for Walmart Distribution Center 8980's shipping department. This is a single-user tool for managing daily door schedules and pallet tracking with offline capabilities and voice command support.

## Development Commands

### Windows Development Environment

```powershell
# Install dependencies
npm install

# Core development
npm run dev          # Start Vite dev server on port 5173
npm run build        # Build for production to dist/
npm run preview      # Preview production build locally

# Testing & Quality
npm test             # Run Jest test suite with coverage
npm run lint         # ESLint analysis (max-warnings 0)
npm run lighthouse   # Run Lighthouse performance audit

# TypeScript compilation
npx tsc --noEmit     # Type-check without emitting files
```

### Legacy Commands (for reference)

```bash
# These commands work on any platform but PowerShell is preferred for Windows development
npm run dev          # Start Vite dev server on port 5173
npm run build        # Build for production to dist/
npm run preview      # Preview production build locally
npm test             # Run Jest test suite with coverage
npm run lint         # ESLint analysis (max-warnings 0)
npm run lighthouse   # Run Lighthouse performance audit
npx tsc --noEmit     # Type-check without emitting files
```

## Architecture & Code Organization

### Application Stack (January 2026)

- **Frontend**: React 19 + TypeScript 5.9+ with Vite 7 bundler
- **Styling**: Tailwind CSS 3.4.18 + shadcn/ui components (Radix UI based)
- **State Management**: 
  - React Context API for user settings
  - Zustand for global state management
  - React Query (TanStack Query) for server state and caching
  - Local state for component-specific data
- **Routing**: React Router v6 with 4 main routes
- **Firebase Integration**: Authentication and Firestore database
- **Forms**: React Hook Form with Zod validation
- **Data Persistence**: 
  - IndexedDB for user settings and preferences
  - LocalStorage for door schedules and pallet data
  - Firebase Firestore for cloud synchronization
- **PWA**: Service Worker with auto-update, offline support
- **Mobile**: Capacitor for native Android/iOS builds

### Directory Structure

```
src/
├── components/         # UI components organized by feature
│   ├── export/        # Data export functionality (CSV, ZIP)
│   ├── layout/        # Navigation and layout components
│   ├── pallets/       # Pallet counting and management
│   ├── pwa/           # PWA installation and wrapper
│   ├── settings/      # User settings panels
│   ├── shipping/      # Door scheduling components
│   ├── ui/            # shadcn/ui base components
│   └── voice/         # Voice command UI and tutorials
├── contexts/          # React Context providers (UserContext)
├── hooks/             # Custom React hooks
│   ├── useSpeechRecognition.tsx  # Web Speech API integration
│   ├── useVoiceCommand.tsx       # Voice command processing
│   ├── usePalletEntries.ts       # Pallet data management
│   ├── useUserSettings.ts        # Settings persistence
│   ├── useTimer.ts               # Timer functionality with start/stop/reset
│   ├── useDebounce.ts            # Debouncing values and callbacks
│   ├── useOnlineStatus.tsx       # Network connectivity monitoring
│   ├── usePwaInstall.tsx         # PWA installation prompts
│   ├── useMobile.tsx             # Mobile device detection
│   ├── useMediaQuery.tsx         # Responsive breakpoint hooks
│   └── use-toast.ts              # Toast notification management
├── pages/             # Route components
│   ├── Index.tsx      # Main door scheduling page
│   ├── PalletCounter.tsx  # Pallet tracking page
│   ├── Notes.tsx      # Notes/documentation page
│   └── Settings.tsx   # Settings configuration page
├── firebase/          # Firebase configuration and services
│   └── config.ts      # Firebase app initialization
├── services/          # Business logic
│   ├── exportService.ts   # CSV/ZIP export functionality
│   └── shippingService.ts # Door schedule operations
├── types/             # TypeScript type definitions
└── utils/             # Utility functions

```

### Key Architectural Patterns

**Component Composition**: Uses compound components pattern with shadcn/ui base components. Components are built as composable units with clear separation of concerns.

**Voice Command System**: Two-layer architecture:

1. `useSpeechRecognition` - Low-level Web Speech API wrapper
2. `useVoiceCommand` - High-level command processing with action handlers

**Data Flow**: 

- Door schedules stored in localStorage as `doorEntries` array
- Pallet counts stored per door in localStorage
- User settings persisted to IndexedDB for durability
- No backend API - fully client-side application

**Error Boundaries**: Multiple layers of error boundaries to prevent full app crashes, especially around voice recognition features.

## Firebase Integration

### Configuration

Firebase services are configured in `src/firebase/config.ts` with environment variables:

**Required Environment Variables**:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id  # Optional
```

### Services Available

- **Authentication**: Firebase Auth for user management
- **Database**: Firestore for cloud data synchronization
- **Offline Support**: Automatic sync when connection restored

### Usage Pattern

```typescript
import { auth, db } from '@/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
```

## State Management Libraries

### Zustand Store

Global state management for cross-component data:

```typescript
// Example store structure
interface AppStore {
  user: User | null;
  settings: UserSettings;
  actions: {
    setUser: (user: User) => void;
    updateSettings: (settings: Partial<UserSettings>) => void;
  };
}
```

### React Query Integration

Server state management and caching:

- Automatic background refetching
- Optimistic updates for mutations
- Error boundary integration
- Loading state management

### Form Handling

**React Hook Form + Zod**:

```typescript
// Form validation pattern
const schema = z.object({
  doorNumber: z.number().min(332).max(454),
  destination: z.enum(['6024', '6070', '6039', '6040', '7045'])
});

const form = useForm<FormData>({
  resolver: zodResolver(schema)
});
```

## Custom Hooks Documentation

### Performance & Optimization

- **useDebounce**: Value and callback debouncing with voice command specialization
- **useTimer**: Timer functionality with start/stop/reset and HH:MM:SS formatting
- **useStableState**: Memory-efficient state updates with comparison functions

### Device & Platform

- **useMobile**: Mobile device detection and responsive behavior
- **useMediaQuery**: CSS media query hooks for breakpoint management
- **useOnlineStatus**: Network connectivity monitoring with service worker integration
- **usePwaInstall**: PWA installation prompts with iOS/Android platform detection

### Specialized Features

- **usePwaInstall**: Handles beforeinstallprompt events and iOS-specific install instructions
- **useOnlineStatus**: Triggers service worker updates when returning online

## Testing Strategy

### Test Configuration

- **Framework**: Jest with ts-jest preset
- **Environment**: jsdom for DOM testing
- **Coverage Threshold**: 70% for all metrics
- **Mock Strategy**: Framer Motion mocked, Web Speech API stubbed

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run specific test file
npm test -- DoorEntryRow.test

# Run tests in watch mode
npm test -- --watch

# Update snapshots
npm test -- -u
```

### Test Organization

- Unit tests co-located with components in `__tests__/` directories
- Integration tests in `src/__tests__/` for cross-component features
- Mocks in `src/__tests__/mocks/` for external dependencies

## PWA & Performance

### Service Worker

- Auto-update strategy with `vite-plugin-pwa`
- Caches all static assets for offline use
- Manifest configured for installable app

### Performance Optimization

- Code splitting via React.lazy for routes
- Manual chunks for vendor libraries (React, Radix UI)
- Lighthouse performance audits via `npm run lighthouse`

### Build Optimization

```javascript
// vite.config.ts manual chunking
manualChunks: {
  vendor: ['react', 'react-dom'],
  ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tooltip']
}
```

## Domain-Specific Business Rules

### Door Number Validation

- Valid range: 332-454 (inclusive)
- Must be sequential when using voice commands
- Validation in `utils/doorUtils.ts`

### Destination DC Options

- Valid values: 6024, 6070, 6039, 6040, 7045
- Stored as strings in data model
- UI uses segmented control for selection

### Freight Types

- Options: "23/43", "28", "XD"
- Default: "23/43"
- Radio button selection in UI

### Trailer Status

- Options: "partial", "empty", "shipload"
- Default: "partial"
- Toggle group component for selection

## Voice Command System

### Command Structure

Voice commands follow patterns defined in `useVoiceCommand.tsx`:

- "door [number]" - Add single door
- "doors [start] to [end]" - Add door range
- "delete door [number]" - Remove door
- "export data" - Trigger CSV export
- Pallet commands when on pallet page

### Configuration

- Confidence threshold: 0.0-1.0 (default 0.7)
- Noise suppression: Configurable in settings
- Language: en-US (hardcoded)

## Data Export

### Export Formats

1. **Single CSV**: All door entries with headers
2. **ZIP Archive**: Multiple CSV files (doors, pallets, summary)

### Export Service

Located in `services/exportService.ts`:

- Uses `file-saver` library for downloads
- `jszip` for ZIP creation
- Timestamp-based filenames

## Development Guidelines

### Type Safety

- Strict TypeScript configuration enabled
- All components must have proper type definitions
- Avoid `any` types except in test files

### Component Patterns

```typescript
// Use compound components for complex UI
<Dialog>
  <DialogTrigger />
  <DialogContent>
    <DialogHeader />
    <DialogFooter />
  </DialogContent>
</Dialog>
```

### State Management

- Use Context API sparingly (only for cross-cutting concerns)
- Prefer Zustand for global state that needs to be shared across components
- Use React Query for server state and API data caching
- Custom hooks for reusable stateful logic
- Local state for component-specific data

### Form Development

- Use React Hook Form for form state management
- Implement Zod schemas for runtime validation
- Co-locate form validation schemas with components
- Handle form errors with toast notifications

### Error Handling

- Wrap risky operations in try-catch blocks
- Use Error Boundaries for component tree protection
- Toast notifications for user-facing errors via `useToast`

## Common Development Tasks

### Adding a New Route

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx` Routes component
3. Update navigation in `src/components/layout/TopNav.tsx`

### Creating a New Voice Command

1. Add command pattern in `useVoiceCommand.tsx`
2. Implement action handler in the hook
3. Add to voice command help documentation
4. Write tests in `__tests__/useVoiceCommand.test.tsx`

### Adding a New shadcn/ui Component

```bash
# Components are already installed, but pattern for reference:
# npx shadcn-ui@latest add [component-name]
```

### Modifying PWA Manifest

Edit `vite.config.ts` in the VitePWA plugin configuration. Changes include app name, icons, theme colors, and display mode.

### Creating a Form with Validation

1. Define Zod schema for validation rules
2. Create form component using React Hook Form
3. Implement error handling with toast notifications
4. Add form to appropriate page component

### Integrating Firebase Service

1. Add service methods in `src/firebase/` directory
2. Import and use auth/db from `src/firebase/config.ts`
3. Handle authentication state with custom hooks
4. Implement offline-first data synchronization

### Adding a Custom Hook

1. Create hook file in `src/hooks/` following naming convention
2. Implement proper TypeScript types and error handling
3. Add unit tests in `src/hooks/__tests__/`
4. Document hook purpose and usage patterns

### Mobile App Development

1. Make web changes and test in browser
2. Run `npm run build` to create production assets
3. Run `npx cap sync` to update native projects
4. Test in Android Studio or Xcode simulators
5. Deploy to device for real-world testing

## Deployment Considerations

### Environment Requirements

- HTTPS required for:
  - Service Worker registration
  - Web Speech API access
  - PWA installation
- Modern browser with Web Speech API support

### Build Output

- Static files in `dist/` directory
- Ready for deployment to any static hosting service
- No server-side rendering or API requirements

## Capacitor Mobile Deployment

### Configuration

Capacitor is configured in `capacitor.config.ts`:

```typescript
{
  appId: 'com.walmart.dc8980.shipping',
  appName: 'DC8980 Shipping',
  webDir: 'dist'
}
```

### Android Build Process

```bash
# Initial setup (first time only)
npm run build                    # Build web assets
npx cap add android             # Add Android platform

# Development workflow
npm run build                    # Build latest web changes
npx cap sync                     # Sync web assets to native projects
npx cap open android            # Open in Android Studio

# Alternative: Run on device directly
npx cap run android             # Build and run on connected device
```

### iOS Build Process

```bash
# Initial setup (first time only)
npm run build                    # Build web assets
npx cap add ios                 # Add iOS platform

# Development workflow
npm run build                    # Build latest web changes
npx cap sync                     # Sync web assets to native projects
npx cap open ios                # Open in Xcode
```

### Native Features Integration

- **Splash Screen**: Configured via Capacitor plugins
- **App Icons**: Generated for all required sizes
- **Permissions**: Camera, microphone, and storage access
- **Status Bar**: Customized for brand consistency

### Build Requirements

- **Android**: Android Studio with SDK 21+ (Android 5.0)
- **iOS**: Xcode 12+ with iOS 13+ deployment target
- **Signing**: Code signing certificates for distribution

## Additional Configuration Files

### Key Configuration Files

- **capacitor.config.ts**: Native app configuration and build settings
- **postcss.config.js**: PostCSS configuration for Tailwind processing
- **tailwind.config.ts**: Tailwind CSS customization and theme
- **jest.config.cjs**: Jest testing framework configuration
- **eslint.config.js**: ESLint rules and TypeScript integration
