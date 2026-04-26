/**
 * Outbound webhook dispatcher. Sends signed POST requests to subscriber URLs
 * with at-most-3 retries and exponential backoff. HMAC-SHA256 signature is
 * sent in the X-Webhook-Signature header. Payloads larger than 1 MB are
 * rejected before send.
 */

import { createHmac } from 'node:crypto';

const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_RETRIES = 3;

export interface WebhookSubscription {
  url: string;
  secret: string;
  eventTypes: string[];
}

export class WebhookDispatcher {
  async dispatch(
    subscription: WebhookSubscription,
    eventType: string,
    payload: unknown,
  ): Promise<{ delivered: boolean; attempts: number }> {
    if (!subscription.eventTypes.includes(eventType)) {
      return { delivered: false, attempts: 0 };
    }

    const body = JSON.stringify({ eventType, payload });
    if (Buffer.byteLength(body, 'utf-8') > MAX_PAYLOAD_BYTES) {
      throw new Error('payload too large');
    }
    const signature = createHmac('sha256', subscription.secret).update(body).digest('hex');

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(subscription.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
          body,
        });
        if (res.ok) return { delivered: true, attempts: attempt };
      } catch {
        /* swallow and retry */
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
    return { delivered: false, attempts: MAX_RETRIES };
  }
}
