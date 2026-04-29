import { describe, it, expect } from 'vitest';
import { UserSchema, TradeSchema, BookingSchema } from '../types.js';

const baseUser = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  email: 'user@example.com',
  name: 'Alice',
  role: 'user' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('UserSchema', () => {
  it('parses a valid user', () => {
    expect(() => UserSchema.parse(baseUser)).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => UserSchema.parse({ ...baseUser, email: 'not-an-email' })).toThrow();
  });

  it('rejects invalid role', () => {
    expect(() => UserSchema.parse({ ...baseUser, role: 'superadmin' })).toThrow();
  });

  it('accepts all valid roles', () => {
    for (const role of ['user', 'admin', 'service'] as const) {
      expect(() => UserSchema.parse({ ...baseUser, role })).not.toThrow();
    }
  });

  it('rejects empty name', () => {
    expect(() => UserSchema.parse({ ...baseUser, name: '' })).toThrow();
  });

  it('rejects non-uuid id', () => {
    expect(() => UserSchema.parse({ ...baseUser, id: 'not-a-uuid' })).toThrow();
  });
});

const baseTrade = {
  id: 'trade-1',
  pair: 'XLM/USD',
  side: 'buy' as const,
  price: 0.12,
  volume: 100,
  timestamp: '2024-01-01T00:00:00.000Z',
  status: 'pending' as const,
};

describe('TradeSchema', () => {
  it('parses a valid trade', () => {
    expect(() => TradeSchema.parse(baseTrade)).not.toThrow();
  });

  it('rejects invalid trading pair', () => {
    expect(() => TradeSchema.parse({ ...baseTrade, pair: 'BTC/USD' })).toThrow();
  });

  it('rejects non-positive price', () => {
    expect(() => TradeSchema.parse({ ...baseTrade, price: 0 })).toThrow();
    expect(() => TradeSchema.parse({ ...baseTrade, price: -1 })).toThrow();
  });

  it('rejects non-positive volume', () => {
    expect(() => TradeSchema.parse({ ...baseTrade, volume: 0 })).toThrow();
  });

  it('accepts all valid statuses', () => {
    for (const status of ['pending', 'open', 'filled', 'cancelled', 'failed'] as const) {
      expect(() => TradeSchema.parse({ ...baseTrade, status })).not.toThrow();
    }
  });

  it('allows optional orderId and txid', () => {
    const trade = TradeSchema.parse({ ...baseTrade, orderId: 'ord-1', txid: 'tx-1' });
    expect(trade.orderId).toBe('ord-1');
    expect(trade.txid).toBe('tx-1');
  });
});

const baseBooking = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
  businessId: 'f47ac10b-58cc-4372-a567-0e02b2c3d471',
  serviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d472',
  startTime: '2024-06-01T10:00:00.000Z',
  endTime: '2024-06-01T11:00:00.000Z',
  status: 'pending' as const,
  price: 50,
  paymentStatus: 'pending' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('BookingSchema', () => {
  it('parses a valid booking', () => {
    expect(() => BookingSchema.parse(baseBooking)).not.toThrow();
  });

  it('rejects negative price', () => {
    expect(() => BookingSchema.parse({ ...baseBooking, price: -10 })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => BookingSchema.parse({ ...baseBooking, status: 'expired' })).toThrow();
  });

  it('accepts optional notes', () => {
    const booking = BookingSchema.parse({ ...baseBooking, notes: 'Please arrive early' });
    expect(booking.notes).toBe('Please arrive early');
  });
});
