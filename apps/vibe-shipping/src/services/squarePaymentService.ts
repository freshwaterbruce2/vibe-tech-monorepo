import { SquareClient, SquareEnvironment } from 'square';
import crypto from 'crypto';

// Define supported currencies
export const SUPPORTED_CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  CAD: 'CAD'
} as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[keyof typeof SUPPORTED_CURRENCIES];

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: SupportedCurrency;
  interval: 'monthly' | 'yearly';
  features: {
    maxUsers: number;
    maxDoors: number;
    voiceCommands: boolean;
    palletTracking: boolean;
    multiShift: boolean;
    barcodeScanning: boolean;
    prioritySupport: boolean;
  };
}

export interface CheckoutSessionRequest {
  planId: string;
  tenantId: string;
  redirectUrl: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

export interface WebhookPayload {
  type: string;
  data: {
    object: {
      id: string;
      status: string;
      metadata?: Record<string, string>;
    };
  };
}

class SquarePaymentService {
  private client: SquareClient | null = null;
  private readonly subscriptionPlans = new Map<string, SubscriptionPlan>();
  private readonly isConfigured: boolean;

  constructor() {
    // Initialize Square client with environment-based config
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const environment = process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

    this.isConfigured = !!accessToken;

    if (accessToken) {
      try {
        this.client = new SquareClient({
          environment,
          token: accessToken
        });
        console.warn(`Square client initialized for ${environment} environment`);
      } catch (error) {
        console.warn('Failed to initialize Square client:', error);
        this.client = null;
      }
    } else {
      console.warn('Square integration disabled: SQUARE_ACCESS_TOKEN not configured');
    }

    this.initializeSubscriptionPlans();
  }

  private initializeSubscriptionPlans(): void {
    const plans: SubscriptionPlan[] = [
      {
        id: 'starter',
        name: 'Starter Plan',
        price: 2900, // $29.00 in cents
        currency: SUPPORTED_CURRENCIES.USD,
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
      },
      {
        id: 'professional',
        name: 'Professional Plan',
        price: 7900, // $79.00 in cents
        currency: SUPPORTED_CURRENCIES.USD,
        interval: 'monthly',
        features: {
          maxUsers: 25,
          maxDoors: 100,
          voiceCommands: true,
          palletTracking: true,
          multiShift: true,
          barcodeScanning: true,
          prioritySupport: false
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        price: 19900, // $199.00 in cents
        currency: SUPPORTED_CURRENCIES.USD,
        interval: 'monthly',
        features: {
          maxUsers: -1, // unlimited
          maxDoors: -1, // unlimited
          voiceCommands: true,
          palletTracking: true,
          multiShift: true,
          barcodeScanning: true,
          prioritySupport: true
        }
      }
    ];

    plans.forEach(plan => {
      this.subscriptionPlans.set(plan.id, plan);
    });
  }

  public getSubscriptionPlans(): SubscriptionPlan[] {
    return Array.from(this.subscriptionPlans.values());
  }

  public getSubscriptionPlan(planId: string): SubscriptionPlan | null {
    return this.subscriptionPlans.get(planId) ?? null;
  }

  public async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    try {
      if (!this.isConfigured || !this.client) {
        return {
          success: false,
          error: 'Square payment integration not configured'
        };
      }

      const plan = this.getSubscriptionPlan(request.planId);
      if (!plan) {
        return {
          success: false,
          error: 'Invalid subscription plan'
        };
      }

      const checkoutApi = this.client.checkout;

      const createPaymentLinkRequest = {
        idempotencyKey: this.generateIdempotencyKey(),
        description: `Subscription: ${plan.name}`,
        quickPay: {
          name: plan.name,
          locationId: process.env.SQUARE_LOCATION_ID!,
          priceMoney: {
            amount: BigInt(plan.price),
            currency: plan.currency
          }
        },
        checkoutOptions: {
          redirectUrl: request.redirectUrl,
          askForShippingAddress: false,
          acceptedPaymentMethods: {
            applePay: true,
            googlePay: true,
            cashAppPay: false,
            afterpayClearpay: false
          }
        },
        paymentNote: `Subscription payment for tenant: ${request.tenantId}`,
        orderOptions: {
          baseLocationId: process.env.SQUARE_LOCATION_ID!
        }
      };

      const response = await checkoutApi.paymentLinks.create(createPaymentLinkRequest);

      if (response?.paymentLink?.url) {
        return {
          success: true,
          checkoutUrl: response.paymentLink.url
        };
      } else {
        return {
          success: false,
          error: 'Failed to create payment link'
        };
      }
    } catch (error) {
      console.error('Square payment link creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  public async handleWebhook(payload: WebhookPayload): Promise<boolean> {
    try {
      console.warn('Processing Square webhook:', payload.type);

      switch (payload.type) {
        case 'payment.created':
          await this.handlePaymentCreated(payload);
          break;
        case 'payment.completed':
          await this.handlePaymentCompleted(payload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;
        case 'subscription.started':
          await this.handleSubscriptionStarted(payload);
          break;
        case 'subscription.canceled':
          await this.handleSubscriptionCanceled(payload);
          break;
        default:
          console.warn('Unhandled webhook type:', payload.type);
      }

      return true;
    } catch (error) {
      console.error('Webhook processing error:', error);
      return false;
    }
  }

  private async handlePaymentCreated(payload: WebhookPayload): Promise<void> {
    console.warn('Payment created:', payload.data.object.id);
    // Update tenant payment status to 'processing'
  }

  private async handlePaymentCompleted(payload: WebhookPayload): Promise<void> {
    console.warn('Payment completed:', payload.data.object.id);

    const metadata = payload.data.object.metadata;
    if (metadata?.tenantId && metadata.planId) {
      // Update tenant subscription status
      // This would integrate with the tenant management system
      console.warn(`Activating subscription for tenant ${metadata.tenantId} on plan ${metadata.planId}`);
    }
  }

  private async handlePaymentFailed(payload: WebhookPayload): Promise<void> {
    console.warn('Payment failed:', payload.data.object.id);
    // Update tenant payment status to 'failed'
    // Send notification to tenant
  }

  private async handleSubscriptionStarted(payload: WebhookPayload): Promise<void> {
    console.warn('Subscription started:', payload.data.object.id);
    // Activate tenant subscription features
  }

  private async handleSubscriptionCanceled(payload: WebhookPayload): Promise<void> {
    console.warn('Subscription canceled:', payload.data.object.id);
    // Deactivate tenant subscription features
    // Optionally downgrade to free tier
  }

  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  public async verifyWebhookSignature(body: string, signature: string, webhookSignatureKey?: string): Promise<boolean> {
    if (!webhookSignatureKey) {
      console.error('Webhook signature key not provided');
      return false;
    }

    if (!signature) {
      console.error('No signature provided in webhook');
      return false;
    }

    try {
      // Square uses HMAC SHA-256 for webhook signature verification
      // The signature header format is: "sha256=<signature>"
      const expectedSignature = signature.replace('sha256=', '');

      // Create HMAC signature using the webhook signature key
      const computedSignature = crypto
        .createHmac('sha256', webhookSignatureKey)
        .update(body, 'utf8')
        .digest('hex');

      // Compare signatures using timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const squarePaymentService = new SquarePaymentService();
export default squarePaymentService;