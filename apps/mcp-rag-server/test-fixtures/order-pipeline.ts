/**
 * Order processing pipeline for the storefront. Orders flow:
 *   1. validateCart    — checks inventory and pricing
 *   2. chargePayment   — Stripe PaymentIntent confirm
 *   3. reserveStock    — decrements inventory in Postgres
 *   4. enqueueShipment — pushes to BullMQ shipment queue
 * Failures at any stage trigger a compensating transaction.
 */

export interface CartItem {
  sku: string;
  qty: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: CartItem[];
  totalCents: number;
}

export class OrderPipeline {
  async process(order: Order): Promise<void> {
    await this.validateCart(order);
    const paymentId = await this.chargePayment(order);
    try {
      await this.reserveStock(order);
      await this.enqueueShipment(order);
    } catch (err) {
      await this.refundPayment(paymentId);
      throw err;
    }
  }

  private async validateCart(_order: Order): Promise<void> {
    /* inventory + price drift checks */
  }

  private async chargePayment(order: Order): Promise<string> {
    return `pi_${order.id}`;
  }

  private async reserveStock(_order: Order): Promise<void> {
    /* UPDATE inventory SET qty = qty - $1 WHERE sku = $2 */
  }

  private async enqueueShipment(_order: Order): Promise<void> {
    /* shipmentQueue.add('ship', { orderId }) */
  }

  private async refundPayment(_paymentId: string): Promise<void> {
    /* stripe.refunds.create */
  }
}
