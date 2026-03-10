# Sentry Error Monitoring Integration

This document outlines the complete Sentry integration for the DC8980 Shipping PWA, providing production-ready error monitoring and performance tracking.

## Overview

Sentry has been fully integrated to replace placeholder TODOs in the error handling system, providing:

- **Real-time Error Monitoring**: Automatic capture and reporting of JavaScript errors
- **Performance Monitoring**: Transaction tracking and Core Web Vitals
- **Error Context**: Rich debugging information including user actions, browser details, and application state
- **Release Tracking**: Automatic source map upload for production debugging
- **User Session Tracking**: Optional session replay for error reproduction

## Integration Components

### 1. Dependencies Added

```json
{
  "@sentry/react": "^8.42.0",
  "@sentry/vite-plugin": "^2.22.7"
}
```

### 2. Core Configuration (`src/lib/sentry.ts`)

**Features:**

- Environment-based initialization (development vs production)
- Performance monitoring with browser tracing
- Session replay for error reproduction
- Configurable sampling rates
- Automatic user context setting
- Breadcrumb logging for debugging

**Key Functions:**

- `initializeSentry()`: Initialize Sentry with proper configuration
- `captureError()`: Capture errors with context
- `captureMessage()`: Log informational messages
- `addBreadcrumb()`: Add debugging breadcrumbs
- `setUser()`, `setContext()`, `setTags()`: Set debugging context

### 3. Error Boundary Integration (`src/components/ErrorBoundary.tsx`)

**Replaced TODO at line 54:**

- Automatic error capture with component stack traces
- Rich context including props and component hierarchy
- Breadcrumb logging for user actions leading to error
- Proper error fingerprinting for duplicate detection

### 4. Error Handling Service (`src/utils/errorHandling.ts`)

**Replaced TODO at line 275:**

- Complete integration with `logToExternalService()` function
- Automatic error categorization and tagging
- Context enrichment with user agent, URL, and timestamp
- Configurable error levels based on recoverability
- Fallback logging if Sentry is unavailable

### 5. Application Initialization (`src/main.tsx`)

- Sentry initialization before React app startup
- Early error capture for initialization issues

### 6. Build Configuration (`vite.config.ts`)

- Sentry Vite plugin for source map upload
- Production-only source map generation
- Release tracking with Git integration
- Automatic artifact cleanup

## Environment Configuration

### Required Environment Variables

```bash
# Sentry Runtime Configuration
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=shipping-pwa@1.0.0

# Performance Monitoring
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1           # 10% of transactions
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1   # 10% of sessions
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0  # 100% when errors occur

# Build Configuration (for CI/CD)
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=shipping-pwa
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### Setting Up Sentry Project

1. **Create Sentry Account**: Sign up at [sentry.io](https://sentry.io)

2. **Create Project**:
   - Choose "React" as the platform
   - Note the DSN provided

3. **Configure Release Tracking**:
   - Create an Auth Token in Sentry settings
   - Configure organization and project names

4. **Update Environment Variables**:
   - Copy `.env.example` to `.env`
   - Replace placeholder values with your Sentry configuration

## Error Monitoring Features

### Automatic Error Capture

**Component Errors:**

- React component crashes
- Rendering errors
- Hook failures

**Application Errors:**

- Validation errors
- Network failures
- Storage issues
- Voice recognition errors
- Permission errors

**Performance Issues:**

- Slow transactions
- Large bundle sizes
- Core Web Vitals

### Error Context

**Automatically Captured:**

- User agent and browser information
- Current URL and navigation history
- User settings and preferences
- Component stack traces
- Console logs and breadcrumbs

**Custom Context:**

- Error types and codes
- User actions leading to error
- Application state at error time
- Recovery status and user messaging

### Error Filtering

**Development Mode:**

- Errors are logged to console but not sent to Sentry
- Full debugging information available locally

**Production Mode:**

- Filtered error sending (excludes known non-critical errors)
- ResizeObserver loop errors filtered out
- Network errors filtered for user-caused issues

## Testing the Integration

### Development Testing

Use the test component to verify integration:

```tsx
import { SentryTestComponent } from '@/components/test/SentryTestComponent';

// Add to any page in development
<SentryTestComponent />
```

**Available Tests:**

- Direct error capture
- Message logging
- App error handling
- User context setting
- Breadcrumb logging

### Production Verification

1. **Deploy with Sentry DSN configured**
2. **Trigger test errors**:
   - Use voice commands with denied permissions
   - Enter invalid data in forms
   - Navigate with network issues
3. **Check Sentry dashboard** for captured events
4. **Verify source maps** are uploaded and working

## Sentry Dashboard Features

### Error Tracking

- Real-time error notifications
- Error grouping and deduplication
- Performance impact analysis
- Affected user counts

### Performance Monitoring

- Transaction performance
- Core Web Vitals tracking
- Bundle size analysis
- Route-based performance

### Session Replay

- Video-like replay of user sessions with errors
- Console logs and network requests
- DOM mutations and user interactions

### Release Management

- Error tracking across releases
- Performance regression detection
- Deploy-based error attribution

## Integration Benefits

### For Development

- **Faster Debugging**: Rich error context and session replay
- **Proactive Monitoring**: Catch errors before users report them
- **Performance Insights**: Identify bottlenecks and optimize

### For Production

- **User Experience**: Faster error resolution
- **Reliability Monitoring**: Track application stability
- **Business Intelligence**: Understand user impact of issues

### For Maintenance

- **Error Trends**: Identify recurring issues
- **Performance Baselines**: Track improvements over time
- **Release Quality**: Monitor deploy impact

## Security Considerations

### Data Privacy

- User emails and personal info are not automatically captured
- Only technical debugging information is sent
- Session replay excludes sensitive form inputs

### Access Control

- Sentry project access controlled by organization
- Auth tokens have limited scopes
- Production source maps are privately stored

## Troubleshooting

### Common Issues

**Sentry Not Initializing:**

- Check VITE_SENTRY_DSN is set correctly
- Verify DSN format and project ID
- Check browser console for initialization errors

**Source Maps Not Working:**

- Verify SENTRY_AUTH_TOKEN has upload permissions
- Check build logs for source map upload status
- Ensure release name matches between runtime and build

**Too Many/Few Events:**

- Adjust sample rates in environment variables
- Review error filtering in beforeSend function
- Check quotas in Sentry project settings

### Debug Mode

Enable Sentry debug mode for troubleshooting:

```javascript
Sentry.init({
  // ... other options
  debug: true, // Enable in development only
});
```

## Maintenance

### Regular Tasks

- **Monthly**: Review error trends and fix recurring issues
- **Per Release**: Verify source maps upload correctly
- **Quarterly**: Review and adjust sample rates based on quota usage

### Monitoring

- Set up Sentry alerts for new error types
- Monitor performance regression across releases
- Track error resolution time and user impact

## Cost Optimization

### Efficient Sampling

- Use 10% sampling for performance monitoring
- 100% error capture for critical errors
- Adjust session replay rates based on storage costs

### Quota Management

- Monitor monthly quota usage
- Filter non-actionable errors
- Adjust retention periods for older releases

---

**Note**: Remember to remove the `SentryTestComponent` before production deployment. It's only intended for development testing.
