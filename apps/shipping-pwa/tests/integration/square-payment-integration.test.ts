/**
 * Square Payment Integration Tests
 * Tests payment processing, subscription management, and webhook handling
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { squarePaymentService } from '../../src/services/squarePaymentService';
import type {
  SubscriptionPlan,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  WebhookPayload
} from '../../src/services/squarePaymentService';

// Mock Square SDK
const mockSquareClient = {
  orders: {
    createOrder: vi.fn(),
    getOrder: vi.fn(),
    updateOrder: vi.fn()
  },
  payments: {
    createPayment: vi.fn(),
    getPayment: vi.fn()
  },
  subscriptions: {
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    cancelSubscription: vi.fn()
  }
};

vi.mock('square', () => ({
  SquareClient: vi.fn().mockImplementation(() => mockSquareClient),
  SquareEnvironment: {
    Production: 'production',
    Sandbox: 'sandbox'
  }
}));

// Mock crypto for signature verification
vi.mock('crypto', () => ({
  createHmac: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({
      digest: vi.fn().mockReturnValue('mocked-signature')
    })
  }),
  timingSafeEqual: vi.fn().mockReturnValue(true)
}));

// Mock environment variables
const mockEnvVars = {
  SQUARE_ACCESS_TOKEN: 'sandbox-sq0atb-test-token',
  SQUARE_ENVIRONMENT: 'sandbox',
  SQUARE_LOCATION_ID: 'test-location-123',
  SQUARE_WEBHOOK_SIGNATURE_KEY: 'test-webhook-key'
};

describe('Square Payment Integration Tests', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up environment variables
    process.env = { ...originalEnv, ...mockEnvVars };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with valid configuration', () => {
      expect(squarePaymentService).toBeDefined();
    });

    test('should handle missing access token gracefully', () => {
      const originalToken = process.env.SQUARE_ACCESS_TOKEN;
      delete process.env.SQUARE_ACCESS_TOKEN;

      const mockWarn = vi.spyOn(console, 'warn').mockImplementation();

      // Re-create service to test initialization
      const { SquarePaymentService } = require('../../src/services/squarePaymentService');
      const service = new SquarePaymentService();

      expect(mockWarn).toHaveBeenCalledWith(
        'Square integration disabled: SQUARE_ACCESS_TOKEN not configured'
      );

      // Restore token
      process.env.SQUARE_ACCESS_TOKEN = originalToken;
      mockWarn.mockRestore();
    });

    test('should use production environment when configured', () => {
      const originalEnv = process.env.SQUARE_ENVIRONMENT;
      process.env.SQUARE_ENVIRONMENT = 'production';

      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      // Re-create service to test environment setting
      const { SquarePaymentService } = require('../../src/services/squarePaymentService');
      new SquarePaymentService();

      expect(mockLog).toHaveBeenCalledWith(
        'Square client initialized for production environment'
      );

      process.env.SQUARE_ENVIRONMENT = originalEnv;
      mockLog.mockRestore();
    });
  });

  describe('Subscription Plan Management', () => {
    test('should return all subscription plans', () => {
      const plans = squarePaymentService.getSubscriptionPlans();

      expect(plans).toHaveLength(3);
      expect(plans.map(p => p.id)).toEqual(['starter', 'professional', 'enterprise']);
    });

    test('should return specific subscription plan', () => {
      const starterPlan = squarePaymentService.getSubscriptionPlan('starter');

      expect(starterPlan).toEqual({
        id: 'starter',
        name: 'Starter Plan',
        price: 2900,
        currency: 'USD',
        interval: 'monthly',
        features: {
          maxUsers: 5,
          maxDoors: 20,
          voiceCommands: true,
          palletTracking: true,
          multiShift: false,
          barcodeScanning: false,
          prioritySupport: false
        }
      });
    });

    test('should return null for invalid plan ID', () => {
      const invalidPlan = squarePaymentService.getSubscriptionPlan('invalid-plan');
      expect(invalidPlan).toBeNull();
    });

    test('should validate plan feature restrictions', () => {
      const plans = squarePaymentService.getSubscriptionPlans();

      // Starter plan limitations
      const starter = plans.find(p => p.id === 'starter')!;
      expect(starter.features.maxUsers).toBe(5);
      expect(starter.features.multiShift).toBe(false);
      expect(starter.features.barcodeScanning).toBe(false);

      // Professional plan features
      const professional = plans.find(p => p.id === 'professional')!;
      expect(professional.features.maxUsers).toBe(25);
      expect(professional.features.multiShift).toBe(true);
      expect(professional.features.barcodeScanning).toBe(true);

      // Enterprise unlimited features
      const enterprise = plans.find(p => p.id === 'enterprise')!;
      expect(enterprise.features.maxUsers).toBe(-1); // unlimited
      expect(enterprise.features.maxDoors).toBe(-1); // unlimited
      expect(enterprise.features.prioritySupport).toBe(true);
    });
  });

  describe('Checkout Session Creation', () => {
    const mockCheckoutRequest: CheckoutSessionRequest = {
      planId: 'professional',
      tenantId: 'tenant-123',
      redirectUrl: 'https://app.dc8980.com/payment-success'
    };

    test('should create checkout session successfully', async () => {
      const mockOrderResponse = {
        result: {
          paymentLink: {
            url: 'https://square-checkout-url.com/pay/123'
          }
        }
      };

      mockSquareClient.orders.createOrder.mockResolvedValue(mockOrderResponse);

      const response = await squarePaymentService.createCheckoutSession(mockCheckoutRequest);

      expect(response.success).toBe(true);
      expect(response.checkoutUrl).toBe('https://square-checkout-url.com/pay/123');
      expect(mockSquareClient.orders.createOrder).toHaveBeenCalledWith({
        idempotencyKey: expect.any(String),
        order: {
          locationId: 'test-location-123',
          basePriceMoney: {
            amount: BigInt(7900),
            currency: 'USD'
          },
          lineItems: [{
            name: 'Professional Plan',
            quantity: '1',
            itemType: 'ITEM_SUBSCRIPTION',
            metadata: {
              tenantId: 'tenant-123',
              planId: 'professional'
            }
          }]
        },
        checkoutOptions: {
          redirectUrl: 'https://app.dc8980.com/payment-success',
          askForShippingAddress: false,
          enableCoupon: true,
          enableLoyalty: false
        },
        prePopulatedData: {
          buyerEmail: '',
          buyerPhoneNumber: ''
        }
      });
    });

    test('should handle invalid plan ID', async () => {
      const invalidRequest = {
        ...mockCheckoutRequest,
        planId: 'invalid-plan'
      };

      const response = await squarePaymentService.createCheckoutSession(invalidRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid subscription plan');
      expect(mockSquareClient.orders.createOrder).not.toHaveBeenCalled();
    });

    test('should handle Square API errors', async () => {
      mockSquareClient.orders.createOrder.mockRejectedValue(
        new Error('Square API error: Invalid location')
      );

      const response = await squarePaymentService.createCheckoutSession(mockCheckoutRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Square API error: Invalid location');
    });

    test('should handle missing payment link in response', async () => {
      const mockOrderResponse = {
        result: {
          // Missing paymentLink
        }
      };

      mockSquareClient.orders.createOrder.mockResolvedValue(mockOrderResponse);

      const response = await squarePaymentService.createCheckoutSession(mockCheckoutRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to create checkout session');
    });

    test('should handle unconfigured service', async () => {
      const originalToken = process.env.SQUARE_ACCESS_TOKEN;
      delete process.env.SQUARE_ACCESS_TOKEN;

      // Create unconfigured service
      const { SquarePaymentService } = require('../../src/services/squarePaymentService');
      const unconfiguredService = new SquarePaymentService();

      const response = await unconfiguredService.createCheckoutSession(mockCheckoutRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Square payment integration not configured');

      process.env.SQUARE_ACCESS_TOKEN = originalToken;
    });
  });

  describe('Webhook Processing', () => {
    const mockWebhookPayloads: Record<string, WebhookPayload> = {
      paymentCreated: {
        type: 'payment.created',
        data: {
          object: {
            id: 'payment-123',
            status: 'PENDING',
            metadata: {
              tenantId: 'tenant-123',
              planId: 'professional'
            }
          }
        }
      },
      paymentCompleted: {
        type: 'payment.completed',
        data: {
          object: {
            id: 'payment-123',
            status: 'COMPLETED',
            metadata: {
              tenantId: 'tenant-123',
              planId: 'professional'
            }
          }
        }
      },
      paymentFailed: {
        type: 'payment.failed',
        data: {
          object: {
            id: 'payment-123',
            status: 'FAILED'
          }
        }
      },
      subscriptionStarted: {
        type: 'subscription.started',
        data: {
          object: {
            id: 'subscription-456',
            status: 'ACTIVE',
            metadata: {
              tenantId: 'tenant-123',
              planId: 'professional'
            }
          }
        }
      },
      subscriptionCanceled: {
        type: 'subscription.canceled',
        data: {
          object: {
            id: 'subscription-456',
            status: 'CANCELED'
          }
        }
      }
    };

    test('should handle payment.created webhook', async () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      const result = await squarePaymentService.handleWebhook(
        mockWebhookPayloads.paymentCreated
      );

      expect(result).toBe(true);
      expect(mockLog).toHaveBeenCalledWith('Processing Square webhook:', 'payment.created');
      expect(mockLog).toHaveBeenCalledWith('Payment created:', 'payment-123');

      mockLog.mockRestore();
    });

    test('should handle payment.completed webhook', async () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      const result = await squarePaymentService.handleWebhook(
        mockWebhookPayloads.paymentCompleted
      );

      expect(result).toBe(true);
      expect(mockLog).toHaveBeenCalledWith('Payment completed:', 'payment-123');
      expect(mockLog).toHaveBeenCalledWith(
        'Activating subscription for tenant tenant-123 on plan professional'
      );

      mockLog.mockRestore();
    });

    test('should handle payment.failed webhook', async () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      const result = await squarePaymentService.handleWebhook(
        mockWebhookPayloads.paymentFailed
      );

      expect(result).toBe(true);
      expect(mockLog).toHaveBeenCalledWith('Payment failed:', 'payment-123');

      mockLog.mockRestore();
    });

    test('should handle subscription lifecycle webhooks', async () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      // Test subscription started
      await squarePaymentService.handleWebhook(mockWebhookPayloads.subscriptionStarted);
      expect(mockLog).toHaveBeenCalledWith('Subscription started:', 'subscription-456');

      // Test subscription canceled
      await squarePaymentService.handleWebhook(mockWebhookPayloads.subscriptionCanceled);
      expect(mockLog).toHaveBeenCalledWith('Subscription canceled:', 'subscription-456');

      mockLog.mockRestore();
    });

    test('should handle unknown webhook types', async () => {
      const unknownWebhook = {
        type: 'unknown.event',
        data: {
          object: {
            id: 'unknown-123',
            status: 'UNKNOWN'
          }
        }
      };

      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      const result = await squarePaymentService.handleWebhook(unknownWebhook);

      expect(result).toBe(true);
      expect(mockLog).toHaveBeenCalledWith('Unhandled webhook type:', 'unknown.event');

      mockLog.mockRestore();
    });

    test('should handle webhook processing errors', async () => {
      const mockError = new Error('Webhook processing failed');
      const mockLog = vi.spyOn(console, 'log').mockImplementation();
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation();

      // Mock an error in webhook processing
      vi.spyOn(squarePaymentService, 'handleWebhook' as any).mockImplementation(() => {
        throw mockError;
      });

      const result = await squarePaymentService.handleWebhook(
        mockWebhookPayloads.paymentCreated
      );

      expect(result).toBe(false);

      mockLog.mockRestore();
      mockConsoleError.mockRestore();
    });
  });

  describe('Webhook Signature Verification', () => {
    const testBody = JSON.stringify({ test: 'webhook data' });
    const testSignature = 'sha256=mocked-signature';
    const testKey = 'test-webhook-key';

    test('should verify valid webhook signatures', async () => {
      const isValid = await squarePaymentService.verifyWebhookSignature(
        testBody,
        testSignature,
        testKey
      );

      expect(isValid).toBe(true);
    });

    test('should reject invalid signatures', async () => {
      const crypto = require('crypto');
      crypto.timingSafeEqual.mockReturnValue(false);

      const isValid = await squarePaymentService.verifyWebhookSignature(
        testBody,
        'sha256=invalid-signature',
        testKey
      );

      expect(isValid).toBe(false);
    });

    test('should handle missing signature key', async () => {
      const mockError = vi.spyOn(console, 'error').mockImplementation();

      const isValid = await squarePaymentService.verifyWebhookSignature(
        testBody,
        testSignature
      );

      expect(isValid).toBe(false);
      expect(mockError).toHaveBeenCalledWith('Webhook signature key not provided');

      mockError.mockRestore();
    });

    test('should handle missing signature', async () => {
      const mockError = vi.spyOn(console, 'error').mockImplementation();

      const isValid = await squarePaymentService.verifyWebhookSignature(
        testBody,
        '',
        testKey
      );

      expect(isValid).toBe(false);
      expect(mockError).toHaveBeenCalledWith('No signature provided in webhook');

      mockError.mockRestore();
    });

    test('should handle signature verification errors', async () => {
      const crypto = require('crypto');
      crypto.createHmac.mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const mockError = vi.spyOn(console, 'error').mockImplementation();

      const isValid = await squarePaymentService.verifyWebhookSignature(
        testBody,
        testSignature,
        testKey
      );

      expect(isValid).toBe(false);
      expect(mockError).toHaveBeenCalledWith(
        'Error verifying webhook signature:',
        expect.any(Error)
      );

      mockError.mockRestore();
    });
  });

  describe('Real-world Integration Scenarios', () => {
    test('should handle complete subscription flow', async () => {
      // 1. Create checkout session
      const mockOrderResponse = {
        result: {
          paymentLink: { url: 'https://checkout.square.com/pay/123' }
        }
      };
      mockSquareClient.orders.createOrder.mockResolvedValue(mockOrderResponse);

      const checkoutResponse = await squarePaymentService.createCheckoutSession({
        planId: 'starter',
        tenantId: 'tenant-456',
        redirectUrl: 'https://app.dc8980.com/success'
      });

      expect(checkoutResponse.success).toBe(true);

      // 2. Process payment completion webhook
      const paymentWebhook = {
        type: 'payment.completed',
        data: {
          object: {
            id: 'payment-789',
            status: 'COMPLETED',
            metadata: {
              tenantId: 'tenant-456',
              planId: 'starter'
            }
          }
        }
      };

      const webhookResult = await squarePaymentService.handleWebhook(paymentWebhook);
      expect(webhookResult).toBe(true);
    });

    test('should handle subscription upgrades', async () => {
      // Current professional plan holder upgrading to enterprise
      const upgradeRequest = {
        planId: 'enterprise',
        tenantId: 'tenant-789',
        redirectUrl: 'https://app.dc8980.com/upgrade-success'
      };

      const mockOrderResponse = {
        result: {
          paymentLink: { url: 'https://checkout.square.com/upgrade/456' }
        }
      };
      mockSquareClient.orders.createOrder.mockResolvedValue(mockOrderResponse);

      const response = await squarePaymentService.createCheckoutSession(upgradeRequest);

      expect(response.success).toBe(true);
      expect(response.checkoutUrl).toContain('upgrade');

      // Verify correct pricing for enterprise plan
      expect(mockSquareClient.orders.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            basePriceMoney: {
              amount: BigInt(19900), // Enterprise plan price
              currency: 'USD'
            }
          })
        })
      );
    });

    test('should handle subscription cancellations', async () => {
      const cancellationWebhook = {
        type: 'subscription.canceled',
        data: {
          object: {
            id: 'subscription-999',
            status: 'CANCELED',
            metadata: {
              tenantId: 'tenant-999',
              planId: 'professional'
            }
          }
        }
      };

      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      const result = await squarePaymentService.handleWebhook(cancellationWebhook);

      expect(result).toBe(true);
      expect(mockLog).toHaveBeenCalledWith('Subscription canceled:', 'subscription-999');

      mockLog.mockRestore();
    });

    test('should handle failed payments and retry scenarios', async () => {
      const failedPaymentWebhook = {
        type: 'payment.failed',
        data: {
          object: {
            id: 'payment-failed-123',
            status: 'FAILED',
            metadata: {
              tenantId: 'tenant-retry',
              planId: 'professional',
              retryAttempt: '1'
            }
          }
        }
      };

      const result = await squarePaymentService.handleWebhook(failedPaymentWebhook);
      expect(result).toBe(true);
    });
  });
});