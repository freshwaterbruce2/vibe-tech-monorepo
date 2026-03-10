# Security Implementation Guide - Hotel Booking Platform

This guide provides detailed instructions for implementing and maintaining the security measures for the hotel booking platform.

## Table of Contents

1. [Quick Start Security Setup](#quick-start-security-setup)
2. [Security Architecture Overview](#security-architecture-overview)
3. [Authentication & Authorization](#authentication--authorization)
4. [Payment Security (PCI-DSS)](#payment-security-pci-dss)
5. [Data Protection (GDPR)](#data-protection-gdpr)
6. [Security Monitoring](#security-monitoring)
7. [Incident Response](#incident-response)
8. [Maintenance & Updates](#maintenance--updates)

## Quick Start Security Setup

### 1. Environment Configuration

**Critical: Replace Default Secrets**

```bash
# Generate secure secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_RESET_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hotelbooking
DB_SSL=true

# JWT Configuration
JWT_SECRET=<generated-64-char-hex-string>
JWT_REFRESH_SECRET=<generated-64-char-hex-string>
JWT_RESET_SECRET=<generated-64-char-hex-string>
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...  # Use sk_test_ for development
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...  # Use pk_test_ for development

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Security Headers
SECURITY_ENABLED=true
RATE_LIMITING_ENABLED=true

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=<optional-sentry-dsn>
```

### 2. Database Setup

Run the security-related migrations:

```bash
# Create audit tables
npm run db:migrate

# Verify tables were created
npx drizzle-kit studio
```

### 3. Security Middleware Integration

In your main server file (`backend/src/server.ts`):

```typescript
import { SecurityConfigValidator } from './middleware/securityValidator';
import { securityMiddleware } from './middleware/security';
import { AuditLogger } from './middleware/auditLogger';
import SecurityMonitoringService from './services/securityMonitoring';

// Validate security configuration on startup
SecurityConfigValidator.validateSecurityConfig();

// Apply security middleware
app.use(securityMiddleware);
app.use(AuditLogger.httpAuditMiddleware());

// Start security monitoring
const securityMonitoring = SecurityMonitoringService.getInstance();
await securityMonitoring.startMonitoring();
```

## Security Architecture Overview

### Defense in Depth Strategy

```
┌─────────────────┐
│   CDN/WAF       │ ← DDoS protection, geographic filtering
├─────────────────┤
│   Load Balancer │ ← SSL termination, health checks
├─────────────────┤
│   API Gateway   │ ← Rate limiting, API key validation
├─────────────────┤
│   Application   │ ← Authentication, authorization, input validation
├─────────────────┤
│   Database      │ ← Encryption at rest, access controls
└─────────────────┘
```

### Security Components

1. **Frontend Security**
   - XSS protection via React's built-in escaping
   - CSP headers to prevent script injection
   - Secure token storage (httpOnly cookies recommended)
   - Input validation and sanitization

2. **API Security**
   - JWT-based authentication with refresh tokens
   - Role-based authorization
   - Rate limiting per endpoint
   - Request validation with Zod schemas
   - SQL injection prevention via Drizzle ORM

3. **Payment Security**
   - Stripe integration (PCI-DSS Level 1 compliant)
   - No card data storage
   - Webhook signature verification
   - Payment intent pattern for secure processing

4. **Data Protection**
   - GDPR compliance utilities
   - Data encryption at rest and in transit
   - Audit logging for all data access
   - User consent management

## Authentication & Authorization

### JWT Token Strategy

**Access Tokens:** Short-lived (1 hour), contain user info and permissions
**Refresh Tokens:** Long-lived (7 days), used to generate new access tokens
**Reset Tokens:** Single-use, 1-hour expiry for password resets

### Implementation Example

```typescript
// Login endpoint with security monitoring
app.post(
  '/api/auth/login',
  [validateRequest(loginSchema), authRateLimit, auditAuthEvent(AuditEventType.USER_LOGIN, 'HIGH')],
  async (req, res) => {
    // Implementation includes:
    // - Password verification with bcrypt
    // - Token generation with secure secrets
    // - Failed attempt tracking
    // - Audit logging
  },
);
```

### Role-Based Access Control

```typescript
// Middleware for role-based authorization
const requireRole = (roles: string[]) => {
  return [
    authenticate,
    (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    },
  ];
};

// Usage
app.get('/api/admin/users', requireRole(['admin', 'super_admin']), handler);
```

## Payment Security (PCI-DSS)

### Stripe Integration Security

1. **Never Store Card Data**

   ```typescript
   // ✅ Correct: Use Stripe's secure tokenization
   const paymentIntent = await stripe.paymentIntents.create({
     amount: amountInCents,
     currency: 'usd',
     payment_method_types: ['card'],
   });

   // ❌ Never do this: Store card data directly
   // const cardData = { number: '4242...', expiry: '12/25' };
   ```

2. **Webhook Security**

   ```typescript
   // Verify webhook signatures
   app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
     const sig = req.headers['stripe-signature'];
     const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
     // Process event...
   });
   ```

3. **Payment Data Handling**

   ```typescript
   // Sanitize payment data before logging
   const sanitizePaymentData = (data: any) => {
     const { cardNumber, cvv, ...safe } = data;
     return safe;
   };
   ```

### PCI-DSS Compliance Checklist

- [ ] No cardholder data stored locally
- [ ] All connections use TLS 1.2+
- [ ] Regular security scans completed
- [ ] Access controls implemented
- [ ] Audit trails maintained
- [ ] Vendor compliance verified (Stripe)

## Data Protection (GDPR)

### Data Subject Rights Implementation

```typescript
import { GDPRCompliance } from '../utils/gdprCompliance';

// Right to Data Portability (Article 20)
app.get('/api/user/export-data', authenticate, async (req, res) => {
  const exportData = await GDPRCompliance.exportUserData(req.user.id);
  res.json(exportData);
});

// Right to Erasure (Article 17)
app.delete('/api/user/delete-account', authenticate, async (req, res) => {
  const result = await GDPRCompliance.deleteUserData(req.user.id, req.body.reason);
  res.json(result);
});

// Right to Rectification (Article 16)
app.put('/api/user/rectify-data', authenticate, async (req, res) => {
  await GDPRCompliance.rectifyUserData(req.user.id, req.body, req.user.id);
  res.json({ success: true });
});
```

### Consent Management

```typescript
// Update user consents
app.post('/api/user/consent', authenticate, async (req, res) => {
  await GDPRCompliance.updateConsent(req.user.id, req.body.consents);
  res.json({ success: true });
});

// Validate processing consent
const hasConsent = await GDPRCompliance.validateConsent(userId, 'marketing');
if (!hasConsent) {
  return res.status(403).json({ error: 'Consent required for this operation' });
}
```

### Data Retention Policies

```typescript
// Implement automated data cleanup
const cleanupExpiredData = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete expired audit logs (retain for compliance period)
  await db
    .delete(auditLog)
    .where(and(lte(auditLog.changedAt, thirtyDaysAgo), eq(auditLog.tableName, 'user_sessions')));
};
```

## Security Monitoring

### Setting Up Monitoring

```typescript
// Initialize security monitoring
const securityMonitoring = SecurityMonitoringService.getInstance();
await securityMonitoring.startMonitoring();

// Configure custom alert thresholds
securityMonitoring.setAlertThresholds({
  failed_login_attempts: 5,
  suspicious_ip_requests: 100,
  payment_failures: 10,
});

// Handle security events
securityMonitoring.on('securityAlert', async (alert) => {
  // Send to external monitoring system
  await sendToSlack(alert);
  await createJiraTicket(alert);
});
```

### Custom Security Rules

```typescript
// Report custom security events
await securityMonitoring.reportSecurityEvent({
  eventType: 'suspicious_user_behavior',
  severity: 'MEDIUM',
  userId: user.id,
  ipAddress: req.ip,
  description: 'User attempting to access multiple admin endpoints',
  details: { attemptedEndpoints: ['/admin/users', '/admin/settings'] },
});
```

### Monitoring Dashboard Integration

```typescript
// Get security metrics for dashboard
app.get('/api/admin/security-metrics', requireRole(['admin']), async (req, res) => {
  const metrics = await securityMonitoring.getSecurityMetrics('day');
  res.json(metrics);
});
```

## Incident Response

### Automated Response Actions

1. **High-Volume Attack Detection**

   ```typescript
   if (event.eventType === 'suspicious_ip_activity' && event.severity === 'CRITICAL') {
     // Implement IP blocking
     await blockIpAddress(event.ipAddress, '1 hour');

     // Alert security team immediately
     await sendCriticalAlert(event);
   }
   ```

2. **Failed Authentication Patterns**

   ```typescript
   if (event.eventType === 'failed_login_pattern') {
     // Implement progressive delays
     await addAuthenticationDelay(event.ipAddress, '15 minutes');

     // Require CAPTCHA for subsequent attempts
     await enableCaptchaForIP(event.ipAddress);
   }
   ```

### Manual Response Procedures

1. **Incident Classification**
   - **P0 (Critical):** Active attack, system compromise, data breach
   - **P1 (High):** Failed security controls, suspicious patterns
   - **P2 (Medium):** Policy violations, configuration issues
   - **P3 (Low):** Informational, routine monitoring alerts

2. **Response Team Contacts**

   ```yaml
   Security Team:
     - Primary: security@company.com
     - Secondary: on-call-engineer@company.com

   External Contacts:
     - Legal: legal@company.com
     - PR: communications@company.com
     - Insurance: cyber-insurance@company.com
   ```

3. **Incident Response Playbook**
   - **Contain:** Isolate affected systems
   - **Assess:** Determine scope and impact
   - **Communicate:** Notify stakeholders
   - **Remediate:** Fix vulnerabilities
   - **Document:** Record lessons learned

## Maintenance & Updates

### Security Update Schedule

- **Daily:** Automated vulnerability scanning
- **Weekly:** Security patch deployment
- **Monthly:** Security configuration review
- **Quarterly:** Penetration testing
- **Annually:** Security architecture review

### Security Checklist for Production Deployment

```bash
#!/bin/bash
# Pre-deployment security checklist

echo "🔒 Running security validation..."

# 1. Validate environment configuration
node -e "require('./backend/src/middleware/securityValidator').SecurityConfigValidator.validateSecurityConfig()"

# 2. Run security tests
npm run test:security

# 3. Check for hardcoded secrets
npm run security:scan-secrets

# 4. Validate SSL configuration
npm run security:ssl-check

# 5. Run dependency vulnerability scan
npm audit --audit-level high

# 6. Verify backup systems
npm run backup:verify

echo "✅ Security validation complete"
```

### Monitoring Production Health

```typescript
// Health check endpoint with security validation
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    security: {
      monitoring: securityMonitoring.isActive(),
      lastScan: await getLastSecurityScan(),
      activeThreatLevel: await getCurrentThreatLevel(),
    },
  };
  res.json(health);
});
```

### Regular Security Tasks

1. **Log Review**

   ```bash
   # Daily security log analysis
   npm run security:analyze-logs -- --date=$(date -d yesterday +%Y-%m-%d)
   ```

2. **Certificate Management**

   ```bash
   # Check SSL certificate expiration
   npm run security:check-certificates
   ```

3. **Backup Verification**

   ```bash
   # Verify encrypted backups
   npm run backup:test-restore
   ```

## Emergency Procedures

### Security Incident Response

1. **Immediate Actions**

   ```bash
   # Emergency system lockdown
   npm run security:lockdown

   # Revoke all active sessions
   npm run auth:revoke-all-sessions

   # Enable maintenance mode
   npm run system:maintenance-mode
   ```

2. **Data Breach Response**
   - Isolate affected systems
   - Preserve forensic evidence
   - Notify data protection authorities (within 72 hours)
   - Prepare user communications
   - Document incident timeline

3. **Recovery Procedures**

   ```bash
   # Restore from clean backup
   npm run restore:from-backup -- --date=<clean-backup-date>

   # Rebuild compromised systems
   npm run security:rebuild-environment

   # Verify system integrity
   npm run security:integrity-check
   ```

## Security Contact Information

- **Security Team:** <security@hotelbooking.com>
- **Emergency Hotline:** +1-XXX-XXX-XXXX
- **Bug Bounty Program:** security.hotelbooking.com/bounty
- **Responsible Disclosure:** <security@hotelbooking.com>

---

_This guide should be reviewed and updated quarterly. Last updated: August 2025_
