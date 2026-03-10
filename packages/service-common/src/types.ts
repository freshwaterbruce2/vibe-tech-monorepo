// Shared types for all microservices

import { z } from 'zod';

// ============================================
// Common Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// User & Auth Types
// ============================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['user', 'admin', 'service']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// Trading Types (Critical System)
// ============================================

export const TradingPairSchema = z.enum(['XLM/USD']); // Restricted to allowed pairs

export const TradeSchema = z.object({
  id: z.string(),
  pair: TradingPairSchema,
  side: z.enum(['buy', 'sell']),
  price: z.number().positive(),
  volume: z.number().positive(),
  timestamp: z.string().datetime(),
  status: z.enum(['pending', 'open', 'filled', 'cancelled', 'failed']),
  orderId: z.string().optional(),
  txid: z.string().optional(),
});

export type Trade = z.infer<typeof TradeSchema>;

export interface TradingStatus {
  isRunning: boolean;
  circuitBreakerOpen: boolean;
  lastTrade?: Trade;
  balance: {
    usd: number;
    xlm: number;
  };
  metrics: {
    totalTrades: number;
    winRate: number;
    pnl: number;
  };
}

// ============================================
// Notification Types
// ============================================

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['email', 'push', 'sms', 'in-app']),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// ============================================
// Content Types
// ============================================

export const ContentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['image', 'document', 'video', 'audio']),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export type Content = z.infer<typeof ContentSchema>;

// ============================================
// Booking Types
// ============================================

export const BookingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  price: z.number().positive(),
  paymentStatus: z.enum(['pending', 'paid', 'refunded']),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Booking = z.infer<typeof BookingSchema>;

// ============================================
// Workflow Types
// ============================================

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
    result: z.unknown().optional(),
    error: z.string().optional(),
  })),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// ============================================
// Service Communication Types
// ============================================

export interface ServiceEvent {
  type: string;
  source: string;
  timestamp: string;
  data: unknown;
  correlationId?: string;
}

export interface ServiceRequest {
  service: string;
  method: string;
  params: unknown;
  timeout?: number;
}
