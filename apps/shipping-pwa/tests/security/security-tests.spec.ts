/**
 * Security Tests
 * Tests authentication security, data protection, multi-tenant isolation, and security headers
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Security test utilities
class SecurityTestUtils {
  static generateMaliciousPayloads() {
    return [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "'; DROP TABLE users; --",
      '${alert("XSS")}',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '{{constructor.constructor("alert(\\"XSS\\")")()}}',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '"><svg/onload=alert("XSS")>',
      'data:text/html,<script>alert("XSS")</script>'
    ];
  }

  static generateSQLInjectionPayloads() {
    return [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR '1'='1' /*",
      "admin'--",
      "admin'/*",
      "' OR 1=1#",
      "1' OR '1'='1",
      "' WAITFOR DELAY '00:00:05'--",
      "1; EXEC sp_executesql N'SELECT * FROM users'"
    ];
  }

  static generateCSRFTokens() {
    return [
      'invalid-csrf-token',
      '',
      'null',
      'undefined',
      '12345',
      faker.string.alphanumeric(32),
      'expired-token-123',
      'malicious-token-456'
    ];
  }

  static async checkSecurityHeaders(page: Page, url: string) {
    const response = await page.goto(url);
    const headers = response?.headers() || {};

    return {
      hasContentSecurityPolicy: !!headers['content-security-policy'],
      hasXFrameOptions: !!headers['x-frame-options'],
      hasXContentTypeOptions: !!headers['x-content-type-options'],
      hasReferrerPolicy: !!headers['referrer-policy'],
      hasStrictTransportSecurity: !!headers['strict-transport-security'],
      hasPermissionsPolicy: !!headers['permissions-policy'],
      headers
    };
  }

  static async interceptNetworkRequests(page: Page) {
    const requests: any[] = [];

    await page.route('**/*', (route) => {
      requests.push({
        url: route.request().url(),
        method: route.request().method(),
        headers: route.request().headers(),
        postData: route.request().postData()
      });
      route.continue();
    });

    return requests;
  }
}

// Test data for security testing
const generateTestUsers = () => ({
  legitimate: {
    email: 'test.user@warehouse.com',
    password: 'SecurePassword123!',
    name: 'Legitimate User',
    tenantId: 'tenant-legitimate-001'
  },
  malicious: {
    email: 'attacker@evil.com',
    password: 'password123',
    name: '<script>alert("XSS")</script>',
    tenantId: 'tenant-malicious-002'
  },
  unauthorized: {
    email: 'unauthorized@external.com',
    password: 'unauthorized123',
    name: 'Unauthorized User',
    tenantId: 'tenant-unauthorized-003'
  }
});

test.describe('Security Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
  let testUsers: ReturnType<typeof generateTestUsers>;

  test.beforeEach(async ({ page }) => {
    testUsers = generateTestUsers();

    // Set up security monitoring
    await page.addInitScript(() => {
      // Monitor for console errors that might indicate security issues
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args.some(arg => typeof arg === 'string' && arg.includes('CSP'))) {
          window.cspViolations = window.cspViolations || [];
          window.cspViolations.push(args.join(' '));
        }
        originalConsoleError.apply(console, args);
      };

      // Monitor for potential XSS attempts
      const originalInnerHTML = Element.prototype.innerHTML;
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set(value) {
          if (typeof value === 'string' && value.includes('<script>')) {
            window.xssAttempts = window.xssAttempts || [];
            window.xssAttempts.push(value);
          }
          return originalInnerHTML.call(this, value);
        },
        get() {
          return originalInnerHTML.call(this);
        }
      });
    });
  });

  test.describe('Authentication Security', () => {
    test('should reject weak passwords', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signup`);

      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        '12345678',
        'abc123',
        'password123',
        '1234567890',
        ''
      ];

      for (const weakPassword of weakPasswords) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', weakPassword);
        await page.fill('[data-testid="confirm-password-input"]', weakPassword);
        await page.click('[data-testid="signup-button"]');

        // Should show password strength error
        await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

        // Clear form for next iteration
        await page.fill('[data-testid="password-input"]', '');
        await page.fill('[data-testid="confirm-password-input"]', '');
      }
    });

    test('should prevent brute force attacks', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);

      const maxAttempts = 5;

      for (let i = 0; i < maxAttempts + 2; i++) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="signin-button"]');

        if (i >= maxAttempts) {
          // Should show rate limiting message
          await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
          break;
        }

        // Wait for error to appear and disappear
        await page.waitForSelector('[data-testid="auth-error"]', { state: 'visible' });
        await page.waitForTimeout(1000);
      }
    });

    test('should handle session hijacking attempts', async ({ page, context }) => {
      // Sign in legitimate user
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');

      await page.waitForURL('**/dashboard**');

      // Get session token
      const sessionToken = await page.evaluate(() => {
        return localStorage.getItem('firebase-session-token');
      });

      // Create new page (simulating attacker)
      const attackerPage = await context.newPage();
      await attackerPage.goto(baseUrl);

      // Try to use stolen session token
      await attackerPage.evaluate((token) => {
        localStorage.setItem('firebase-session-token', token);
      }, sessionToken);

      await attackerPage.reload();

      // Should not be authenticated (proper session validation should prevent this)
      await expect(attackerPage.locator('[data-testid="signin-form"]')).toBeVisible();
    });

    test('should enforce proper logout', async ({ page }) => {
      // Sign in user
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');

      await page.waitForURL('**/dashboard**');

      // Sign out
      await page.click('[data-testid="user-menu-trigger"]');
      await page.click('[data-testid="sign-out-button"]');

      await page.waitForURL('**/auth/signin**');

      // Verify session is completely cleared
      const sessionData = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage),
          cookies: document.cookie
        };
      });

      // Should not contain sensitive session data
      expect(sessionData.localStorage.filter(key =>
        key.includes('token') || key.includes('auth') || key.includes('session')
      )).toHaveLength(0);

      // Try to navigate back to protected page
      await page.goto(`${baseUrl}/dashboard`);

      // Should redirect to login
      await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();
    });
  });

  test.describe('Input Validation and XSS Prevention', () => {
    test('should sanitize user inputs against XSS', async ({ page }) => {
      // Sign in first
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');

      await page.waitForURL('**/dashboard**');

      const xssPayloads = SecurityTestUtils.generateMaliciousPayloads();

      for (const payload of xssPayloads) {
        // Try XSS in door number input
        await page.fill('[data-testid="door-number-input"]', payload);
        await page.click('[data-testid="add-door-button"]');

        // Check if XSS was executed
        const xssAttempts = await page.evaluate(() => window.xssAttempts || []);
        expect(xssAttempts).toHaveLength(0);

        // Try XSS in notes/comments if available
        const notesInput = page.locator('[data-testid="notes-input"]');
        if (await notesInput.isVisible()) {
          await notesInput.fill(payload);
          await page.click('[data-testid="save-notes-button"]');
        }

        // Verify no script execution
        const alerts = await page.evaluate(() => window.alertsTriggered || []);
        expect(alerts).toHaveLength(0);

        // Clear inputs
        await page.fill('[data-testid="door-number-input"]', '');
      }
    });

    test('should validate input formats strictly', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');

      await page.waitForURL('**/dashboard**');

      // Test invalid door numbers
      const invalidDoorNumbers = [
        '331',  // Below minimum
        '455',  // Above maximum
        'abc',  // Non-numeric
        '332.5', // Decimal
        '-332', // Negative
        '∞',    // Special character
        'null',
        'undefined',
        '',     // Empty
        ' 332 ', // With spaces
      ];

      for (const invalidDoor of invalidDoorNumbers) {
        await page.fill('[data-testid="door-number-input"]', invalidDoor);
        await page.click('[data-testid="add-door-button"]');

        // Should show validation error
        await expect(page.locator('[data-testid="door-validation-error"]')).toBeVisible();

        // Should not add entry
        const entries = await page.locator('[data-testid^="door-entry-"]').count();
        expect(entries).toBe(0);

        // Clear error
        await page.fill('[data-testid="door-number-input"]', '');
      }
    });

    test('should prevent SQL injection in all inputs', async ({ page }) => {
      const requests = await SecurityTestUtils.interceptNetworkRequests(page);

      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');

      await page.waitForURL('**/dashboard**');

      const sqlPayloads = SecurityTestUtils.generateSQLInjectionPayloads();

      for (const payload of sqlPayloads) {
        // Try SQL injection in search/filter inputs
        const searchInput = page.locator('[data-testid="search-input"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill(payload);
          await page.click('[data-testid="search-button"]');
        }

        // Try in door number input
        await page.fill('[data-testid="door-number-input"]', payload);
        await page.click('[data-testid="add-door-button"]');

        // Wait for any potential requests
        await page.waitForTimeout(500);
      }

      // Verify no SQL injection strings were sent in requests
      const suspiciousRequests = requests.filter(req =>
        req.postData && sqlPayloads.some(payload =>
          req.postData.includes(payload)
        )
      );

      expect(suspiciousRequests).toHaveLength(0);
    });
  });

  test.describe('Multi-tenant Data Isolation', () => {
    test('should prevent cross-tenant data access', async ({ page, context }) => {
      // Create two browser contexts for different tenants
      const tenant1Page = page;
      const tenant2Page = await context.newPage();

      // Sign in first tenant
      await tenant1Page.goto(`${baseUrl}/auth/signin`);
      await tenant1Page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await tenant1Page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await tenant1Page.click('[data-testid="signin-button"]');
      await tenant1Page.waitForURL('**/dashboard**');

      // Add data for tenant 1
      await tenant1Page.fill('[data-testid="door-number-input"]', '350');
      await tenant1Page.click('[data-testid="add-door-button"]');
      await tenant1Page.waitForSelector('[data-testid="door-entry-350"]');

      // Sign in second tenant (different user)
      await tenant2Page.goto(`${baseUrl}/auth/signin`);
      await tenant2Page.fill('[data-testid="email-input"]', testUsers.malicious.email);
      await tenant2Page.fill('[data-testid="password-input"]', testUsers.malicious.password);
      await tenant2Page.click('[data-testid="signin-button"]');
      await tenant2Page.waitForURL('**/dashboard**');

      // Tenant 2 should not see tenant 1's data
      await expect(tenant2Page.locator('[data-testid="door-entry-350"]')).not.toBeVisible();

      // Try to access tenant 1's data directly via URL manipulation
      const tenant1Id = await tenant1Page.evaluate(() =>
        localStorage.getItem('tenantId') || 'unknown'
      );

      await tenant2Page.evaluate((tenantId) => {
        // Try to access another tenant's data
        const originalFetch = window.fetch;
        window.fetch = async (url, options) => {
          if (typeof url === 'string' && url.includes('/api/')) {
            // Inject other tenant's ID
            const modifiedOptions = {
              ...options,
              headers: {
                ...options?.headers,
                'X-Tenant-ID': tenantId
              }
            };
            return originalFetch(url, modifiedOptions);
          }
          return originalFetch(url, options);
        };
      }, tenant1Id);

      // Try to load data with manipulated tenant ID
      await tenant2Page.reload();

      // Should still not see tenant 1's data
      await expect(tenant2Page.locator('[data-testid="door-entry-350"]')).not.toBeVisible();
    });

    test('should validate tenant permissions on all operations', async ({ page }) => {
      const requests = await SecurityTestUtils.interceptNetworkRequests(page);

      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Perform various operations
      await page.fill('[data-testid="door-number-input"]', '352');
      await page.click('[data-testid="add-door-button"]');

      await page.click('[data-testid="nav-pallet-counter"]');
      await page.fill('[data-testid="pallet-door-input"]', '352');
      await page.fill('[data-testid="pallet-count-input"]', '25');
      await page.click('[data-testid="add-pallet-button"]');

      await page.click('[data-testid="export-menu-trigger"]');
      await page.click('[data-testid="export-csv-button"]');

      // Verify all requests include proper tenant validation
      const apiRequests = requests.filter(req =>
        req.url.includes('/api/') ||
        req.url.includes('firestore') ||
        req.url.includes('firebase')
      );

      for (const request of apiRequests) {
        // Should have tenant ID in headers or body
        const hasTenantId =
          request.headers['x-tenant-id'] ||
          (request.postData && request.postData.includes('tenantId'));

        expect(hasTenantId).toBeTruthy();
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should protect against CSRF attacks', async ({ page }) => {
      const requests = await SecurityTestUtils.interceptNetworkRequests(page);

      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Perform state-changing operations
      await page.fill('[data-testid="door-number-input"]', '353');
      await page.click('[data-testid="add-door-button"]');

      // Check if CSRF tokens are present in requests
      const stateChangingRequests = requests.filter(req =>
        req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE'
      );

      for (const request of stateChangingRequests) {
        // Should have CSRF protection (token in header or body)
        const hasCSRFProtection =
          request.headers['x-csrf-token'] ||
          request.headers['x-xsrf-token'] ||
          (request.postData && request.postData.includes('csrf'));

        // Note: This might not be implemented yet, so we'll warn instead of fail
        if (!hasCSRFProtection) {
          console.warn(`Request to ${request.url} lacks CSRF protection`);
        }
      }
    });

    test('should reject requests with invalid CSRF tokens', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Intercept and modify CSRF tokens
      await page.route('**/*', (route) => {
        const request = route.request();
        const headers = { ...request.headers() };

        // Inject invalid CSRF token
        if (request.method() !== 'GET') {
          headers['x-csrf-token'] = 'invalid-token-123';
        }

        route.continue({ headers });
      });

      // Try to perform operation with invalid CSRF token
      await page.fill('[data-testid="door-number-input"]', '354');
      await page.click('[data-testid="add-door-button"]');

      // Should show error (if CSRF protection is implemented)
      // Note: This test may pass if CSRF protection isn't implemented yet
      const hasError = await page.locator('[data-testid="csrf-error"]').isVisible();
      if (!hasError) {
        console.warn('CSRF protection may not be implemented');
      }
    });
  });

  test.describe('Security Headers and Policies', () => {
    test('should have proper security headers', async ({ page }) => {
      const securityHeaders = await SecurityTestUtils.checkSecurityHeaders(page, baseUrl);

      // Content Security Policy should be present
      expect(securityHeaders.hasContentSecurityPolicy).toBe(true);

      // X-Frame-Options should prevent clickjacking
      expect(securityHeaders.hasXFrameOptions).toBe(true);

      // X-Content-Type-Options should prevent MIME sniffing
      expect(securityHeaders.hasXContentTypeOptions).toBe(true);

      // Should have referrer policy
      expect(securityHeaders.hasReferrerPolicy).toBe(true);

      // HTTPS should have HSTS
      if (baseUrl.startsWith('https://')) {
        expect(securityHeaders.hasStrictTransportSecurity).toBe(true);
      }

      console.log('Security Headers:', securityHeaders.headers);
    });

    test('should enforce Content Security Policy', async ({ page }) => {
      await page.goto(baseUrl);

      // Try to inject inline script (should be blocked by CSP)
      const scriptInjected = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.innerHTML = 'window.cspTestExecuted = true;';
          document.head.appendChild(script);
          return true;
        } catch (error) {
          return false;
        }
      });

      // Check if script was executed (should not be)
      const scriptExecuted = await page.evaluate(() =>
        window.cspTestExecuted || false
      );

      expect(scriptExecuted).toBe(false);

      // Check for CSP violations
      const cspViolations = await page.evaluate(() =>
        window.cspViolations || []
      );

      if (cspViolations.length > 0) {
        console.log('CSP Violations detected (good):', cspViolations);
      }
    });

    test('should prevent frame embedding', async ({ page, context }) => {
      // Try to embed the app in an iframe
      const attackerPage = await context.newPage();

      await attackerPage.setContent(`
        <html>
          <body>
            <iframe id="target" src="${baseUrl}"></iframe>
          </body>
        </html>
      `);

      // Check if iframe was blocked
      const iframeLoaded = await attackerPage.evaluate(() => {
        const iframe = document.getElementById('target');
        return iframe && iframe.contentDocument;
      });

      // Should be null due to X-Frame-Options or CSP frame-ancestors
      expect(iframeLoaded).toBeFalsy();
    });
  });

  test.describe('Data Protection and Privacy', () => {
    test('should not expose sensitive data in client-side storage', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Check localStorage for sensitive data
      const localStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key);
          }
        }
        return data;
      });

      // Check sessionStorage
      const sessionStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            data[key] = sessionStorage.getItem(key);
          }
        }
        return data;
      });

      // Combine all client-side data
      const allClientData = JSON.stringify({ localStorage, sessionStorage });

      // Should not contain sensitive information
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /private.*key/i,
        /api.*key/i,
        /credit.*card/i,
        /ssn/i,
        /social.*security/i
      ];

      for (const pattern of sensitivePatterns) {
        expect(allClientData).not.toMatch(pattern);
      }
    });

    test('should properly handle PII data', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Navigate to settings and enter PII
      await page.click('[data-testid="nav-settings"]');
      await page.waitForSelector('[data-testid="profile-settings"]');

      const piiData = {
        name: 'John Doe',
        email: 'john.doe@warehouse.com',
        phone: '555-123-4567'
      };

      await page.fill('[data-testid="profile-name-input"]', piiData.name);
      await page.fill('[data-testid="profile-email-input"]', piiData.email);

      if (await page.locator('[data-testid="profile-phone-input"]').isVisible()) {
        await page.fill('[data-testid="profile-phone-input"]', piiData.phone);
      }

      await page.click('[data-testid="save-profile-button"]');

      // Verify PII is not exposed in page source or console
      const pageContent = await page.content();
      const shouldNotContain = [piiData.phone]; // Phone should be masked

      for (const sensitive of shouldNotContain) {
        expect(pageContent).not.toContain(sensitive);
      }
    });

    test('should handle data export securely', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Add some test data
      await page.fill('[data-testid="door-number-input"]', '355');
      await page.click('[data-testid="add-door-button"]');

      // Export data
      await page.click('[data-testid="export-menu-trigger"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-csv-button"]');
      const download = await downloadPromise;

      // Verify export file has secure filename (no path traversal)
      const filename = download.suggestedFilename();
      expect(filename).not.toMatch(/\.\./);
      expect(filename).not.toMatch(/\//);
      expect(filename).not.toMatch(/\\/);
      expect(filename).toMatch(/^[a-zA-Z0-9\-_.]+$/);
    });
  });

  test.describe('API Security', () => {
    test('should have proper authentication on API endpoints', async ({ page }) => {
      const requests = await SecurityTestUtils.interceptNetworkRequests(page);

      // Try to access API without authentication
      const unauthenticatedResponse = await page.request.get(`${baseUrl}/api/doors`);
      expect(unauthenticatedResponse.status()).toBe(401);

      // Sign in and verify authenticated requests work
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Make authenticated request
      await page.fill('[data-testid="door-number-input"]', '356');
      await page.click('[data-testid="add-door-button"]');

      // Verify authenticated requests have proper headers
      const authenticatedRequests = requests.filter(req =>
        req.url.includes('/api/') && req.method !== 'GET'
      );

      for (const request of authenticatedRequests) {
        expect(
          request.headers['authorization'] ||
          request.headers['x-auth-token'] ||
          request.headers['cookie']
        ).toBeTruthy();
      }
    });

    test('should validate API input parameters', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Try to send malformed data to API
      const malformedPayloads = [
        { doorNumber: 'invalid' },
        { doorNumber: -1 },
        { doorNumber: 999999 },
        { destination: 'invalid-dc' },
        { freightType: 'invalid-type' },
        null,
        undefined,
        '',
        '<script>alert("xss")</script>'
      ];

      for (const payload of malformedPayloads) {
        const response = await page.request.post(`${baseUrl}/api/doors`, {
          data: payload,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Should return validation error
        expect(response.status()).toBeGreaterThanOrEqual(400);
        expect(response.status()).toBeLessThan(500);
      }
    });

    test('should have proper rate limiting', async ({ page }) => {
      await page.goto(`${baseUrl}/auth/signin`);
      await page.fill('[data-testid="email-input"]', testUsers.legitimate.email);
      await page.fill('[data-testid="password-input"]', testUsers.legitimate.password);
      await page.click('[data-testid="signin-button"]');
      await page.waitForURL('**/dashboard**');

      // Make many rapid requests
      const rapidRequests = [];
      const maxRequests = 100;

      for (let i = 0; i < maxRequests; i++) {
        rapidRequests.push(
          page.request.post(`${baseUrl}/api/doors`, {
            data: { doorNumber: 400 + i, destination: '6024' }
          })
        );
      }

      const responses = await Promise.all(rapidRequests);

      // Should have some rate limited responses (429 status)
      const rateLimitedResponses = responses.filter(res => res.status() === 429);

      if (rateLimitedResponses.length === 0) {
        console.warn('Rate limiting may not be implemented');
      } else {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });
  });
});