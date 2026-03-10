/**
 * Lazy-loaded Square Payment Service
 * This wrapper ensures Square SDK is only loaded when payment features are needed
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
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

class LazySquarePaymentService {
  private serviceInstance: any = null;

  private async getService() {
    if (!this.serviceInstance) {
      const { squarePaymentService } = await import('./squarePaymentService');
      this.serviceInstance = squarePaymentService;
    }
    return this.serviceInstance;
  }

  public async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const service = await this.getService();
    return service.getSubscriptionPlans();
  }

  public async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
    const service = await this.getService();
    return service.getSubscriptionPlan(planId);
  }

  public async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    const service = await this.getService();
    return service.createCheckoutSession(request);
  }

  public async handleWebhook(payload: WebhookPayload): Promise<boolean> {
    const service = await this.getService();
    return service.handleWebhook(payload);
  }

  public async verifyWebhookSignature(
    body: string,
    signature: string,
    webhookSignatureKey?: string
  ): Promise<boolean> {
    const service = await this.getService();
    return service.verifyWebhookSignature(body, signature, webhookSignatureKey);
  }
}

// Export singleton instance
export const squarePaymentService = new LazySquarePaymentService();
export default squarePaymentService;