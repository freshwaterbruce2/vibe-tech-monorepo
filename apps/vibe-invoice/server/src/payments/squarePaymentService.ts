import { SquareClient, SquareEnvironment, WebhooksHelper, type Currency } from 'square';
import crypto from 'node:crypto';

export interface InvoiceCheckoutInput {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  token: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export interface SquareWebhookPayload {
  merchant_id?: string;
  type: string;
  event_id?: string;
  created_at?: string;
  data?: {
    type?: string;
    id?: string;
    object?: {
      payment?: {
        id?: string;
        amount_money?: {
          amount?: bigint | number;
          currency?: string;
        };
        status?: string;
        order_id?: string;
        note?: string;
        receipt_url?: string;
        customer_id?: string;
      };
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
      note?: string;
      amount_money?: {
        amount?: bigint | number;
        currency?: string;
      };
    };
  };
}

export class SquarePaymentService {
  private client: SquareClient | null = null;
  public readonly isConfigured: boolean;

  constructor() {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const isProduction = process.env.SQUARE_ENVIRONMENT === 'production';
    const environment = isProduction
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

    this.isConfigured = !!accessToken;

    if (accessToken) {
      try {
        this.client = new SquareClient({
          environment,
          token: accessToken,
        });
      } catch (error) {
        console.warn('Failed to initialize Square client:', error);
        this.client = null;
      }
    }
  }

  public getClient(): SquareClient {
    if (!this.client) {
      const accessToken = process.env.SQUARE_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('SQUARE_ACCESS_TOKEN is not set');
      }
      const environment =
        process.env.SQUARE_ENVIRONMENT === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox;
      this.client = new SquareClient({
        environment,
        token: accessToken,
      });
    }
    return this.client;
  }

  public async createInvoiceCheckoutSession(
    input: InvoiceCheckoutInput,
  ): Promise<CheckoutSessionResult> {
    const client = this.getClient();
    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!locationId) {
      throw new Error('SQUARE_LOCATION_ID is not set');
    }

    const paymentNote = JSON.stringify({
      invoice_id: input.invoiceId,
      public_token: input.token,
      invoice_number: input.invoiceNumber,
    });

    const amountInCents = Math.round(input.amount * 100);

    const createPaymentLinkRequest = {
      idempotencyKey: `inv_${input.invoiceId}_${Date.now()}`,
      description: `Invoice ${input.invoiceNumber}`,
      quickPay: {
        name: `Invoice ${input.invoiceNumber}`,
        locationId,
        priceMoney: {
          amount: BigInt(amountInCents),
          currency: input.currency.toUpperCase() as Currency,
        },
      },
      checkoutOptions: {
        redirectUrl: input.successUrl,
        askForShippingAddress: false,
        acceptedPaymentMethods: {
          applePay: true,
          googlePay: true,
          cashAppPay: true,
          afterpayClearpay: false,
        },
      },
      prePopulatedData: input.customerEmail
        ? { buyerEmail: input.customerEmail }
        : undefined,
      paymentNote,
    };

    const response = await client.checkout.paymentLinks.create(
      createPaymentLinkRequest,
    );

    const paymentLink = response.paymentLink;
    if (!paymentLink?.url) {
      throw new Error('Square Checkout Link returned no URL');
    }

    return {
      id: paymentLink.id ?? `sq_link_${Date.now()}`,
      url: paymentLink.url,
    };
  }

  public async verifyWebhookSignature(
    body: string | Buffer,
    signature: string,
    webhookSignatureKey?: string,
    notificationUrl?: string,
  ): Promise<boolean> {
    const key = webhookSignatureKey ?? process.env.SQUARE_WEBHOOK_SECRET;
    if (!key || !signature) {
      return false;
    }

    const bodyStr = Buffer.isBuffer(body) ? body.toString('utf8') : body;

    // 1. Try official WebhooksHelper if notificationUrl is provided
    if (notificationUrl) {
      try {
        const valid = await WebhooksHelper.verifySignature({
          requestBody: bodyStr,
          signatureHeader: signature,
          signatureKey: key,
          notificationUrl,
        });
        if (valid) return true;
      } catch {
        // Fall back to HMAC checks
      }
    }

    // 2. Direct HMAC-SHA256 signature verification
    try {
      const cleanSig = signature.replace(/^sha256=/, '');
      const hmac1 = crypto.createHmac('sha256', key).update(bodyStr, 'utf8').digest();
      const hmacHex = hmac1.toString('hex');
      const hmacBase64 = hmac1.toString('base64');

      if (
        cleanSig === hmacHex ||
        signature === hmacHex ||
        signature === hmacBase64
      ) {
        return true;
      }

      if (notificationUrl) {
        const hmac2 = crypto
          .createHmac('sha256', key)
          .update(notificationUrl + bodyStr, 'utf8')
          .digest('base64');
        if (signature === hmac2) {
          return true;
        }
      }
    } catch {
      return false;
    }

    return false;
  }
}

export const squarePaymentService = new SquarePaymentService();
export default squarePaymentService;
