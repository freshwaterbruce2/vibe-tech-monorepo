import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonetizedServiceServer } from './mcpServer.js';
import { PaymentMethods, PaymentsTools } from 'monetizedmcp-sdk';

vi.mock('monetizedmcp-sdk', async (importOriginal) => {
  const original = await importOriginal<typeof import('monetizedmcp-sdk')>();
  return {
    ...original,
    PaymentsTools: class {
      verifyAndSettlePayment = vi.fn().mockResolvedValue({
        success: true,
        message: 'Payment settled successfully',
        responseHeader: 'mocked-response-header',
      });
    },
  };
});

describe('MonetizedServiceServer', () => {
  let server: MonetizedServiceServer;

  beforeEach(() => {
    server = new MonetizedServiceServer();
    vi.clearAllMocks();
  });

  it('should list prices for items', async () => {
    const response = await server.priceListing({});
    expect(response.items).toHaveLength(2);
    expect(response.items[0]).toEqual(
      expect.objectContaining({
        id: 'vibe-summary',
        price: expect.objectContaining({
          amount: 0.0001,
          paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA,
        }),
      })
    );
  });

  it('should list payment methods with seller wallet address', async () => {
    const response = await server.paymentMethods();
    expect(response).toHaveLength(2);
    expect(response[0].walletAddress).toBeDefined();
    expect(response[0].paymentMethod).toBe(PaymentMethods.USDC_BASE_SEPOLIA);
  });

  it('should make purchase successfully when payment is verified', async () => {
    const request = {
      itemId: 'vibe-summary',
      params: { projectPath: 'test-project' },
      signedTransaction: '0xmockedtransaction',
      paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA,
    };

    const response = await server.makePurchase(request);
    expect(response.purchasableItemId).toBe('vibe-summary');
    expect(response.toolResult).toContain('[x402 PAID SERVICE RECEIVED]');
    expect(response.orderId).toBeDefined();
  });

  it('should throw an error when payment verification fails', async () => {
    // Override mock on the server instance directly
    server['paymentTools'].verifyAndSettlePayment = vi.fn().mockResolvedValueOnce({
      success: false,
      message: 'Insufficient funds',
      responseHeader: '',
    });

    const request = {
      itemId: 'vibe-summary',
      params: { projectPath: 'test-project' },
      signedTransaction: '0xfailedtransaction',
      paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA,
    };

    await expect(server.makePurchase(request)).rejects.toThrow(
      'USDC Nanopayment verification failed: Insufficient funds'
    );
  });
});
